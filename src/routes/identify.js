const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phone number is required" });
  }

  try {
    const { rows: existingContacts } = await pool.query(
      "SELECT * FROM contact WHERE email = $1 OR phoneNumber = $2",
      [email, phoneNumber]
    );

    if (existingContacts.length == 0) {
      //no contact is matching
      const insertQuery = `INSERT INTO contact (email, phoneNumber) VALUES ($1,$2) RETURNING *`;
      const { rows } = await pool.query(insertQuery, [email, phoneNumber]);
      primaryContact = rows[0];
    } else {
      //there's a match

      //primary contact is one with low id
      primaryContact = existingContacts.find(
        (c) => c.linkprecedence === "primary"
      );
      if (!primaryContact) {
        primaryContact = existingContacts[0];
      }

      const isNewMail =
        email && !existingContacts.some((c) => c.email === email);
      const isNewPhone =
        phoneNumber &&
        !existingContacts.some((c) => c.phoneNumber === phoneNumber);

      if (isNewMail || isNewPhone) {
        await pool.query(
          `INSERT INTO contacts (email,phoneNumber,linkPrecedence,linkedId) values ($1,$2,'secondary',$3)`,
          [email, phoneNumber, primaryContact.id]
        );
      }
    }

    //gathering all contacts with same linkedid or id is primary
    const { rows: allRelatedContacts } = await pool.query(
      `
        select * from contact where linkedId = $1 or id = $1
      `,
      [primaryContact.id]
    );

    const emails = Array.from(
      new Set(allRelatedContacts.map((c) => c.email).filter(Boolean))
    );
    const phoneNumbers = Array.from(
      new Set(allRelatedContacts.map((c) => c.phoneNumber).filter(Boolean))
    );

    const secondaryContacts = allRelatedContacts
      .filter((c) => c.linkprecedence === "secondary")
      .map((c) => c.id);

    res.json({
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryContacts,
      },
    });
  } catch (error) {
    console.error("Error identifying contacts", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
