const express = require("express");
const router = express.Router();
const db = require("../db");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const allowedMedals = new Set(["zlato", "srebro", "bronza", "bez medalje"]);

function isValidMedal(medal) {
  return allowedMedals.has(medal || "bez medalje");
}

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
      DATE_FORMAT(c.competition_date, '%Y-%m-%d') AS competition_date
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    LEFT JOIN competitions c ON cr.competition_id = c.id
    ORDER BY c.competition_date DESC, m.last_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greska pri citanju rezultata:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
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
      DATE_FORMAT(c.competition_date, '%Y-%m-%d') AS competition_date
    FROM competition_results cr
    LEFT JOIN competitions c ON cr.competition_id = c.id
    WHERE cr.member_id = ?
    ORDER BY c.competition_date DESC
  `;

  db.query(sql, [memberId], (err, results) => {
    if (err) {
      console.error("Greska pri citanju rezultata clana:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    res.json(results);
  });
});

// GET svi rezultati jednog takmicenja
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
      m.weight_category,
      m.age_category
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    WHERE cr.competition_id = ?
    ORDER BY m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [competitionId], (err, results) => {
    if (err) {
      console.error("Greska pri citanju rezultata takmicenja:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
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
      DATE_FORMAT(c.competition_date, '%Y-%m-%d') AS competition_date
    FROM competition_results cr
    LEFT JOIN members m ON cr.member_id = m.id
    LEFT JOIN competitions c ON cr.competition_id = c.id
    WHERE cr.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greska pri citanju rezultata:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Rezultat nije pronadjen.",
      });
    }

    res.json(results[0]);
  });
});

// POST cuvanje rezultata za vise takmicara odjednom.
// Prvo brise stare rezultate za takmicenje, pa upisuje novo stanje.
router.post("/bulk", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { competition_id, results } = req.body;

  if (!competition_id || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      message: "Takmicenje i lista rezultata su obavezni.",
    });
  }

  const hasInvalidMedal = results.some((item) => !isValidMedal(item.medal));

  if (hasInvalidMedal) {
    return res.status(400).json({
      message: "Medalja moze biti: zlato, srebro, bronza ili bez medalje.",
    });
  }

  const values = results.map((item) => [
    item.member_id,
    competition_id,
    item.category || null,
    item.placement || null,
    item.medal || "bez medalje",
  ]);

  db.beginTransaction((err) => {
    if (err) {
      console.error("Greska pri pokretanju transakcije za rezultate:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    db.query(
      "DELETE FROM competition_results WHERE competition_id = ?",
      [competition_id],
      (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("Greska pri brisanju starih rezultata:", err);
            return res.status(500).json({
              message: "Greska na serveru.",
            });
          });
        }

        const sql = `
          INSERT INTO competition_results
          (member_id, competition_id, category, placement, medal)
          VALUES ?
        `;

        db.query(sql, [values], (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greska pri dodavanju rezultata:", err);
              return res.status(500).json({
                message: "Greska na serveru.",
              });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Greska pri cuvanju rezultata:", err);
                return res.status(500).json({
                  message: "Greska na serveru.",
                });
              });
            }

            return res.status(201).json({
              message: "Rezultati za takmicenje su uspjesno sacuvani.",
              insertedRows: result.affectedRows,
            });
          });
        });
      },
    );
  });
});

// DELETE svi rezultati jednog takmicenja
router.delete(
  "/competition/:competitionId",
  verifyToken,
  checkRole("admin", "trener"),
  (req, res) => {
    const { competitionId } = req.params;

    const sql = "DELETE FROM competition_results WHERE competition_id = ?";

    db.query(sql, [competitionId], (err, result) => {
      if (err) {
        console.error("Greska pri brisanju rezultata takmicenja:", err);
        return res.status(500).json({
          message: "Greska na serveru.",
        });
      }

      res.json({
        message: "Rezultati takmicenja su uspjesno obrisani.",
        deletedRows: result.affectedRows,
      });
    });
  },
);

// POST dodavanje jednog rezultata
router.post("/", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { member_id, competition_id, category, placement, medal } = req.body;

  if (!member_id || !competition_id) {
    return res.status(400).json({
      message: "Clan i takmicenje su obavezni.",
    });
  }

  if (!isValidMedal(medal)) {
    return res.status(400).json({
      message: "Medalja moze biti: zlato, srebro, bronza ili bez medalje.",
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
        console.error("Greska pri dodavanju rezultata:", err);
        return res.status(500).json({
          message: "Greska na serveru.",
        });
      }

      res.status(201).json({
        message: "Rezultat je uspjesno dodat.",
        competitionResultId: result.insertId,
      });
    },
  );
});

// PUT izmjena jednog rezultata
router.put("/:id", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { id } = req.params;
  const { member_id, competition_id, category, placement, medal } = req.body;

  if (!member_id || !competition_id) {
    return res.status(400).json({
      message: "Clan i takmicenje su obavezni.",
    });
  }

  if (!isValidMedal(medal)) {
    return res.status(400).json({
      message: "Medalja moze biti: zlato, srebro, bronza ili bez medalje.",
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
    [member_id, competition_id, category, placement, medal || "bez medalje", id],
    (err, result) => {
      if (err) {
        console.error("Greska pri izmjeni rezultata:", err);
        return res.status(500).json({
          message: "Greska na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Rezultat nije pronadjen.",
        });
      }

      res.json({
        message: "Rezultat je uspjesno izmijenjen.",
      });
    },
  );
});

// DELETE brisanje jednog rezultata
router.delete("/:id", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM competition_results WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greska pri brisanju rezultata:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Rezultat nije pronadjen.",
      });
    }

    res.json({
      message: "Rezultat je uspjesno obrisan.",
    });
  });
});

module.exports = router;
