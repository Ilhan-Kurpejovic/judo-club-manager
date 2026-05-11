const express = require("express");
const router = express.Router();
const db = require("../db");

// sve kategorije
router.get("/", (req, res) => {
  const sql = `
    SELECT
      cac.id,
      cac.competition_id,
      cac.age_category,
      c.name AS competition_name,
      c.competition_date
    FROM competition_allowed_categories cac
    LEFT JOIN competitions c ON cac.competition_id = c.id
    ORDER BY c.competition_date DESC, cac.age_category ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju dozvoljenih kategorija:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET dozvoljene kategorije za jedno takmicenje
router.get("/competition/:competitionId", (req, res) => {
  const { competitionId } = req.params;

  const sql = `
    SELECT
      id,
      competition_id,
      age_category
    FROM competition_allowed_categories
    WHERE competition_id = ?
    ORDER BY age_category ASC
  `;

  db.query(sql, [competitionId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju kategorija za takmičenje:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// POST dodavanje dozvoljene kategorije za takmicenje
router.post("/", (req, res) => {
  const { competition_id, age_category } = req.body;

  if (!competition_id || !age_category) {
    return res.status(400).json({
      message: "Takmičenje i uzrasna kategorija su obavezni.",
    });
  }

  const sql = `
    INSERT INTO competition_allowed_categories
    (competition_id, age_category)
    VALUES (?, ?)
  `;

  db.query(sql, [competition_id, age_category], (err, result) => {
    if (err) {
      console.error("Greška pri dodavanju kategorije:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Ova kategorija je već dodata za izabrano takmičenje.",
        });
      }

      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.status(201).json({
      message: "Dozvoljena kategorija je uspješno dodata.",
      allowedCategoryId: result.insertId,
    });
  });
});

// DELETE brisanje dozvoljene kategorije
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM competition_allowed_categories WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju kategorije:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Dozvoljena kategorija nije pronađena.",
      });
    }

    res.json({
      message: "Dozvoljena kategorija je uspješno obrisana.",
    });
  });
});

module.exports = router;
