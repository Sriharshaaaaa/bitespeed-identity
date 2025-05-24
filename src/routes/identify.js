const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    // Step 1: Get all related contacts from DB
    const result = await pool.query(
      `SELECT * FROM contact
       WHERE email = $1 OR phoneNumber = $2
       OR id IN (
         SELECT linkedId FROM contact WHERE email = $1 OR phoneNumber = $2
       )
       OR linkedId IN (
         SELECT id FROM contact WHERE email = $1 OR phoneNumber = $2
       )`,
      [email, phoneNumber]
    );

    const contacts = result.rows;

    // Step 2: Find the primary contact (safely)
    const primaryContacts = contacts.filter(
      (c) => c.linkprecedence === "primary"
    );

    let primaryContact = null;

    if (primaryContacts.length > 0) {
      primaryContact = primaryContacts.reduce((a, b) =>
        new Date(a.createdat) < new Date(b.createdat) ? a : b
      );
    } else if (contacts.length > 0) {
      primaryContact = contacts.reduce((a, b) =>
        new Date(a.createdat) < new Date(b.createdat) ? a : b
      );
    }

    // Step 3: If current contact does not exist, insert as secondary
    const existingContact = contacts.find(
      (c) =>
        (email && c.email === email) ||
        (phoneNumber && c.phonenumber === phoneNumber)
    );

    if (!existingContact) {
      await pool.query(
        `INSERT INTO contact (email, phoneNumber, linkedId, linkPrecedence)
         VALUES ($1, $2, $3, 'secondary')`,
        [email, phoneNumber, primaryContact.id]
      );
    }

    // Step 4: Collect final deduplicated result
    const finalResult = await pool.query(
      `SELECT * FROM contact
       WHERE id = $1 OR linkedId = $1`,
      [primaryContact.id]
    );

    const allContacts = finalResult.rows;

    const emails = [
      ...new Set(allContacts.map((c) => c.email).filter(Boolean)),
    ];

    const phoneNumbers = [
      ...new Set(allContacts.map((c) => c.phonenumber).filter(Boolean)),
    ];

    const secondaryContactIds = allContacts
      .filter((c) => c.id !== primaryContact.id)
      .map((c) => c.id);

    // Step 5: Build response payload
    const response = {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("Error in POST /identify", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
