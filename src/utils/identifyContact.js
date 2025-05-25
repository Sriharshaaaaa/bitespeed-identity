const { pool } = require("../db");

const getSanitizedInputs = ({ email, phonenumber }) => {
  const sanitizedEmail = email && email.trim() !== "" ? email.trim() : null;
  const sanitizedPhone =
    phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;
  return { sanitizedEmail, sanitizedPhone };
};

const findMatchedContacts = async ({ email, phone }) => {
  const queryParts = [];
  const values = [];

  if (email) {
    queryParts.push(`email = $${values.length + 1}`);
    values.push(email);
  }

  if (phone) {
    queryParts.push(`phonenumber = $${values.length + 1}`);
    values.push(phone);
  }
  if (queryParts.length === 0) return [];

  const query = `SELECT * FROM contact WHERE (${queryParts.join(
    " OR "
  )}) AND "deletedat" IS NULL`;
  const { rows } = await pool.query(query, values);
  return rows;
};

const findRelatedContacts = async (matchedContacts) => {
  const allLinkedIds = [
    ...matchedContacts.map((c) => c.id),
    ...matchedContacts.map((c) => c.linkedid).filter((id) => id !== null),
  ];
  const uniqueIds = [...new Set(allLinkedIds)];
  const query = `SELECT * FROM contact WHERE (id = ANY($1) OR linkedid = ANY($1)) AND "deletedat" IS NULL`;
  const { rows } = await pool.query(query, [uniqueIds]);
  return rows;
};

const insertNewPrimaryContact = async (email, phone) => {
  const insertQuery = `
    INSERT INTO contact (email, phonenumber, linkprecedence)
    VALUES ($1, $2, 'primary') RETURNING *`;
  const { rows } = await pool.query(insertQuery, [email, phone]);
  return rows[0];
};

const updateToSecondary = async (primaryId, contactId) => {
  await pool.query(
    `UPDATE contact SET linkprecedence = 'secondary', linkedid = $1 WHERE id = $2`,
    [primaryId, contactId]
  );
};

const insertAsSecondaryIfNeeded = async (
  email,
  phone,
  existingContacts,
  primaryId
) => {
  const alreadyExists = existingContacts.some(
    (c) => c.email === email && c.phonenumber === phone
  );

  if (!alreadyExists) {
    await pool.query(
      `INSERT INTO contact (email, phonenumber, linkprecedence, linkedid)
       VALUES ($1, $2, 'secondary', $3)`,
      [email, phone, primaryId]
    );
  }
};

const getFinalCluster = async (primaryId) => {
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
  const { rows } = await pool.query(finalQuery, [primaryId]);
  return rows;
};

module.exports = {
  getSanitizedInputs,
  findMatchedContacts,
  findRelatedContacts,
  insertNewPrimaryContact,
  updateToSecondary,
  insertAsSecondaryIfNeeded,
  getFinalCluster,
};
