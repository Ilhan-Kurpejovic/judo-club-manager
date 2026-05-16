import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./ProtectedLayout.module.css";

const navigationByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/members", label: "Clanovi" },
    { to: "/coaches", label: "Treneri" },
    { to: "/training-groups", label: "Trening grupe" },
    { to: "/trainings", label: "Treninzi" },
    { to: "/memberships", label: "Clanarine" },
    { to: "/competitions", label: "Takmicenja" },
    { to: "/files", label: "Fajlovi" },
  ],
  trener: [{ to: "/dashboard", label: "Dashboard" }],
  clan: [{ to: "/dashboard", label: "Dashboard" }],
};

function ProtectedLayout() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigationItems =
    navigationByRole[user?.role_name] || navigationByRole.clan;

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

        <div className={styles.headerActions}>
          {user && (
            <div className={styles.userSummary}>
              <span>{user.name}</span>
              <small>{user.role_name}</small>
            </div>
          )}

          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav>
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  isActive ? styles.activeLink : undefined
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
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
