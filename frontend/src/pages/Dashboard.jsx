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
    <section className={styles.dashboardPanel}>
      <p className={styles.eyebrow}>Judo Club Manager</p>
      <h1>Dashboard</h1>

      {isLoading && <p className={styles.emptyState}>Loading dashboard...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {user && !isLoading ? (
        <div className={styles.userCard}>
          <p>Welcome, {user.name}</p>
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
      ) : null}

      {!user && !error && !isLoading ? (
        <p className={styles.emptyState}>No logged in user found.</p>
      ) : null}
    </section>
  );
}

export default Dashboard;
