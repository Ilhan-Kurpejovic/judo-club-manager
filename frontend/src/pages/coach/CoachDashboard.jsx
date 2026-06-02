import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./CoachDashboard.module.css";

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

async function fetchTrainings() {
  const response = await axiosInstance.get("/trainings");

  return response.data;
}

async function fetchCompetitions() {
  const response = await axiosInstance.get("/competitions");

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

function CoachDashboard({ user }) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDate = getTodayDate();

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      try {
        const [groupsData, membersData, trainingsData, competitionsData] =
          await Promise.all([
            fetchTrainingGroups(),
            fetchMembers(),
            fetchTrainings(),
            fetchCompetitions(),
          ]);

        if (isActive) {
          setGroups(groupsData);
          setMembers(membersData);
          setTrainings(trainingsData);
          setCompetitions(competitionsData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              "Nije moguće učitati trener dashboard.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []);

  const coachGroups = useMemo(() => {
    if (!user?.coach_id) {
      return [];
    }

    return groups.filter((group) => Number(group.coach_id) === Number(user.coach_id));
  }, [groups, user]);

  const coachGroupIds = useMemo(() => {
    return new Set(coachGroups.map((group) => Number(group.id)));
  }, [coachGroups]);

  const coachMembers = useMemo(() => {
    return members.filter((member) => {
      return (
        coachGroupIds.has(Number(member.training_group_id)) &&
        member.status !== "neaktivan"
      );
    });
  }, [coachGroupIds, members]);

  const coachTrainings = useMemo(() => {
    return trainings.filter((training) =>
      coachGroupIds.has(Number(training.training_group_id)),
    );
  }, [coachGroupIds, trainings]);

  const todayTrainings = useMemo(() => {
    return coachTrainings
      .filter(
        (training) => normalizeDateForInput(training.training_date) === todayDate,
      )
      .sort((firstTraining, secondTraining) =>
        String(firstTraining.start_time || "").localeCompare(
          String(secondTraining.start_time || ""),
        ),
      );
  }, [coachTrainings, todayDate]);

  const upcomingCompetitions = useMemo(() => {
    return competitions
      .filter(
        (competition) =>
          normalizeDateForInput(competition.competition_date) >= todayDate,
      )
      .sort((firstCompetition, secondCompetition) =>
        normalizeDateForInput(firstCompetition.competition_date).localeCompare(
          normalizeDateForInput(secondCompetition.competition_date),
        ),
      );
  }, [competitions, todayDate]);

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje trener dashboarda...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.coachDashboard}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <h1>Trener dashboard</h1>
        <p>
          Pregled tvojih grupa, članova, današnjih treninga i najbližih
          takmičenja.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p>Moje grupe</p>
          <strong>{coachGroups.length}</strong>
          <span>Grupe za koje si zadužen</span>
        </article>

        <article className={styles.statCard}>
          <p>Moji članovi</p>
          <strong>{coachMembers.length}</strong>
          <span>Aktivni članovi u tvojim grupama</span>
        </article>

        <article className={styles.statCard}>
          <p>Danas treninzi</p>
          <strong>{todayTrainings.length}</strong>
          <span>Termini zakazani za danas</span>
        </article>

        <article className={styles.statCard}>
          <p>Takmičenja</p>
          <strong>{upcomingCompetitions.length}</strong>
          <span>Takmičenja koja predstoje</span>
        </article>
      </div>

      <div className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Današnji treninzi</h2>
            <p>Termini koje treba ispratiti danas.</p>
          </div>

          <div className={styles.list}>
            {todayTrainings.map((training) => (
              <div className={styles.listItem} key={training.id}>
                <div>
                  <strong>{training.training_group_name}</strong>
                  <span>{training.location || "Lokacija nije unesena"}</span>
                </div>

                <small>
                  {formatTime(training.start_time)} -{" "}
                  {formatTime(training.end_time)}
                </small>
              </div>
            ))}
          </div>

          {todayTrainings.length === 0 && (
            <p className={styles.emptyPanel}>Nema treninga za danas.</p>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Najbliža takmičenja</h2>
            <p>Prva takmičenja iz kalendara.</p>
          </div>

          <div className={styles.list}>
            {upcomingCompetitions.slice(0, 4).map((competition) => (
              <div className={styles.listItem} key={competition.id}>
                <div>
                  <strong>{competition.name}</strong>
                  <span>
                    {[competition.city, competition.country]
                      .filter(Boolean)
                      .join(", ") || "Lokacija nije unesena"}
                  </span>
                </div>

                <small>{formatDate(competition.competition_date)}</small>
              </div>
            ))}
          </div>

          {upcomingCompetitions.length === 0 && (
            <p className={styles.emptyPanel}>Nema budućih takmičenja.</p>
          )}
        </article>
      </div>

      <article className={styles.welcomeCard}>
        <h2>Dobrodošao nazad</h2>
        <p>
          Prijavljen si kao {user.name}. Kroz bočni meni možeš pregledati svoje
          grupe, članove, treninge i takmičenja.
        </p>

        <div className={styles.userMeta}>
          <span>{user.role_name}</span>
          <span>{user.email}</span>
          {user.coach_id && <span>ID trenera: {user.coach_id}</span>}
          {user.specialization && (
            <span>Specijalizacija: {user.specialization}</span>
          )}
        </div>
      </article>
    </section>
  );
}

export default CoachDashboard;
