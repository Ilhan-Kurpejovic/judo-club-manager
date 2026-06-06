import {
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Medal,
  Users,
  UserRoundCog,
  TrophyIcon,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./ProtectedLayout.module.css";

const navigationByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/members", label: "Članovi", icon: Users },
    { to: "/coaches", label: "Treneri", icon: UserRoundCog },
    { to: "/training-groups", label: "Trening grupe", icon: Dumbbell },
    { to: "/trainings", label: "Treninzi", icon: CalendarDays },
    { to: "/memberships", label: "Članarine", icon: CreditCard },
    { to: "/competitions", label: "Takmičenja", icon: Medal },
    { to: "/files", label: "Fajlovi", icon: FileText },
  ],
  trener: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/coach-groups", label: "Moje grupe", icon: Dumbbell },
    { to: "/coach-members", label: "Članovi", icon: Users },
    {
      to: "/attendance",
      label: "Treninzi",
      icon: CalendarDays,
    },
    { to: "/coach-competitions", label: "Takmičenja", icon: Medal },
  ],
  clan: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/member-trainings", label: "Treninzi", icon: CalendarDays },
    { to: "/member-memberships", label: "Članarine", icon: CreditCard },
    { to: "/member-competitions", label: "Takmičenja", icon: Medal },
    { to: "/member-results", label: "Rezultati", icon: TrophyIcon },
    { to: "/member-files", label: "Fajlovi", icon: FileText },
  ],
};

function ProtectedLayout() {
  const navigate = useNavigate();
  const savedUser = sessionStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigationItems =
    navigationByRole[user?.role_name] || navigationByRole.clan;

  function handleLogout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
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

          <div className={styles.sidebarFooter}>
            <span></span>
            <small>© 2026 Judo Club Manager</small>
          </div>
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProtectedLayout;
