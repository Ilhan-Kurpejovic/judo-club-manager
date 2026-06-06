import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberResults.module.css";

const resultFilters = [
  { label: "Svi", value: "all" },
  { label: "Sa medaljom", value: "medals" },
  { label: "Bez medalje", value: "no-medal" },
];

const medalPriority = {
  zlato: 1,
  srebro: 2,
  bronza: 3,
  "bez medalje": 4,
};

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchMemberResults(memberId) {
  const response = await axiosInstance.get(
    `/competition-results/member/${memberId}`,
  );

  return response.data;
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

function formatCompetitionDate(dateValue) {
  const normalizedDate = normalizeDateForInput(dateValue);

  if (!normalizedDate) {
    return "-";
  }

  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${normalizedDate}T00:00:00`));
}

function getLocation(result) {
  return [result.city, result.country].filter(Boolean).join(", ");
}

function normalizeMedal(medal) {
  return String(medal || "bez medalje").toLowerCase();
}

function hasMedal(result) {
  return normalizeMedal(result.medal) !== "bez medalje";
}

function getMedalLabel(medal) {
  const normalizedMedal = normalizeMedal(medal);

  if (normalizedMedal === "zlato") {
    return "Zlato";
  }

  if (normalizedMedal === "srebro") {
    return "Srebro";
  }

  if (normalizedMedal === "bronza") {
    return "Bronza";
  }

  return "Bez medalje";
}

function getMedalClass(medal) {
  const normalizedMedal = normalizeMedal(medal);

  if (normalizedMedal === "zlato") {
    return styles.goldMedal;
  }

  if (normalizedMedal === "srebro") {
    return styles.silverMedal;
  }

  if (normalizedMedal === "bronza") {
    return styles.bronzeMedal;
  }

  return styles.noMedal;
}

function MemberResults() {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadResultsPage() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!currentUser.member_id) {
          throw new Error("Članski profil nije pronađen.");
        }

        const resultsData = await fetchMemberResults(currentUser.member_id);

        if (isActive) {
          setUser(currentUser);
          setResults(resultsData);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              error.message ||
              "Nije moguće učitati rezultate.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadResultsPage();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredResults = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return results
      .filter((result) => {
        if (activeFilter === "medals" && !hasMedal(result)) {
          return false;
        }

        if (activeFilter === "no-medal" && hasMedal(result)) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          result.competition_name,
          result.city,
          result.country,
          result.category,
          result.placement,
          result.medal,
          normalizeDateForInput(result.competition_date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort((firstResult, secondResult) => {
        const firstDate = normalizeDateForInput(firstResult.competition_date);
        const secondDate = normalizeDateForInput(secondResult.competition_date);

        return secondDate.localeCompare(firstDate);
      });
  }, [activeFilter, results, searchTerm]);

  const medalResults = results.filter(hasMedal);
  const goldCount = results.filter(
    (result) => normalizeMedal(result.medal) === "zlato",
  ).length;
  const silverCount = results.filter(
    (result) => normalizeMedal(result.medal) === "srebro",
  ).length;
  const bronzeCount = results.filter(
    (result) => normalizeMedal(result.medal) === "bronza",
  ).length;

  const bestResult = useMemo(() => {
    return [...results].sort((firstResult, secondResult) => {
      const firstMedalPriority =
        medalPriority[normalizeMedal(firstResult.medal)] || 99;
      const secondMedalPriority =
        medalPriority[normalizeMedal(secondResult.medal)] || 99;

      if (firstMedalPriority !== secondMedalPriority) {
        return firstMedalPriority - secondMedalPriority;
      }

      const firstDate = normalizeDateForInput(firstResult.competition_date);
      const secondDate = normalizeDateForInput(secondResult.competition_date);

      return secondDate.localeCompare(firstDate);
    })[0];
  }, [results]);

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje rezultata...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.memberResultsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Moji rezultati</h1>
          <p>
            Pregled ostvarenih rezultata, plasmana i medalja za{" "}
            <strong>{user?.name}</strong>.
          </p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article>
          <span>Ukupno nastupa</span>
          <strong>{results.length}</strong>
        </article>

        <article>
          <span>Medalje</span>
          <strong>{medalResults.length}</strong>
          <small>
            {goldCount} zlato / {silverCount} srebro / {bronzeCount} bronza
          </small>
        </article>

        <article>
          <span>Najbolji rezultat</span>
          <strong>{bestResult ? getMedalLabel(bestResult.medal) : "-"}</strong>
          <small>{bestResult?.placement || "Još nema rezultata"}</small>
        </article>

        <article>
          <span>Posljednji nastup</span>
          <strong>
            {results[0] ? formatCompetitionDate(results[0].competition_date) : "-"}
          </strong>
          <small>{results[0]?.competition_name || "Nema nastupa"}</small>
        </article>
      </div>

      <div className={styles.medalStrip}>
        <article className={styles.goldStrip}>
          <span>Zlato</span>
          <strong>{goldCount}</strong>
        </article>

        <article className={styles.silverStrip}>
          <span>Srebro</span>
          <strong>{silverCount}</strong>
        </article>

        <article className={styles.bronzeStrip}>
          <span>Bronza</span>
          <strong>{bronzeCount}</strong>
        </article>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterTabs} aria-label="Filter rezultata">
          {resultFilters.map((filter) => (
            <button
              className={
                activeFilter === filter.value ? styles.activeTab : undefined
              }
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <input
          aria-label="Pretraga rezultata"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Pretraga po takmičenju, kategoriji ili medalji..."
          type="search"
          value={searchTerm}
        />
      </div>

      <div className={styles.resultsGrid}>
        {filteredResults.map((result) => (
          <article className={styles.resultCard} key={result.id}>
            <div className={styles.resultHeader}>
              <div>
                <h2>{result.competition_name || "Takmičenje"}</h2>
                <p>
                  {getLocation(result) || "Lokacija nije unesena"} /{" "}
                  {formatCompetitionDate(result.competition_date)}
                </p>
              </div>

              <span className={`${styles.medalBadge} ${getMedalClass(result.medal)}`}>
                {getMedalLabel(result.medal)}
              </span>
            </div>

            <div className={styles.resultDetails}>
              <div>
                <span>Kategorija</span>
                <strong>{result.category || "-"}</strong>
              </div>

              <div>
                <span>Plasman</span>
                <strong>{result.placement || "-"}</strong>
              </div>

              <div>
                <span>Medalja</span>
                <strong>{getMedalLabel(result.medal)}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <p className={styles.emptyTable}>Nema rezultata za izabrani prikaz.</p>
      )}
    </section>
  );
}

export default MemberResults;
