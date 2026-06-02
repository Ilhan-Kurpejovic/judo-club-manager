const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

router.get("/", (req, res) => {
  const sql = "SELECT * FROM coaches";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greska pri citanju trenera!", err);
      return res.status(500).json({ message: "Greška na serveru." });
    }
    res.json(results);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT * from coaches
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri pretrazi trenera:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(result);
  });
});

// POST dodavanje novog trenera i automatsko kreiranje korisničkog naloga
router.post("/", verifyToken, checkRole("admin"), async (req, res) => {
  const {
    first_name,
    last_name,
    phone,
    email,
    specialization,
    login_email,
    initial_password,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime trenera su obavezni.",
    });
  }

  if (!login_email || !initial_password) {
    return res.status(400).json({
      message: "Email za login i početna lozinka su obavezni.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(initial_password, 10);
    const userName = `${first_name} ${last_name}`;

    db.beginTransaction((err) => {
      if (err) {
        console.error("Greška pri pokretanju transakcije:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      const createUserSql = `
        INSERT INTO users
        (name, email, password, role_id)
        VALUES (?, ?, ?, ?)
      `;

      // role_id = 2 je uloga 'trener'
      db.query(
        createUserSql,
        [userName, login_email, hashedPassword, 2],
        (err, userResult) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greška pri kreiranju korisničkog naloga:", err);

              if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                  message: "Korisnik sa ovim login emailom već postoji.",
                });
              }

              return res.status(500).json({
                message: "Greška na serveru.",
              });
            });
          }

          const userId = userResult.insertId;

          const createCoachSql = `
            INSERT INTO coaches
            (
              first_name,
              last_name,
              phone,
              email,
              specialization,
              user_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `;

          db.query(
            createCoachSql,
            [first_name, last_name, phone, email, specialization, userId],
            (err, coachResult) => {
              if (err) {
                return db.rollback(() => {
                  console.error("Greška pri dodavanju trenera:", err);

                  return res.status(500).json({
                    message:
                      "Greška pri dodavanju trenera. Korisnički nalog nije sačuvan.",
                  });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Greška pri potvrđivanju transakcije:", err);

                    return res.status(500).json({
                      message: "Greška na serveru.",
                    });
                  });
                }

                res.status(201).json({
                  message: "Trener i korisnički nalog su uspješno kreirani.",
                  coachId: coachResult.insertId,
                  userId: userId,
                  login_email: login_email,
                });
              });
            },
          );
        },
      );
    });
  } catch (error) {
    console.error("Greška pri hashovanju lozinke:", error);

    res.status(500).json({
      message: "Greška na serveru.",
    });
  }
});

router.put("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone, email, specialization, user_id } =
    req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime trenera su obavezni.",
    });
  }

  const sql = `
    UPDATE coaches
    SET first_name = ?, last_name = ?, phone = ?, email = ?, specialization = ?, user_id = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [first_name, last_name, phone, email, specialization, user_id, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni trenera:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Trener nije pronađen.",
        });
      }

      res.json({
        message: "Podaci o treneru su uspješno izmijenjeni.",
      });
    },
  );
});

router.delete("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  db.beginTransaction((err) => {
    if (err) {
      console.error("Greska pri pokretanju transakcije:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    db.query("SELECT user_id FROM coaches WHERE id = ?", [id], (err, rows) => {
      if (err) {
        return db.rollback(() => {
          console.error("Greska pri citanju trenera za brisanje:", err);
          return res.status(500).json({
            message: "Greska na serveru.",
          });
        });
      }

      if (rows.length === 0) {
        return db.rollback(() => {
          return res.status(404).json({
            message: "Trener nije pronadjen.",
          });
        });
      }

      const userId = rows[0].user_id;

      db.query(
        "UPDATE training_groups SET coach_id = NULL WHERE coach_id = ?",
        [id],
        (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greska pri uklanjanju trenera iz grupa:", err);
              return res.status(500).json({
                message: "Greska na serveru.",
              });
            });
          }

          db.query("DELETE FROM coaches WHERE id = ?", [id], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Greska pri brisanju trenera:", err);
            return res.status(500).json({
              message: "Greska na serveru.",
            });
          });
        }

        if (result.affectedRows === 0) {
          return db.rollback(() => {
            return res.status(404).json({
              message: "Trener nije pronadjen.",
            });
          });
        }

        const finishDelete = () => {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Greska pri potvrdi brisanja:", err);
                return res.status(500).json({
                  message: "Greska na serveru.",
                });
              });
            }

            return res.json({
              message: "Trener i korisnicki nalog su uspjesno obrisani.",
            });
          });
        };

        if (!userId) {
          return finishDelete();
        }

        db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greska pri brisanju korisnickog naloga:", err);
              return res.status(500).json({
                message: "Greska na serveru.",
              });
            });
          }

          return finishDelete();
        });
      });
        },
      );
    });
  });
});

router.delete("/legacy/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM coaches WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju trenera:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Trener nije pronađen.",
      });
    }

    res.json({
      message: "Trener je uspješno obrisan.",
    });
  });
});

module.exports = router;
