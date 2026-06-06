import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberMemberships.module.css";

const months = [
  { label: "Januar", value: "1" },
  { label: "Februar", value: "2" },
  { label: "Mart", value: "3" },
  { label: "April", value: "4" },
  { label: "Maj", value: "5" },
  { label: "Jun", value: "6" },
  { label: "Jul", value: "7" },
  { label: "Avgust", value: "8" },
  { label: "Septembar", value: "9" },
  { label: "Oktobar", value: "10" },
  { label: "Novembar", value: "11" },
  { label: "Decembar", value: "12" },
];

function getCurrentMonth() {
  return String(new Date().getMonth() + 1);
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

function formatPaymentDate(dateValue) {
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

function isPaid(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  return ["plaćeno", "placeno", "plaÄ‡eno"].includes(normalizedStatus);
}

function formatAmount(amount) {
  if (!amount) {
    return "-";
  }

  return `${Number(amount).toFixed(2)} EUR`;
}

function getMonthLabel(monthValue) {
  return (
    months.find((month) => month.value === String(monthValue))?.label || "-"
  );
}

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchMemberMemberships(memberId) {
  const response = await axiosInstance.get(`/memberships/member/${memberId}`);

  return response.data;
}

function MemberMemberships() {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  useEffect(() => {
    let isActive = true;

    async function loadMembershipsPage() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!currentUser.member_id) {
          throw new Error("Članski profil nije pronađen.");
        }

        const membershipsData = await fetchMemberMemberships(
          currentUser.member_id,
        );

        if (isActive) {
          setUser(currentUser);
          setMemberships(membershipsData);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              error.message ||
              "Nije moguće učitati članarine.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMembershipsPage();

    return () => {
      isActive = false;
    };
  }, []);

  const membershipsByMonth = useMemo(() => {
    return memberships
      .filter((membership) => String(membership.year) === String(selectedYear))
      .reduce((membershipMap, membership) => {
        membershipMap.set(String(membership.month), membership);
        return membershipMap;
      }, new Map());
  }, [memberships, selectedYear]);

  const yearRows = useMemo(() => {
    return months.map((month) => {
      const membership = membershipsByMonth.get(month.value);

      return {
        month,
        membership,
        paid: Boolean(membership && isPaid(membership.status)),
      };
    });
  }, [membershipsByMonth]);

  const paidRows = yearRows.filter((row) => row.paid);
  const unpaidRows = yearRows.filter((row) => !row.paid);
  const paidAmount = paidRows.reduce((total, row) => {
    return total + Number(row.membership?.amount || 0);
  }, 0);

  const currentMonthRow = yearRows.find(
    (row) =>
      row.month.value === currentMonth && String(selectedYear) === currentYear,
  );

  const lastPaidMembership = useMemo(() => {
    return memberships
      .filter((membership) => isPaid(membership.status))
      .sort((firstMembership, secondMembership) => {
        const firstDate = normalizeDateForInput(firstMembership.payment_date);
        const secondDate = normalizeDateForInput(secondMembership.payment_date);

        if (firstDate || secondDate) {
          return secondDate.localeCompare(firstDate);
        }

        if (String(firstMembership.year) !== String(secondMembership.year)) {
          return Number(secondMembership.year) - Number(firstMembership.year);
        }

        return Number(secondMembership.month) - Number(firstMembership.month);
      })[0];
  }, [memberships]);

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje članarina...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.membershipsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div className={styles.titleRow}>
          <div>
            <h1>Moje članarine</h1>
            <p>
              Pregled evidentiranih uplata članarine za{" "}
              <strong>{user?.name}</strong>.
            </p>
          </div>

          <label className={styles.yearControl}>
            Godina
            <input
              onChange={(event) => setSelectedYear(event.target.value)}
              type="number"
              value={selectedYear}
            />
          </label>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article
          className={
            currentMonthRow?.paid
              ? `${styles.summaryCard} ${styles.paidCard}`
              : `${styles.summaryCard} ${styles.unpaidCard}`
          }
        >
          <span>Tekući mjesec</span>
          <strong>{currentMonthRow?.paid ? "✓" : "!"}</strong>
          <small>
            {currentMonthRow?.paid
              ? "Članarina je plaćena"
              : "Nema evidentirane uplate"}
          </small>
        </article>

        <article className={styles.summaryCard}>
          <span>Plaćeno u godini</span>
          <strong>{paidRows.length}</strong>
          <small>{formatAmount(paidAmount)}</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Nije plaćeno</span>
          <strong>{unpaidRows.length}</strong>
          <small>Mjeseci bez evidentirane uplate</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Posljednja uplata</span>
          <strong>
            {lastPaidMembership
              ? getMonthLabel(lastPaidMembership.month)
              : "-"}
          </strong>
          <small>{formatPaymentDate(lastPaidMembership?.payment_date)}</small>
        </article>
      </div>

      <div className={styles.yearPanel}>
        <div>
          <h2>Pregled po mjesecima</h2>
          <p>
            Ako mjesec nema zapis u bazi, prikazuje se kao neplaćen dok ga
            administracija ne evidentira.
          </p>
        </div>

        <strong>{selectedYear}</strong>
      </div>

      <div className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th>Mjesec</th>
              <th>Status</th>
              <th>Iznos</th>
              <th>Datum uplate</th>
            </tr>
          </thead>

          <tbody>
            {yearRows.map((row) => (
              <tr key={row.month.value}>
                <td>
                  <strong>{row.month.label}</strong>
                  {row.month.value === currentMonth &&
                    String(selectedYear) === currentYear && <span>Tekući</span>}
                </td>
                <td>
                  <span
                    className={row.paid ? styles.statusPaid : styles.statusUnpaid}
                  >
                    {row.paid ? "Plaćeno" : "Nije plaćeno"}
                  </span>
                </td>
                <td>{formatAmount(row.membership?.amount)}</td>
                <td>{formatPaymentDate(row.membership?.payment_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default MemberMemberships;
