const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phone number is required" });
  }
  res.json({ message: "Input received", email, phoneNumber });
});

module.exports = router;
