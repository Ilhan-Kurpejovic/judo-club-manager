import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

function Dashboard() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <main className={styles.dashboardPage}>
      <section className={styles.dashboardPanel}>
        <header className={styles.dashboardHeader}>
          <div>
            <p className={styles.eyebrow}>Judo Club Manager</p>
            <h1>Dashboard</h1>
          </div>

          <button
            className={styles.logoutButton}
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </header>

        {user ? (
          <div className={styles.userCard}>
            <p>Welcome, {user.name}</p>
            <span>{user.role_name}</span>
            <span>{user.email}</span>
          </div>
        ) : (
          <p className={styles.emptyState}>No logged in user found.</p>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
