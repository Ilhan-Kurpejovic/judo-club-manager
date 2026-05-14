const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const coachRoutes = require("./routes/coachRoutes");
const trainingGroupRoutes = require("./routes/trainingGroupRoutes");
const memberRoutes = require("./routes/memberRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const competitionRoutes = require("./routes/competitionRoutes");
const competitionResultRoutes = require("./routes/competitionResultRoutes");
const competitionAllowedCategoryRoutes = require("./routes/competitionAllowedCategoryRoutes");
const competitionApplicationRoutes = require("./routes/competitionApplicationRoutes");
const membershipRoutes = require("./routes/membershipRoutes");
const fileRoutes = require("./routes/fileRoutes");
const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/searchRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

app.use("/api/coaches", coachRoutes);
app.use("/api/training-groups", trainingGroupRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/competition-results", competitionResultRoutes);
app.use(
  "/api/competition-allowed-categories",
  competitionAllowedCategoryRoutes,
);
app.use("/api/competition-applications", competitionApplicationRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.send("Backend za Judo Club Manager radi.");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});
