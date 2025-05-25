const express = require("express");
const app = express();
const db = require("./db");

require("dotenv").config();

app.use(express.json());

const identifyRoutes = require("./routes/identify");
app.use("/", identifyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
