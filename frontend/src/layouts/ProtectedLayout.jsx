import {
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Medal,
  Users,
  UserRoundCog,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./ProtectedLayout.module.css";

const navigationByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/members", label: "Clanovi", icon: Users },
    { to: "/coaches", label: "Treneri", icon: UserRoundCog },
    { to: "/training-groups", label: "Trening grupe", icon: Dumbbell },
    { to: "/trainings", label: "Treninzi", icon: CalendarDays },
    { to: "/memberships", label: "Clanarine", icon: CreditCard },
    { to: "/competitions", label: "Takmicenja", icon: Medal },
    { to: "/files", label: "Fajlovi", icon: FileText },
  ],
  trener: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  clan: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
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
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? styles.activeLink : undefined
                  }
                  key={item.to}
                  to={item.to}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
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
