import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Memberships.module.css";

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

const paidStatus = "plaćeno";
const unpaidStatus = "nije plaćeno";
const defaultAmount = "30";

function getCurrentMonth() {
  return String(new Date().getMonth() + 1);
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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

function getMonthLabel(monthValue) {
  return months.find((month) => month.value === String(monthValue))?.label || "-";
}

function getMemberName(member) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim();
}

function getMembershipMemberName(membership) {
  return `${membership.member_first_name || ""} ${
    membership.member_last_name || ""
  }`.trim();
}

function isPaid(status) {
  return String(status || "").toLowerCase() === paidStatus;
}

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchMonthlyMemberships(month, year, trainingGroupId) {
  const params = new URLSearchParams({
    month,
    year,
  });

  if (trainingGroupId) {
    params.append("training_group_id", trainingGroupId);
  }

  const response = await axiosInstance.get(`/search/memberships?${params}`);

  return response.data;
}

function Memberships() {
  const [members, setMembers] = useState([]);
  const [trainingGroups, setTrainingGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [amountDrafts, setAmountDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState(null);
  const [error, setError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  async function loadMonthlyData() {
    setError("");

    const [membersData, groupsData, membershipsData] = await Promise.all([
      fetchMembers(),
      fetchTrainingGroups(),
      fetchMonthlyMemberships(selectedMonth, selectedYear, selectedGroupId),
    ]);

    setMembers(membersData);
    setTrainingGroups(groupsData);
    setMemberships(membershipsData);
  }

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      setIsLoading(true);

      try {
        const [membersData, groupsData, membershipsData] = await Promise.all([
          fetchMembers(),
          fetchTrainingGroups(),
          fetchMonthlyMemberships(selectedMonth, selectedYear, selectedGroupId),
        ]);

        if (isActive) {
          setMembers(membersData);
          setTrainingGroups(groupsData);
          setMemberships(membershipsData);
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Could not load memberships.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isActive = false;
    };
  }, [selectedGroupId, selectedMonth, selectedYear]);

  const membershipByMemberId = useMemo(() => {
    return memberships.reduce((membershipMap, membership) => {
      membershipMap.set(Number(membership.member_id), membership);
      return membershipMap;
    }, new Map());
  }, [memberships]);

  const monthlyRows = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return members
      .filter((member) => member.status !== "neaktivan")
      .filter((member) => {
        if (!selectedGroupId) {
          return true;
        }

        return String(member.training_group_id || "") === selectedGroupId;
      })
      .map((member) => {
        const membership = membershipByMemberId.get(Number(member.id));

        return {
          member,
          membership,
          paid: Boolean(membership && isPaid(membership.status)),
        };
      })
      .filter(({ member, membership }) => {
        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          getMemberName(member),
          member.training_group_name,
          member.age_category,
          membership ? getMembershipMemberName(membership) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort((firstRow, secondRow) => {
        return getMemberName(firstRow.member).localeCompare(
          getMemberName(secondRow.member),
        );
      });
  }, [members, membershipByMemberId, searchTerm, selectedGroupId]);

  const paidRows = monthlyRows.filter((row) => row.paid);
  const unpaidRowsCount = monthlyRows.length - paidRows.length;

  const paidTotal = paidRows.reduce((total, row) => {
    return total + Number(row.membership?.amount || 0);
  }, 0);

  const collectionRate =
    monthlyRows.length === 0
      ? 0
      : Math.round((paidRows.length / monthlyRows.length) * 100);

  function handleAmountDraftChange(memberId, value) {
    setAmountDrafts((currentDrafts) => ({
      ...currentDrafts,
      [memberId]: value,
    }));
  }

  function getDraftAmount(row) {
    return (
      amountDrafts[row.member.id] ||
      row.membership?.amount ||
      defaultAmount
    ).toString();
  }

  async function markAsPaid(row) {
    const amount = getDraftAmount(row);

    if (!amount || Number(amount) <= 0) {
      setError("Iznos clanarine mora biti veci od 0.");
      return;
    }

    setIsSavingId(row.member.id);
    setError("");
    setPageSuccess("");

    const payload = {
      member_id: row.member.id,
      month: selectedMonth,
      year: selectedYear,
      amount,
      status: paidStatus,
      payment_date: getTodayDate(),
    };

    try {
      if (row.membership) {
        await axiosInstance.put(`/memberships/${row.membership.id}`, payload);
      } else {
        await axiosInstance.post("/memberships", payload);
      }

      await loadMonthlyData();
      setPageSuccess("Uplata je evidentirana.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not mark membership paid.");
    } finally {
      setIsSavingId(null);
    }
  }

  async function markAsUnpaid(row) {
    if (!row.membership) {
      return;
    }

    const shouldContinue = window.confirm(
      `Da li zelite da ponistite uplatu za ${getMemberName(row.member)}?`,
    );

    if (!shouldContinue) {
      return;
    }

    setIsSavingId(row.member.id);
    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.put(`/memberships/${row.membership.id}`, {
        member_id: row.member.id,
        month: selectedMonth,
        year: selectedYear,
        amount: row.membership.amount || getDraftAmount(row),
        status: unpaidStatus,
        payment_date: null,
      });

      await loadMonthlyData();
      setPageSuccess("Uplata je ponistena.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not undo payment.");
    } finally {
      setIsSavingId(null);
    }
  }

  return (
    <section className={styles.membershipsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Clanarine</h1>
          <p>
            Mjesecna evidencija uplata po svim aktivnim clanovima kluba.
          </p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading memberships...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          <div className={styles.monthPanel}>
            <div className={styles.periodControls}>
              <label>
                Mjesec
                <select
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  value={selectedMonth}
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Godina
                <input
                  onChange={(event) => setSelectedYear(event.target.value)}
                  type="number"
                  value={selectedYear}
                />
              </label>

              <label>
                Trening grupa
                <select
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  value={selectedGroupId}
                >
                  <option value="">Sve grupe</option>
                  {trainingGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Pretraga
                <input
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ime clana..."
                  type="search"
                  value={searchTerm}
                />
              </label>
            </div>

            <div className={styles.periodTitle}>
              <span>Izabrani period</span>
              <strong>
                {getMonthLabel(selectedMonth)} {selectedYear}
              </strong>
            </div>
          </div>

          <div className={styles.summaryGrid}>
            <article>
              <span>Aktivni clanovi</span>
              <strong>{monthlyRows.length}</strong>
            </article>

            <article>
              <span>Platilo</span>
              <strong>{paidRows.length}</strong>
            </article>

            <article>
              <span>Nije platilo</span>
              <strong>{unpaidRowsCount}</strong>
            </article>

            <article>
              <span>Naplata</span>
              <strong>{collectionRate}%</strong>
            </article>

            <article>
              <span>Uplaceno</span>
              <strong>{paidTotal.toFixed(2)} EUR</strong>
            </article>
          </div>

          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Clan</th>
                  <th>Trening grupa</th>
                  <th>Iznos</th>
                  <th>Datum placanja</th>
                  <th>Akcija</th>
                </tr>
              </thead>

              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.member.id}>
                    <td>
                      <span
                        className={
                          row.paid ? styles.paymentPaid : styles.paymentUnpaid
                        }
                        title={row.paid ? "Placeno" : "Nije placeno"}
                      ></span>
                    </td>
                    <td>
                      <strong>{getMemberName(row.member)}</strong>
                      <span>{row.member.age_category || "-"}</span>
                    </td>
                    <td>{row.member.training_group_name || "-"}</td>
                    <td>
                      {row.paid ? (
                        `${Number(row.membership?.amount || 0).toFixed(2)} EUR`
                      ) : (
                        <input
                          className={styles.amountInput}
                          min="0"
                          onChange={(event) =>
                            handleAmountDraftChange(row.member.id, event.target.value)
                          }
                          step="0.01"
                          type="number"
                          value={getDraftAmount(row)}
                        />
                      )}
                    </td>
                    <td>{formatPaymentDate(row.membership?.payment_date)}</td>
                    <td>
                      {row.paid ? (
                        <button
                          className={styles.undoButton}
                          disabled={isSavingId === row.member.id}
                          onClick={() => markAsUnpaid(row)}
                          type="button"
                        >
                          Ponisti uplatu
                        </button>
                      ) : (
                        <button
                          className={styles.markPaidButton}
                          disabled={isSavingId === row.member.id}
                          onClick={() => markAsPaid(row)}
                          type="button"
                        >
                          Oznaci placeno
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {monthlyRows.length === 0 && (
              <p className={styles.emptyTable}>No members found for this view.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Memberships;
