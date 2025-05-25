const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/identify", async (req, res) => {
  // const { email, phonenumber } = req.body;
  const email = req.body.email || null;
  const phonenumber = req.body.phonenumber || null;

  try {
    // console.log("Incoming data:", { email, phonenumber });
  } catch (err) {
    console.error("Logging failed:", err);
  }

  const sanitizedEmail = email && email.trim() !== "" ? email.trim() : null;
  const sanitizedPhone =
    phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;

  // console.log("Sanitized data:", { sanitizedEmail, sanitizedPhone });

  if (!sanitizedEmail && !sanitizedPhone) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  try {
    // Find all contacts that match either email or phone
    const queryParts = [];
    const values = [];

    if (sanitizedEmail) {
      queryParts.push(`email = $${values.length + 1}`);
      values.push(sanitizedEmail);
    }

    if (sanitizedPhone) {
      queryParts.push(`phonenumber = $${values.length + 1}`);
      values.push(sanitizedPhone);
    }

    let matchedContacts = [];
    if (queryParts.length > 0) {
      const query = `SELECT * FROM contact WHERE (${queryParts.join(
        " OR "
      )}) AND "deletedat" IS NULL`;
      const { rows } = await pool.query(query, values);
      matchedContacts = rows;
    }

    // No matches? Insert a new primary contact
    if (matchedContacts.length === 0) {
      const insertQuery = `
        INSERT INTO contact (email, phonenumber, linkprecedence)
        VALUES ($1, $2, 'primary') RETURNING *
      `;
      const { rows } = await pool.query(insertQuery, [
        sanitizedEmail,
        sanitizedPhone,
      ]);
      const newContact = rows[0];
      // console.log("New contact:", newContact);
      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: sanitizedEmail ? [sanitizedEmail] : [],
          phoneNumbers: sanitizedPhone ? [sanitizedPhone] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Get all unique contact ids (primary and secondary)
    const allLinkedIds = [
      ...matchedContacts.map((c) => c.id),
      ...matchedContacts.map((c) => c.linkedid).filter((id) => id !== null),
    ];
    const uniqueLinkedIds = [...new Set(allLinkedIds)];
    const relatedQuery = `SELECT * FROM contact WHERE (id = ANY($1) or linkedid = ANY($1)) AND "deletedat" IS NULL`;
    const relatedResult = await pool.query(relatedQuery, [uniqueLinkedIds]);
    const relatedContacts = relatedResult.rows;

    //determining primary contact
    let primaryContact = relatedContacts
      .filter((c) => c.linkprecedence === "primary")
      .sort((a, b) => new Date(a.createdat) - new Date(b.createdat))[0];

    // update other primaries to secondary if needed
    for (const contact of relatedContacts) {
      if (
        contact.linkprecedence === "primary" &&
        contact.id !== primaryContact.id
      ) {
        await pool.query(
          `UPDATE contact SET linkprecedence = 'secondary', linkedid = $1 WHERE id = $2`,
          [primaryContact.id, contact.id]
        );
      }
    }

    // Insert the current request as new secondary if it doesn’t exactly match any
    const alreadyExists = matchedContacts.some(
      (c) => c.email === sanitizedEmail && c.phonenumber === sanitizedPhone
    );

    if (!alreadyExists) {
      await pool.query(
        `INSERT INTO contact (email, phonenumber, linkprecedence, linkedid)
         VALUES ($1, $2, 'secondary', $3)`,
        [sanitizedEmail, sanitizedPhone, primaryContact.id]
      );
    }

    // Gather all related contacts again to build the response
    const finalQuery = `
      WITH RECURSIVE related_contacts AS (
      SELECT * FROM contact WHERE id = $1 AND "deletedat" IS NULL
      UNION
      SELECT c.* FROM contact c
      INNER JOIN related_contacts rc
      ON c."linkedid" = rc.id OR c.id = rc."linkedid"
      WHERE c."deletedat" IS NULL
      )
      SELECT * FROM related_contacts;`;

    const finalResult = await pool.query(finalQuery, [primaryContact.id]);
    const finalContacts = finalResult.rows;

    const emails = [
      ...new Set(finalContacts.map((c) => c.email).filter(Boolean)),
    ];
    const phoneNumbers = [
      ...new Set(finalContacts.map((c) => c.phonenumber).filter(Boolean)),
    ];
    const secondaryIds = finalContacts
      .filter((c) => c.linkprecedence === "secondary")
      .map((c) => c.id);

    // console.log("Final contacts:", finalContacts);

    return res.status(200).json({
      contact: {
        primaryContactId: primaryContact.id,
        emails: emails,
        phoneNumbers: phoneNumbers,
        secondaryContactIds: secondaryIds,
      },
    });
  } catch (err) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
