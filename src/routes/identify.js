// const { pool } = require("../db");
// const express = require("express");
// const router = express.Router();

// router.post("/identify", async (req, res) => {
//   const { email, phonenumber } = req.body;

//   // Step 1: Sanitize inputs
//   const sanitizedEmail = email && email.trim() !== "" ? email.trim() : null;
//   const sanitizedPhone =
//     phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;

//   // Step 2: If both are null, return 400
//   if (!sanitizedEmail && !sanitizedPhone) {
//     return res
//       .status(400)
//       .json({ error: "Either email or phonenumber must be provided" });
//   }

//   try {
//     // Step 3: Find contacts that match either email or phone
//     const queryParts = [];
//     const queryValues = [];
//     // console.log("Before DB Query 1");

//     if (sanitizedEmail) {
//       queryParts.push(`email = $${queryValues.length + 1}`);
//       queryValues.push(sanitizedEmail);
//     }
//     // console.log("Before DB Query 2");
//     if (sanitizedPhone) {
//       queryParts.push(`phonenumber = $${queryValues.length + 1}`);
//       queryValues.push(sanitizedPhone);
//     }
//     // console.log("Before DB Query 3");
//     let contacts = [];
//     if (queryParts.length > 0) {
//       const query = `SELECT * FROM contact WHERE ${queryParts.join(
//         " OR "
//       )} AND deletedAt IS NULL`;
//       const result = await pool.query(query, queryValues);
//       contacts = result.rows;
//     }
//     // console.log("After DB Query 3");
//     // Step 4: If no match, insert as primary
//     if (contacts.length === 0) {
//       const insertQuery = `
//           INSERT INTO contact (email, phonenumber, linkPrecedence)
//           VALUES ($1, $2, 'primary')
//           RETURNING *
//         `;
//       const insertResult = await pool.query(insertQuery, [
//         sanitizedEmail,
//         sanitizedPhone,
//       ]);
//       const newContact = insertResult.rows[0];
//       // console.log("Before DB Query4");
//       return res.status(200).json({
//         contact: {
//           primaryContactId: newContact.id,
//           emails: sanitizedEmail ? [sanitizedEmail] : [],
//           phoneNumbers: sanitizedPhone ? [sanitizedPhone] : [],
//           secondaryContactIds: [],
//         },
//       });
//     }
//     // console.log("Before DB Query5");
//     return res.status(200).json({
//       message:
//         "Matching contacts found. Deduplication logic not yet implemented.",
//       contacts: contacts,
//     });
//     // Step 5: Else proceed with merge/deduplication logic (already existing)
//     // [... your existing logic ...]
//   } catch (err) {
//     console.error("Error in POST /identify", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  const sanitizedEmail = email?.trim() || null;
  const sanitizedPhone = phoneNumber?.trim() || null;

  if (!sanitizedEmail && !sanitizedPhone) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  try {
    // Step 1: Find all contacts that match either email or phone
    const queryParts = [];
    const values = [];

    if (sanitizedEmail) {
      queryParts.push(`email = $${values.length + 1}`);
      values.push(sanitizedEmail);
    }
    if (sanitizedPhone) {
      queryParts.push(`phoneNumber = $${values.length + 1}`);
      values.push(sanitizedPhone);
    }

    let matchedContacts = [];
    if (queryParts.length) {
      const query = `SELECT * FROM contact WHERE (${queryParts.join(
        " OR "
      )}) AND "deletedat" IS NULL`;
      const { rows } = await pool.query(query, values);
      matchedContacts = rows;
    }

    // Step 2: No matches? Insert a new primary contact
    if (matchedContacts.length === 0) {
      const insertQuery = `
        INSERT INTO contact (email, phoneNumber, linkPrecedence)
        VALUES ($1, $2, 'primary') RETURNING *
      `;
      const { rows } = await pool.query(insertQuery, [
        sanitizedEmail,
        sanitizedPhone,
      ]);
      const newContact = rows[0];

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: sanitizedEmail ? [sanitizedEmail] : [],
          phoneNumbers: sanitizedPhone ? [sanitizedPhone] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Step 3: Deduplication logic
    // Get all unique contact ids (primary and secondary)
    const allLinkedIds = new Set();

    matchedContacts.forEach((contact) => {
      if (contact.linkprecedence === "primary") {
        allLinkedIds.add(contact.id);
      } else if (contact.linkedid) {
        allLinkedIds.add(contact.linkedid);
      }
    });

    // Get the earliest (smallest) primary id to treat as actual primary
    const allIds = matchedContacts.map((c) =>
      c.linkprecedence === "primary" ? c.id : c.linkedid
    );
    const actualPrimaryId = Math.min(...allIds);

    // Step 4: Mark any primary (other than actualPrimaryId) as secondary
    for (const contact of matchedContacts) {
      if (
        contact.linkprecedence === "primary" &&
        contact.id !== actualPrimaryId
      ) {
        await pool.query(
          `UPDATE contact SET linkPrecedence = 'secondary', linkedId = $1 WHERE id = $2`,
          [actualPrimaryId, contact.id]
        );
      }
    }

    // Step 5: Insert the current request as new secondary if it doesn’t exactly match any
    const alreadyExists = matchedContacts.some(
      (c) => c.email === sanitizedEmail && c.phonenumber === sanitizedPhone
    );

    if (!alreadyExists) {
      await pool.query(
        `INSERT INTO contact (email, phoneNumber, linkPrecedence, linkedId)
         VALUES ($1, $2, 'secondary', $3)`,
        [sanitizedEmail, sanitizedPhone, actualPrimaryId]
      );
    }

    // Step 6: Gather all related contacts again to build the response
    const result = await pool.query(
      `SELECT * FROM contact WHERE id = $1 OR linkedId = $1`,
      [actualPrimaryId]
    );
    const relatedContacts = result.rows;

    const emails = new Set();
    const phoneNumbers = new Set();
    const secondaryIds = [];

    for (const contact of relatedContacts) {
      if (contact.email) emails.add(contact.email);
      if (contact.phonenumber) phoneNumbers.add(contact.phonenumber);
      if (contact.linkprecedence === "secondary") {
        secondaryIds.push(contact.id);
      }
    }

    return res.status(200).json({
      contact: {
        primaryContactId: actualPrimaryId,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaryIds,
      },
    });
  } catch (err) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
