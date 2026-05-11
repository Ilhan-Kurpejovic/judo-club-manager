const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const coachRoutes = require("./routes/coachRoutes");
const trainingGroupRoutes = require("./routes/trainingGroupRoutes");
const memberRoutes = require("./routes/memberRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/coaches", coachRoutes);
app.use("/api/training-groups", trainingGroupRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.send("Backend za Judo Club Manager radi.");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});
