const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  res.json({ message: "Identity route working" });
});

module.exports = router;
