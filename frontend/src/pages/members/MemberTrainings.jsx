import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberTrainings.module.css";

const filterOptions = [
  { label: "Svi", value: "all" },
  { label: "Budući", value: "upcoming" },
  { label: "Prošli", value: "past" },
];

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchTrainings() {
  const response = await axiosInstance.get("/trainings");

  return response.data;
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
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

function formatTime(timeValue) {
  if (!timeValue) {
    return "--:--";
  }

  return String(timeValue).slice(0, 5);
}

function getTrainingStatus(trainingDate, todayDate) {
  if (trainingDate === todayDate) {
    return "today";
  }

  if (trainingDate > todayDate) {
    return "upcoming";
  }

  return "past";
}

function MemberTrainings() {
  const [user, setUser] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDate = getTodayDate();

  useEffect(() => {
    let isActive = true;

    async function loadTrainingsPage() {
      try {
        const [currentUser, trainingsData] = await Promise.all([
          fetchCurrentUser(),
          fetchTrainings(),
        ]);

        if (isActive) {
          setUser(currentUser);
          setTrainings(trainingsData);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              "Nije moguće učitati treninge člana.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadTrainingsPage();

    return () => {
      isActive = false;
    };
  }, []);

  const memberTrainings = useMemo(() => {
    if (!user?.training_group_id) {
      return [];
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return trainings
      .filter(
        (training) =>
          Number(training.training_group_id) === Number(user.training_group_id),
      )
      .filter((training) => {
        const trainingDate = normalizeDateForInput(training.training_date);
        const trainingStatus = getTrainingStatus(trainingDate, todayDate);

        if (activeFilter === "upcoming" && trainingStatus === "past") {
          return false;
        }

        if (activeFilter === "past" && trainingStatus !== "past") {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          training.training_group_name,
          training.age_category,
          training.location,
          training.description,
          trainingDate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort((firstTraining, secondTraining) => {
        const firstDate = normalizeDateForInput(firstTraining.training_date);
        const secondDate = normalizeDateForInput(secondTraining.training_date);
        const firstIsUpcoming = firstDate >= todayDate;
        const secondIsUpcoming = secondDate >= todayDate;

        if (firstIsUpcoming !== secondIsUpcoming) {
          return firstIsUpcoming ? -1 : 1;
        }

        if (firstDate !== secondDate) {
          return firstIsUpcoming
            ? firstDate.localeCompare(secondDate)
            : secondDate.localeCompare(firstDate);
        }

        return String(firstTraining.start_time || "").localeCompare(
          String(secondTraining.start_time || ""),
        );
      });
  }, [activeFilter, searchTerm, todayDate, trainings, user]);

  const allMemberTrainings = useMemo(() => {
    if (!user?.training_group_id) {
      return [];
    }

    return trainings.filter(
      (training) =>
        Number(training.training_group_id) === Number(user.training_group_id),
    );
  }, [trainings, user]);

  const upcomingCount = allMemberTrainings.filter(
    (training) => normalizeDateForInput(training.training_date) >= todayDate,
  ).length;

  const todayCount = allMemberTrainings.filter(
    (training) => normalizeDateForInput(training.training_date) === todayDate,
  ).length;

  const pastCount = allMemberTrainings.filter(
    (training) => normalizeDateForInput(training.training_date) < todayDate,
  ).length;

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje treninga...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.trainingsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div className={styles.titleRow}>
          <div>
            <h1>Moji treninzi</h1>
            <p>
              Pregled treninga za tvoju grupu{" "}
              <strong>{user?.training_group_name || "nije dodijeljena"}</strong>
              .
            </p>
          </div>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article>
          <span>Ukupno treninga</span>
          <strong>{allMemberTrainings.length}</strong>
        </article>

        <article>
          <span>Budući</span>
          <strong>{upcomingCount}</strong>
        </article>

        <article>
          <span>Danas</span>
          <strong>{todayCount}</strong>
        </article>

        <article>
          <span>Prošli</span>
          <strong>{pastCount}</strong>
        </article>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          {filterOptions.map((option) => (
            <button
              className={
                activeFilter === option.value ? styles.activeTab : undefined
              }
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <input
          aria-label="Pretraga treninga"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Pretraga po datumu, lokaciji ili opisu..."
          type="search"
          value={searchTerm}
        />
      </div>

      <div className={styles.trainingsList}>
        {memberTrainings.map((training) => {
          const trainingDate = normalizeDateForInput(training.training_date);
          const trainingStatus = getTrainingStatus(trainingDate, todayDate);

          return (
            <article className={styles.trainingCard} key={training.id}>
              <div className={styles.dateBlock}>
                <span>{formatDate(training.training_date)}</span>
                <strong>
                  {formatTime(training.start_time)} -{" "}
                  {formatTime(training.end_time)}
                </strong>
              </div>

              <div className={styles.trainingBody}>
                <div className={styles.trainingHeader}>
                  <div>
                    <h2>{training.training_group_name || "Moja grupa"}</h2>
                    <p>{training.age_category || "Bez kategorije"}</p>
                  </div>

                  <span
                    className={
                      trainingStatus === "today"
                        ? styles.statusToday
                        : trainingStatus === "upcoming"
                          ? styles.statusUpcoming
                          : styles.statusFinished
                    }
                  >
                    {trainingStatus === "today"
                      ? "Danas"
                      : trainingStatus === "upcoming"
                        ? "Predstoji"
                        : "Završen"}
                  </span>
                </div>

                <div className={styles.trainingMeta}>
                  <span>{training.location || "Lokacija nije unesena"}</span>
                </div>

                <p className={styles.description}>
                  {training.description || "Opis treninga nije unesen."}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {memberTrainings.length === 0 && (
        <p className={styles.emptyTable}>
          Nema treninga koji odgovaraju izabranom filteru.
        </p>
      )}
    </section>
  );
}

export default MemberTrainings;
