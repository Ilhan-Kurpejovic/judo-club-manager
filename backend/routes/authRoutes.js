const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const jwt = require("jsonwebtoken");

const verifyToken = require("../middleware/authMiddleware");

// GET trenutno prijavljeni korisnik
// GET trenutno prijavljeni korisnik sa dodatnim profilnim podacima
router.get("/me", verifyToken, (req, res) => {
  const userId = req.user.id;
  const roleName = req.user.role_name;

  if (roleName === "clan") {
    const sql = `
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.role_id,
        r.name AS role_name,
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.age_category,
        m.training_group_id,
        tg.name AS training_group_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN training_groups tg ON m.training_group_id = tg.id
      WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Greška pri čitanju podataka člana:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      return res.json({
        user: results[0],
      });
    });
  } else if (roleName === "trener") {
    const sql = `
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.role_id,
        r.name AS role_name,
        c.id AS coach_id,
        c.first_name,
        c.last_name,
        c.specialization
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN coaches c ON c.user_id = u.id
      WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Greška pri čitanju podataka trenera:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      return res.json({
        user: results[0],
      });
    });
  } else {
    const sql = `
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.role_id,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Greška pri čitanju podataka korisnika:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      return res.json({
        user: results[0],
      });
    });
  }
});

// POST registracija korisnika
router.post("/register", async (req, res) => {
  const { name, email, password, role_id } = req.body;

  if (!name || !email || !password || !role_id) {
    return res.status(400).json({
      message: "Ime, email, lozinka i uloga su obavezni.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (name, email, password, role_id)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, hashedPassword, role_id], (err, result) => {
      if (err) {
        console.error("Greška pri registraciji:", err);

        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Korisnik sa ovim emailom već postoji.",
          });
        }

        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Korisnik je uspješno registrovan.",
        userId: result.insertId,
      });
    });
  } catch (error) {
    console.error("Greška pri hashovanju lozinke:", error);
    res.status(500).json({
      message: "Greška na serveru.",
    });
  }
});

// POST login korisnika
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email i lozinka su obavezni.",
    });
  }

  const sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.password,
      u.role_id,
      r.name AS role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.email = ?
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Greška pri loginu:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Pogrešan email ili lozinka.",
      });
    }

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Pogrešan email ili lozinka.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        role_name: user.role_name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      message: "Uspješno ste prijavljeni.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
      },
    });
  });
});

module.exports = router;
