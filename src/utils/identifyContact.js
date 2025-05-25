// const { pool } = require("../db");

// const getSanitizedInputs = ({ email, phonenumber }) => {
//   const sanitizedEmail = email && email.trim() !== "" ? email.trim() : null;
//   const sanitizedPhone =
//     phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;
//   return { sanitizedEmail, sanitizedPhone };
// };

// const findMatchedContacts = async ({ email, phone }) => {
//   const queryParts = [];
//   const values = [];

//   if (email) {
//     queryParts.push(`email = $${values.length + 1}`);
//     values.push(email);
//   }

//   if (phone) {
//     queryParts.push(`phonenumber = $${values.length + 1}`);
//     values.push(phone);
//   }
//   if (queryParts.length === 0) return [];

//   const query = `SELECT * FROM contact WHERE (${queryParts.join(
//     " OR "
//   )}) AND "deletedat" IS NULL`;
//   const { rows } = await pool.query(query, values);
//   return rows;
// };

// const findRelatedContacts = async (matchedContacts) => {
//   const allLinkedIds = [
//     ...matchedContacts.map((c) => c.id),
//     ...matchedContacts.map((c) => c.linkedid).filter((id) => id !== null),
//   ];
//   const uniqueIds = [...new Set(allLinkedIds)];
//   const query = `SELECT * FROM contact WHERE (id = ANY($1) OR linkedid = ANY($1)) AND "deletedat" IS NULL`;
//   const { rows } = await pool.query(query, [uniqueIds]);
//   return rows;
// };

// const insertNewPrimaryContact = async (email, phone) => {
//   const insertQuery = `
//     INSERT INTO contact (email, phonenumber, linkprecedence)
//     VALUES ($1, $2, 'primary') RETURNING *`;
//   const { rows } = await pool.query(insertQuery, [email, phone]);
//   return rows[0];
// };

// const updateToSecondary = async (primaryId, contactId) => {
//   await pool.query(
//     `UPDATE contact SET linkprecedence = 'secondary', linkedid = $1 WHERE id = $2`,
//     [primaryId, contactId]
//   );
// };

// const insertAsSecondaryIfNeeded = async (
//   email,
//   phone,
//   existingContacts,
//   primaryId
// ) => {
//   console.log("insertAsSecondaryIfNeeded() called with:", {
//     email,
//     phone,
//     primaryId,
//   });

//   const exactMatchExists = existingContacts.some(
//     (c) =>
//       (email ? c.email === email : true) &&
//       (phone ? c.phonenumber === phone : true)
//   );

//   console.log("Checking if exact match exists:", exactMatchExists);

//   const partialMatchExists =
//     (email && existingContacts.some((c) => c.email === email)) ||
//     (phone && existingContacts.some((c) => c.phonenumber === phone));

//   console.log("Partial match exists:", partialMatchExists);

//   if (!exactMatchExists && partialMatchExists) {
//     console.log("Inserting new secondary with:", { email, phone });
//     await pool.query(
//       `INSERT INTO contact (email, phonenumber, linkprecedence, linkedid)
//        VALUES ($1, $2, 'secondary', $3)`,
//       [email, phone, primaryId]
//     );
//     console.log("New secondary inserted");
//   }
// };

// module.exports = {
//   getSanitizedInputs,
//   findMatchedContacts,
//   findRelatedContacts,
//   insertNewPrimaryContact,
//   updateToSecondary,
//   insertAsSecondaryIfNeeded,
// };
