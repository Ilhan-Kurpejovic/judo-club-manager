import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import CoachDashboard from "./coach/CoachDashboard";
import styles from "./Dashboard.module.css";

const paidStatus = "plaćeno";

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

async function fetchCoaches() {
  const response = await axiosInstance.get("/coaches");

  return response.data;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchMemberships() {
  const response = await axiosInstance.get("/memberships");

  return response.data;
}

function getCurrentMonth() {
  return String(new Date().getMonth() + 1);
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function isPaid(status) {
  return String(status || "").toLowerCase() === paidStatus;
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    activeMembersCount: 0,
    coachesCount: 0,
    trainingGroupsCount: 0,
    unpaidMembershipsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await axiosInstance.get("/auth/me");
        const currentUser = response.data.user;

        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));

        if (currentUser.role_name === "admin") {
          const [members, coaches, trainingGroups, memberships] =
            await Promise.all([
              fetchMembers(),
              fetchCoaches(),
              fetchTrainingGroups(),
              fetchMemberships(),
            ]);

          const currentMonth = getCurrentMonth();
          const currentYear = getCurrentYear();
          const activeMembers = members.filter(
            (member) => member.status !== "neaktivan",
          );
          const paidMembershipsByMemberId = new Set(
            memberships
              .filter(
                (membership) =>
                  String(membership.month) === currentMonth &&
                  String(membership.year) === currentYear &&
                  isPaid(membership.status),
              )
              .map((membership) => Number(membership.member_id)),
          );

          setDashboardData({
            activeMembersCount: activeMembers.length,
            coachesCount: coaches.length,
            trainingGroupsCount: trainingGroups.length,
            unpaidMembershipsCount: activeMembers.filter(
              (member) => !paidMembershipsByMemberId.has(Number(member.id)),
            ).length,
          });
        }
      } catch (error) {
        setError(
          error.response?.data?.message || "Nije moguće učitati dashboard.",
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUser();
  }, [navigate]);

  return (
    <section className={styles.dashboardPage}>
      {user?.role_name === "trener" && !isLoading && !error ? (
        <CoachDashboard user={user} />
      ) : (
        <>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <h1>Dashboard</h1>
        <p>Pregled aktivnosti kluba, članova i osnovnih administrativnih podataka.</p>
      </div>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p>Aktivni članovi</p>
          <strong>{dashboardData.activeMembersCount}</strong>
          <span>Članovi sa aktivnim statusom</span>
        </article>

        <article className={styles.statCard}>
          <p>Treneri</p>
          <strong>{dashboardData.coachesCount}</strong>
          <span>Registrovani treneri u klubu</span>
        </article>

        <article className={styles.statCard}>
          <p>Trening grupe</p>
          <strong>{dashboardData.trainingGroupsCount}</strong>
          <span>Grupe evidentirane u sistemu</span>
        </article>

        <article className={styles.statCard}>
          <p>Neplaćene članarine</p>
          <strong>{dashboardData.unpaidMembershipsCount}</strong>
          <span>Za tekući mjesec</span>
        </article>
      </div>

      {isLoading && <p className={styles.emptyState}>Učitavanje dashboarda...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {user && !isLoading ? (
        <article className={styles.welcomeCard}>
          <h2>Dobrodošli nazad</h2>
          <p>
            Prijavljeni ste kao {user.name}. Ovaj prostor prikazuje stranice
            kojima imate pristup u skladu sa svojom ulogom u sistemu.
          </p>

          <div className={styles.userMeta}>
            <span>{user.role_name}</span>
            <span>{user.email}</span>
            {user.member_id && <span>ID clana: {user.member_id}</span>}
            {user.coach_id && <span>ID trenera: {user.coach_id}</span>}
            {user.training_group_name && (
              <span>Trening grupa: {user.training_group_name}</span>
            )}
            {user.specialization && (
              <span>Specijalizacija: {user.specialization}</span>
            )}
          </div>
        </article>
      ) : null}

      {!user && !error && !isLoading ? (
        <p className={styles.emptyState}>Nije pronađen prijavljeni korisnik.</p>
      ) : null}
        </>
      )}
    </section>
  );
}

export default Dashboard;
