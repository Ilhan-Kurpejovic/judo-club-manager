import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberDashboard.module.css";

async function fetchTrainings() {
  const response = await axiosInstance.get("/trainings");

  return response.data;
}

async function fetchMemberMemberships(memberId) {
  const response = await axiosInstance.get(`/memberships/member/${memberId}`);

  return response.data;
}

async function fetchMemberApplications(memberId) {
  const response = await axiosInstance.get(
    `/competition-applications/member/${memberId}`,
  );

  return response.data;
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

function getCurrentMonth() {
  return String(new Date().getMonth() + 1);
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function isPaid(status) {
  return String(status || "").toLowerCase() === "plaćeno";
}

function MemberDashboard({ user }) {
  const [trainings, setTrainings] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDate = getTodayDate();

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      if (!user?.member_id) {
        setIsLoading(false);
        return;
      }

      try {
        const [trainingsData, membershipsData, applicationsData, resultsData] =
          await Promise.all([
            fetchTrainings(),
            fetchMemberMemberships(user.member_id),
            fetchMemberApplications(user.member_id),
            fetchMemberResults(user.member_id),
          ]);

        if (isActive) {
          setTrainings(trainingsData);
          setMemberships(membershipsData);
          setApplications(applicationsData);
          setResults(resultsData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              "Nije moguće učitati član dashboard.",
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
  }, [user]);

  const upcomingTrainings = useMemo(() => {
    return trainings
      .filter((training) => {
        return (
          Number(training.training_group_id) ===
            Number(user?.training_group_id) &&
          normalizeDateForInput(training.training_date) >= todayDate
        );
      })
      .sort((firstTraining, secondTraining) => {
        const firstDate = normalizeDateForInput(firstTraining.training_date);
        const secondDate = normalizeDateForInput(secondTraining.training_date);

        if (firstDate !== secondDate) {
          return firstDate.localeCompare(secondDate);
        }

        return String(firstTraining.start_time || "").localeCompare(
          String(secondTraining.start_time || ""),
        );
      });
  }, [todayDate, trainings, user]);

  const currentMembership = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();

    return memberships.find(
      (membership) =>
        String(membership.month) === currentMonth &&
        String(membership.year) === currentYear,
    );
  }, [memberships]);

  const isCurrentMembershipPaid =
    currentMembership && isPaid(currentMembership.status);

  const approvedApplicationsCount = applications.filter(
    (application) => application.status === "odobreno",
  ).length;

  const medalsCount = results.filter(
    (result) => result.medal && result.medal !== "bez medalje",
  ).length;

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje član dashboarda...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.memberDashboard}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <h1>Član dashboard</h1>
        <p>
          Pregled tvoje trening grupe, najbližih treninga, članarina i
          takmičarskih aktivnosti.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p>Moja grupa</p>
          <strong>{user.training_group_name || "-"}</strong>
          <span>{user.age_category || "Uzrasna kategorija nije unesena"}</span>
        </article>

        <article className={styles.statCard}>
          <p>Najbliži treninzi</p>
          <strong>{upcomingTrainings.length}</strong>
          <span>Termini tvoje trening grupe</span>
        </article>

        <article
          className={
            isCurrentMembershipPaid
              ? `${styles.statCard} ${styles.membershipPaidCard}`
              : `${styles.statCard} ${styles.membershipUnpaidCard}`
          }
        >
          <p>Članarina</p>
          <strong className={styles.membershipStatus}>
            {isCurrentMembershipPaid ? "✓" : "!"}
          </strong>
          <span>
            {isCurrentMembershipPaid
              ? "Plaćeno za tekući mjesec"
              : "Nije evidentirana uplata za tekući mjesec"}
          </span>
        </article>

        <article className={styles.statCard}>
          <p>Takmičenja</p>
          <strong>{approvedApplicationsCount}</strong>
          <span>Odobrene prijave</span>
        </article>
      </div>

      <div className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Najbliži treninzi</h2>
            <p>Prvi termini tvoje trening grupe.</p>
          </div>

          <div className={styles.list}>
            {upcomingTrainings.slice(0, 4).map((training) => (
              <div className={styles.listItem} key={training.id}>
                <div>
                  <strong>{formatDate(training.training_date)}</strong>
                  <span>{training.location || "Lokacija nije unesena"}</span>
                </div>

                <small>
                  {formatTime(training.start_time)} -{" "}
                  {formatTime(training.end_time)}
                </small>
              </div>
            ))}
          </div>

          {upcomingTrainings.length === 0 && (
            <p className={styles.emptyPanel}>
              Trenutno nema budućih treninga za tvoju grupu.
            </p>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Moje prijave</h2>
            <p>Status prijava za takmičenja.</p>
          </div>

          <div className={styles.list}>
            {applications.slice(0, 4).map((application) => (
              <div className={styles.listItem} key={application.id}>
                <div>
                  <strong>{application.competition_name}</strong>
                  <span>{formatDate(application.competition_date)}</span>
                </div>

                <small>{application.status}</small>
              </div>
            ))}
          </div>

          {applications.length === 0 && (
            <p className={styles.emptyPanel}>
              Još nemaš prijava za takmičenja.
            </p>
          )}
        </article>
      </div>

      <article className={styles.welcomeCard}>
        <h2>Dobrodošli nazad</h2>
        <p>
          Prijavljeni ste kao {user.name}. Ovdje možete brzo vidjeti najvažnije
          informacije o svom članstvu u klubu.
        </p>

        <div className={styles.userMeta}>
          <span>{user.role_name}</span>
          <span>{user.email}</span>
          {user.member_id && <span>ID člana: {user.member_id}</span>}
          {user.training_group_name && (
            <span>Trening grupa: {user.training_group_name}</span>
          )}
          <span>Medalje: {medalsCount}</span>
        </div>
      </article>
    </section>
  );
}

export default MemberDashboard;
