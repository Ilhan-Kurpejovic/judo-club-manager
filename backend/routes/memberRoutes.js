const express = require("express");
const router = express.Router();
const db = require("../db");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

router.get("/", (req, res) => {
  const sql = `SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
      FROM members m
      LEFT JOIN training_groups tg ON m.training_group_id = tg.id`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greska pri citanju clanova kluba!", err);
      return res.status(500).json({ message: "Greška na serveru." });
    }

    res.json(results);
  });
});

// GET svi clanovi jedne trening grupe
router.get("/group/:trainingGroupId", (req, res) => {
  const { trainingGroupId } = req.params;

  const sql = `
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
    FROM members m
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE m.training_group_id = ?
    ORDER BY m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [trainingGroupId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju članova grupe:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
    FROM members m
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE m.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Član nije pronađen.",
      });
    }

    res.json(results[0]);
  });
});

router.post("/", verifyToken, checkRole("admin"), (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    belt,
    weight_category,
    phone,
    parent_phone,
    email,
    address,
    photo,
    training_group_id,
    user_id,
    status,
    age_category,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime člana su obavezni.",
    });
  }

  const sql = `
    INSERT INTO members
    (
      first_name,
      last_name,
      date_of_birth,
      gender,
      belt,
      weight_category,
      phone,
      parent_phone,
      email,
      address,
      photo,
      training_group_id,
      user_id,
      status,
      age_category
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      first_name,
      last_name,
      date_of_birth,
      gender,
      belt,
      weight_category,
      phone,
      parent_phone,
      email,
      address,
      photo,
      training_group_id,
      user_id,
      status || "aktivan",
      age_category,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju člana:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Član je uspješno dodat.",
        memberId: result.insertId,
      });
    },
  );
});

router.put("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    belt,
    weight_category,
    phone,
    parent_phone,
    email,
    address,
    photo,
    training_group_id,
    user_id,
    status,
    age_category,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime člana su obavezni.",
    });
  }

  const sql = `
    UPDATE members
    SET 
      first_name = ?,
      last_name = ?,
      date_of_birth = ?,
      gender = ?,
      belt = ?,
      weight_category = ?,
      phone = ?,
      parent_phone = ?,
      email = ?,
      address = ?,
      photo = ?,
      training_group_id = ?,
      user_id = ?,
      status = ?,
      age_category = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      first_name,
      last_name,
      date_of_birth,
      gender,
      belt,
      weight_category,
      phone,
      parent_phone,
      email,
      address,
      photo,
      training_group_id,
      user_id,
      status,
      age_category,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni člana:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Član nije pronađen.",
        });
      }

      res.json({
        message: "Podaci o članu su uspješno izmijenjeni.",
      });
    },
  );
});

router.delete("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM members WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Član nije pronađen.",
      });
    }

    res.json({
      message: "Član je uspješno obrisan.",
    });
  });
});

module.exports = router;
