const express = require("express");
const router = express.Router();
const db = require("../db");

// GET svi rezultati sa svih takmicenja
router.get("/", (req, res) => {
  const sql = `
    SELECT
      cr.id,
      cr.member_id,
      cr.competition_id,
      cr.category,
      cr.placement,
      cr.medal,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      c.name AS competition_name,
      c.city,
      c.country,
      c.competition_date
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    LEFT JOIN competitions c ON cr.competition_id = c.id
    ORDER BY c.competition_date DESC, m.last_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju rezultata:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET rezultati jednog clana
router.get("/member/:memberId", (req, res) => {
  const { memberId } = req.params;

  const sql = `
    SELECT
      cr.id,
      cr.member_id,
      cr.competition_id,
      cr.category,
      cr.placement,
      cr.medal,
      c.name AS competition_name,
      c.city,
      c.country,
      c.competition_date
    FROM competition_results cr
    LEFT JOIN competitions c ON cr.competition_id = c.id
    WHERE cr.member_id = ?
    ORDER BY c.competition_date DESC
  `;

  db.query(sql, [memberId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju rezultata člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET svi rezultati jednog takmičenja
router.get("/competition/:competitionId", (req, res) => {
  const { competitionId } = req.params;

  const sql = `
    SELECT
      cr.id,
      cr.member_id,
      cr.competition_id,
      cr.category,
      cr.placement,
      cr.medal,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.belt,
      m.weight_category
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    WHERE cr.competition_id = ?
    ORDER BY cr.medal ASC, m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [competitionId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju rezultata takmičenja:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET jedan rezultat po ID-u
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      cr.id,
      cr.member_id,
      cr.competition_id,
      cr.category,
      cr.placement,
      cr.medal,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      c.name AS competition_name,
      c.city,
      c.country,
      c.competition_date
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    LEFT JOIN competitions c ON cr.competition_id = c.id
    WHERE cr.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju rezultata:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Rezultat nije pronađen.",
      });
    }

    res.json(results[0]);
  });
});

// POST dodavanje rezultata za vise takmicara odjednom!!!
router.post("/bulk", (req, res) => {
  const { competition_id, results } = req.body;

  if (!competition_id || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      message: "Takmičenje i lista rezultata su obavezni.",
    });
  }

  const values = results.map((item) => [
    item.member_id,
    competition_id,
    item.category,
    item.placement,
    item.medal || "bez medalje",
  ]);

  const sql = `
    INSERT INTO competition_results
    (member_id, competition_id, category, placement, medal)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Greška pri dodavanju rezultata:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.status(201).json({
      message: "Rezultati za takmičenje su uspješno sačuvani.",
      insertedRows: result.affectedRows,
    });
  });
});

// POST dodavanje rezultata
router.post("/", (req, res) => {
  const { member_id, competition_id, category, placement, medal } = req.body;

  if (!member_id || !competition_id) {
    return res.status(400).json({
      message: "Član i takmičenje su obavezni.",
    });
  }

  const sql = `
    INSERT INTO competition_results
    (member_id, competition_id, category, placement, medal)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [member_id, competition_id, category, placement, medal || "bez medalje"],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju rezultata:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Rezultat je uspješno dodat.",
        competitionResultId: result.insertId,
      });
    },
  );
});

// PUT izmjena rezultata
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { member_id, competition_id, category, placement, medal } = req.body;

  if (!member_id || !competition_id) {
    return res.status(400).json({
      message: "Član i takmičenje su obavezni.",
    });
  }

  const sql = `
    UPDATE competition_results
    SET
      member_id = ?,
      competition_id = ?,
      category = ?,
      placement = ?,
      medal = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [member_id, competition_id, category, placement, medal, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni rezultata:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Rezultat nije pronađen.",
        });
      }

      res.json({
        message: "Rezultat je uspješno izmijenjen.",
      });
    },
  );
});

// DELETE brisanje rezultata
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM competition_results WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju rezultata:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Rezultat nije pronađen.",
      });
    }

    res.json({
      message: "Rezultat je uspješno obrisan.",
    });
  });
});

module.exports = router;
