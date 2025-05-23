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
    res.json({ message: "Matching contacts found ", existingContacts });
  } catch (error) {
    console.error("Error identifying contacts", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
