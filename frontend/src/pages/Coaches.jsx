//import PlaceholderPage from "../components/PlaceholderPage";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Coaches.module.css";

async function fetchCoaches() {
  const response = await axiosInstance.get("/coaches");

  return response.data;
}

function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredCoaches = coaches.filter((coach) => {
    const searchableText = [
      coach.first_name,
      coach.last_name,
      coach.email,
      coach.phone,
      coach.specialization,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  const coachesWithSpecializationCount = coaches.filter(
    (coach) => coach.specialization,
  ).length;

  const coachesWithoutPhoneCount = coaches.filter(
    (coach) => !coach.phone,
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadCoaches() {
      try {
        const coachesData = await fetchCoaches();

        if (isActive) {
          setCoaches(coachesData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message || "Ne mozemo da ucitamo trenere.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCoaches();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className={styles.coachesPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Treneri</h1>
          <p>Pregled trenera, specijalizacija i osnovnih kontakt podataka.</p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading coaches...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.summaryGrid}>
            <article>
              <span>Total coaches</span>
              <strong>{coaches.length}</strong>
            </article>

            <article>
              <span>Specialized</span>
              <strong>{coachesWithSpecializationCount}</strong>
            </article>

            <article>
              <span>Without phone</span>
              <strong>{coachesWithoutPhoneCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Search coaches"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretrazite po imenu, emailu, br. telefona ili specijalizaciji ..."
              type="search"
              value={searchTerm}
            />

            <span>
              Showing {filteredCoaches.length} of {coaches.length}
            </span>
          </div>

          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>Ime i prezime</th>
                  <th>Specijalizacija</th>
                  <th>Email</th>
                  <th>Telefon</th>
                </tr>
              </thead>

              <tbody>
                {filteredCoaches.map((coach) => (
                  <tr key={coach.id}>
                    <td>
                      <strong>
                        {coach.first_name} {coach.last_name}
                      </strong>
                    </td>
                    <td>{coach.specialization || "-"}</td>
                    <td>{coach.email || "-"}</td>
                    <td>{coach.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCoaches.length === 0 && (
              <p className={styles.emptyTable}>No coaches found.</p>
            )}
          </div>
        </>
      )}
    </section>
  );

  /*
  return (
    <PlaceholderPage
      title="Treneri"
      description="Ovdje cemo prikazati trenere, njihove specijalizacije i povezane korisnicke naloge."
    />
  );*/
}

export default Coaches;
