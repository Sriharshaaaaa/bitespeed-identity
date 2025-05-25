const express = require("express");
const router = express.Router();
const {
  getSanitizedInputs,
  findMatchedContacts,
  findRelatedContacts,
  insertNewPrimaryContact,
  updateToSecondary,
} = require("../utils/identifyContact");

router.post("/identify", async (req, res) => {
  const email = req.body.email || null;
  const phonenumber = req.body.phonenumber || null;

  const { sanitizedEmail, sanitizedPhone } = getSanitizedInputs(
    email,
    phonenumber
  );

  console.log("Sanitized data:", { sanitizedEmail, sanitizedPhone });

  if (!sanitizedEmail && !sanitizedPhone) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  try {
    // Find all contacts that match either email or phone
    const matchedContacts = await findMatchedContacts(
      sanitizedEmail,
      sanitizedPhone
    );

    // No matches? Insert a new primary contact
    if (matchedContacts.length === 0) {
      const newContact = await insertNewPrimaryContact(
        sanitizedEmail,
        sanitizedPhone
      );
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
    const relatedContacts = await findRelatedContacts(matchedContacts);

    const primaryContact = relatedContacts
      .filter((c) => c.linkprecedence === "primary")
      .sort((a, b) => new Date(a.createdat) - new Date(b.createdat))[0];

    // update other primaries to secondary if needed
    for (const contact of relatedContacts) {
      if (
        contact.linkprecedence === "primary" &&
        contact.id !== primaryContact.id
      ) {
        await updateToSecondary(primaryContact.id, contact.id);
      }
    }

    // Insert the current request as new secondary if it doesn’t exactly match any
    await insertAsSecondaryIfNeeded(
      sanitizedEmail,
      sanitizedPhone,
      matchedContacts,
      primaryContact.id
    );

    //Gather all related contacts again to build the response
    const finalContacts = await getFinalCluster(primaryContact.id);

    const emails = [
      ...new Set(finalContacts.map((c) => c.email).filter(Boolean)),
    ];
    const phoneNumbers = [
      ...new Set(finalContacts.map((c) => c.phonenumber).filter(Boolean)),
    ];
    const secondaryIds = finalContacts
      .filter((c) => c.linkprecedence === "secondary")
      .map((c) => c.id);

    console.log("Final contacts:", finalContacts);

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
