const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT 
      tg.id,
      tg.name,
      tg.age_category,
      tg.coach_id,
      tg.description,
      c.first_name AS coach_first_name,
      c.last_name AS coach_last_name
    FROM training_groups tg
    LEFT JOIN coaches c ON tg.coach_id = c.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju trening grupa:", err);
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
      tg.id,
      tg.name,
      tg.age_category,
      tg.coach_id,
      tg.description,
      c.first_name AS coach_first_name,
      c.last_name AS coach_last_name
    FROM training_groups tg
    LEFT JOIN coaches c ON tg.coach_id = c.id
    WHERE tg.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju trening grupe:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Trening grupa nije pronađena.",
      });
    }

    res.json(results[0]);
  });
});

router.post("/", (req, res) => {
  const { name, age_category, coach_id, description } = req.body;

  if (!name) {
    return res.status(400).json({
      message: "Naziv trening grupe je obavezan.",
    });
  }

  const sql = `
    INSERT INTO training_groups
    (name, age_category, coach_id, description)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, age_category, coach_id, description], (err, result) => {
    if (err) {
      console.error("Greška pri dodavanju trening grupe:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.status(201).json({
      message: "Trening grupa je uspješno dodata.",
      trainingGroupId: result.insertId,
    });
  });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, age_category, coach_id, description } = req.body;

  if (!name) {
    return res.status(400).json({
      message: "Naziv trening grupe je obavezan.",
    });
  }

  const sql = `
    UPDATE training_groups
    SET name = ?, age_category = ?, coach_id = ?, description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, age_category, coach_id, description, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni trening grupe:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Trening grupa nije pronađena.",
        });
      }

      res.json({
        message: "Trening grupa je uspješno izmijenjena.",
      });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM training_groups WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju trening grupe:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Trening grupa nije pronađena.",
      });
    }

    res.json({
      message: "Trening grupa je uspješno obrisana.",
    });
  });
});

module.exports = router;
