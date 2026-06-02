import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./CoachGroups.module.css";

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

function CoachGroups() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const coachGroups = useMemo(() => {
    if (!user?.coach_id) {
      return [];
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return groups
      .filter((group) => Number(group.coach_id) === Number(user.coach_id))
      .filter((group) => {
        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          group.name,
          group.age_category,
          group.description,
          group.coach_first_name,
          group.coach_last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      });
  }, [groups, searchTerm, user]);

  const groupsWithDescriptionCount = coachGroups.filter(
    (group) => group.description,
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [currentUser, groupsData] = await Promise.all([
          fetchCurrentUser(),
          fetchTrainingGroups(),
        ]);

        if (isActive) {
          setUser(currentUser);
          setGroups(groupsData);
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Nije moguće učitati grupe.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className={styles.coachGroupsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Moje grupe</h1>
          <p>Pregled trening grupa koje su dodijeljene prijavljenom treneru.</p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Učitavanje grupa...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno grupa</span>
              <strong>{coachGroups.length}</strong>
            </article>

            <article>
              <span>Uzrasne kategorije</span>
              <strong>
                {new Set(coachGroups.map((group) => group.age_category)).size}
              </strong>
            </article>

            <article>
              <span>Grupe sa opisom</span>
              <strong>{groupsWithDescriptionCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Pretraga grupa"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po nazivu, kategoriji ili opisu..."
              type="search"
              value={searchTerm}
            />

            <span>
              Prikazano {coachGroups.length}{" "}
              {coachGroups.length === 1 ? "grupa" : "grupa"}
            </span>
          </div>

          <div className={styles.groupsGrid}>
            {coachGroups.map((group) => (
              <article className={styles.groupCard} key={group.id}>
                <div className={styles.groupHeader}>
                  <div>
                    <h2>{group.name}</h2>
                    <p>{group.age_category || "Bez uzrasne kategorije"}</p>
                  </div>

                  <span>Moja grupa</span>
                </div>

                <div className={styles.groupMeta}>
                  <span>Trener</span>
                  <strong>
                    {group.coach_first_name} {group.coach_last_name}
                  </strong>
                </div>

                <p className={styles.description}>
                  {group.description || "Opis grupe nije unesen."}
                </p>
              </article>
            ))}
          </div>

          {coachGroups.length === 0 && (
            <p className={styles.emptyTable}>
              Trenutno nema trening grupa dodijeljenih ovom treneru.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default CoachGroups;
