import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import styles from "./Dashboard.module.css";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await axiosInstance.get("/auth/me");

        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } catch (error) {
        setError(
          error.response?.data?.message || "Could not load dashboard data.",
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
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <h1>Dashboard</h1>
        <p>Overview of your club activity, members and upcoming sessions.</p>
      </div>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p>Active members</p>
          <strong>128</strong>
          <span>+4 this month</span>
        </article>

        <article className={styles.statCard}>
          <p>Coaches</p>
          <strong>7</strong>
          <span>2 head coaches</span>
        </article>

        <article className={styles.statCard}>
          <p>Training groups</p>
          <strong>9</strong>
          <span>Children, juniors, seniors</span>
        </article>

        <article className={styles.statCard}>
          <p>Unpaid fees</p>
          <strong>12</strong>
          <span>Requires follow-up</span>
        </article>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading dashboard...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {user && !isLoading ? (
        <article className={styles.welcomeCard}>
          <h2>Welcome back</h2>
          <p>
            You are signed in as {user.name}. Each protected page is rendered in
            this main content area through the router outlet.
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
        <p className={styles.emptyState}>No logged in user found.</p>
      ) : null}
    </section>
  );
}

export default Dashboard;
