const express = require("express");
const router = express.Router();
const db = require("../db");

// GET sve prijave
router.get("/", (req, res) => {
  const sql = `
    SELECT
      ca.id,
      ca.competition_id,
      ca.member_id,
      ca.status,
      ca.note,
      ca.application_date,
      c.name AS competition_name,
      c.city,
      c.country,
      c.competition_date,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.date_of_birth,
      m.belt,
      m.weight_category
    FROM competition_applications ca
    LEFT JOIN competitions c ON ca.competition_id = c.id
    LEFT JOIN members m ON ca.member_id = m.id
    ORDER BY ca.application_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prijava:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET prijave za jedno takmicenje
router.get("/competition/:competitionId", (req, res) => {
  const { competitionId } = req.params;

  const sql = `
    SELECT
      ca.id,
      ca.competition_id,
      ca.member_id,
      ca.status,
      ca.note,
      ca.application_date,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.date_of_birth,
      m.belt,
      m.weight_category
    FROM competition_applications ca
    LEFT JOIN members m ON ca.member_id = m.id
    WHERE ca.competition_id = ?
    ORDER BY ca.status ASC, m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [competitionId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prijava za takmičenje:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET odobreni ucesnici za jedno takmicenje
router.get("/competition/:competitionId/approved", (req, res) => {
  const { competitionId } = req.params;

  const sql = `
    SELECT
      ca.id,
      ca.competition_id,
      ca.member_id,
      ca.status,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.date_of_birth,
      m.belt,
      m.weight_category
    FROM competition_applications ca
    LEFT JOIN members m ON ca.member_id = m.id
    WHERE ca.competition_id = ?
      AND ca.status = 'odobreno'
    ORDER BY m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [competitionId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju odobrenih učesnika:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET prijave jednog clana
router.get("/member/:memberId", (req, res) => {
  const { memberId } = req.params;

  const sql = `
    SELECT
      ca.id,
      ca.competition_id,
      ca.member_id,
      ca.status,
      ca.note,
      ca.application_date,
      c.name AS competition_name,
      c.city,
      c.country,
      c.competition_date
    FROM competition_applications ca
    LEFT JOIN competitions c ON ca.competition_id = c.id
    WHERE ca.member_id = ?
    ORDER BY c.competition_date DESC
  `;

  db.query(sql, [memberId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prijava člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// POST clan se prijavljuje za takmicenje
/*
router.post("/", (req, res) => {
  const { competition_id, member_id, note } = req.body;

  if (!competition_id || !member_id) {
    return res.status(400).json({
      message: "Takmičenje i član su obavezni.",
    });
  }

  const sql = `
    INSERT INTO competition_applications
    (competition_id, member_id, note)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [competition_id, member_id, note], (err, result) => {
    if (err) {
      console.error("Greška pri prijavi za takmičenje:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Član je već prijavljen za ovo takmičenje.",
        });
      }

      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.status(201).json({
      message: "Prijava za takmičenje je uspješno poslata.",
      applicationId: result.insertId,
    });
  });
});*/

//nova verzija za prijavu
router.post("/", (req, res) => {
  const { competition_id, member_id, note } = req.body;

  if (!competition_id || !member_id) {
    return res.status(400).json({
      message: "Takmičenje i član su obavezni.",
    });
  }

  // Prvo provjeravamo kojoj uzrasnoj kategoriji pripada član
  const memberSql = `
    SELECT id, age_category
    FROM members
    WHERE id = ?
  `;

  db.query(memberSql, [member_id], (err, memberResults) => {
    if (err) {
      console.error("Greška pri provjeri člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (memberResults.length === 0) {
      return res.status(404).json({
        message: "Član nije pronađen.",
      });
    }

    const memberAgeCategory = memberResults[0].age_category;

    if (!memberAgeCategory) {
      return res.status(400).json({
        message: "Član nema definisanu uzrasnu kategoriju.",
      });
    }

    // Zatim provjeravamo da li je ta kategorija dozvoljena za takmičenje
    const categorySql = `
      SELECT id
      FROM competition_allowed_categories
      WHERE competition_id = ?
        AND age_category = ?
    `;

    db.query(
      categorySql,
      [competition_id, memberAgeCategory],
      (err, categoryResults) => {
        if (err) {
          console.error("Greška pri provjeri dozvoljene kategorije:", err);
          return res.status(500).json({
            message: "Greška na serveru.",
          });
        }

        if (categoryResults.length === 0) {
          return res.status(400).json({
            message:
              "Član ne pripada uzrasnoj kategoriji koja je dozvoljena za ovo takmičenje.",
          });
        }

        // Ako kategorija odgovara, upisujemo prijavu
        const insertSql = `
          INSERT INTO competition_applications
          (competition_id, member_id, note)
          VALUES (?, ?, ?)
        `;

        db.query(
          insertSql,
          [competition_id, member_id, note],
          (err, result) => {
            if (err) {
              console.error("Greška pri prijavi za takmičenje:", err);

              if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                  message: "Član je već prijavljen za ovo takmičenje.",
                });
              }

              return res.status(500).json({
                message: "Greška na serveru.",
              });
            }

            res.status(201).json({
              message: "Prijava za takmičenje je uspješno poslata.",
              applicationId: result.insertId,
            });
          },
        );
      },
    );
  });
});

// PUT odobravanje ili odbijanje prijave
router.put("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status) {
    return res.status(400).json({
      message: "Status prijave je obavezan.",
    });
  }

  const allowedStatuses = ["na čekanju", "odobreno", "odbijeno"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Status može biti: na čekanju, odobreno ili odbijeno.",
    });
  }

  const sql = `
    UPDATE competition_applications
    SET status = ?, note = ?
    WHERE id = ?
  `;

  db.query(sql, [status, note, id], (err, result) => {
    if (err) {
      console.error("Greška pri izmjeni statusa prijave:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Prijava nije pronađena.",
      });
    }

    res.json({
      message: "Status prijave je uspješno izmijenjen.",
    });
  });
});

// DELETE brisanje prijave
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM competition_applications WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju prijave:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Prijava nije pronađena.",
      });
    }

    res.json({
      message: "Prijava je uspješno obrisana.",
    });
  });
});

module.exports = router;
