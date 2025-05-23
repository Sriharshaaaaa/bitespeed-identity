const express = require("express");
const app = express();
const identityRoutes = require('./routes/identity');

app.use(express.json());
app.use('/identity', identityRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
