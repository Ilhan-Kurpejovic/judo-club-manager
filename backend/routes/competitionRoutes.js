const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      city,
      country,
      competition_date,
      organizer
    FROM competitions
    ORDER BY competition_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju takmičenja:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET jedno takmicenje po ID-u
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id,
      name,
      city,
      country,
      competition_date,
      organizer
    FROM competitions
    WHERE id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju takmičenja:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Takmičenje nije pronađeno.",
      });
    }

    res.json(results[0]);
  });
});

router.post("/", (req, res) => {
  const { name, city, country, competition_date, organizer } = req.body;

  if (!name || !competition_date) {
    return res.status(400).json({
      message: "Naziv i datum takmičenja su obavezni.",
    });
  }

  const sql = `
    INSERT INTO competitions
    (name, city, country, competition_date, organizer)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, city, country, competition_date, organizer],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju takmičenja:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Takmičenje je uspješno dodato.",
        competitionId: result.insertId,
      });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, city, country, competition_date, organizer } = req.body;

  if (!name || !competition_date) {
    return res.status(400).json({
      message: "Naziv i datum takmičenja su obavezni.",
    });
  }

  const sql = `
    UPDATE competitions
    SET
      name = ?,
      city = ?,
      country = ?,
      competition_date = ?,
      organizer = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, city, country, competition_date, organizer, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni takmičenja:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Takmičenje nije pronađeno.",
        });
      }

      res.json({
        message: "Takmičenje je uspješno izmijenjeno.",
      });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM competitions WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju takmičenja:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Takmičenje nije pronađeno.",
      });
    }

    res.json({
      message: "Takmičenje je uspješno obrisano.",
    });
  });
});

module.exports = router;
