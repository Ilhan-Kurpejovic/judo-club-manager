import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./ProtectedLayout.module.css";

function ProtectedLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }
  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Judo Club Manager</p>
          <h1>Club management system</h1>
        </div>

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav>
            <NavLink
              className={({ isActive }) =>
                isActive ? styles.activeLink : undefined
              }
              to="/dashboard"
            >
              Dashboard
            </NavLink>
          </nav>
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProtectedLayout;
