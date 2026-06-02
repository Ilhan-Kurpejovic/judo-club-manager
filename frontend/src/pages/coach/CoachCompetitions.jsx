import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axiosInstance from "../../api/axiosInstance";
import styles from "./CoachCompetitions.module.css";

const competitionFilters = [
  { label: "Sva", value: "all" },
  { label: "Buduća", value: "upcoming" },
  { label: "Prošla", value: "past" },
];

const medalOptions = [
  { label: "Bez medalje", value: "bez medalje" },
  { label: "Zlato", value: "zlato" },
  { label: "Srebro", value: "srebro" },
  { label: "Bronza", value: "bronza" },
];

async function fetchCompetitions() {
  const response = await axiosInstance.get("/competitions");

  return response.data;
}

async function fetchCompetitionApplications(competitionId) {
  const response = await axiosInstance.get(
    `/competition-applications/competition/${competitionId}`,
  );

  return response.data;
}

async function fetchApprovedApplications(competitionId) {
  const response = await axiosInstance.get(
    `/competition-applications/competition/${competitionId}/approved`,
  );

  return response.data;
}

async function fetchCompetitionResults(competitionId) {
  const response = await axiosInstance.get(
    `/competition-results/competition/${competitionId}`,
  );

  return response.data;
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function formatCompetitionDate(dateValue) {
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

function getLocation(competition) {
  return [competition.city, competition.country].filter(Boolean).join(", ");
}

function getMemberName(member) {
  return `${member.member_first_name || ""} ${member.member_last_name || ""}`.trim();
}

function getApplicationStatusClass(status) {
  if (status === "odobreno") {
    return styles.applicationStatusApproved;
  }

  if (status === "odbijeno") {
    return styles.applicationStatusRejected;
  }

  return styles.applicationStatusPending;
}

function CoachCompetitions() {
  const [competitions, setCompetitions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplicationsCompetition, setSelectedApplicationsCompetition] =
    useState(null);
  const [selectedResultsCompetition, setSelectedResultsCompetition] =
    useState(null);
  const [applications, setApplications] = useState([]);
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [resultDrafts, setResultDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const todayDate = getTodayDate();

  const filteredCompetitions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return [...competitions]
      .sort((firstCompetition, secondCompetition) => {
        const firstDate = normalizeDateForInput(firstCompetition.competition_date);
        const secondDate = normalizeDateForInput(secondCompetition.competition_date);

        return firstDate >= todayDate
          ? firstDate.localeCompare(secondDate)
          : secondDate.localeCompare(firstDate);
      })
      .filter((competition) => {
        const competitionDate = normalizeDateForInput(competition.competition_date);
        const isUpcomingCompetition = competitionDate >= todayDate;

        if (statusFilter === "upcoming" && !isUpcomingCompetition) {
          return false;
        }

        if (statusFilter === "past" && isUpcomingCompetition) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          competition.name,
          competition.city,
          competition.country,
          competition.organizer,
          competitionDate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      });
  }, [competitions, searchTerm, statusFilter, todayDate]);

  const upcomingCompetitionsCount = competitions.filter((competition) => {
    return normalizeDateForInput(competition.competition_date) >= todayDate;
  }).length;
  const pastCompetitionsCount = competitions.length - upcomingCompetitionsCount;

  useEffect(() => {
    let isActive = true;

    async function loadCompetitions() {
      try {
        const competitionsData = await fetchCompetitions();

        if (isActive) {
          setCompetitions(competitionsData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              "Nije moguće učitati takmičenja.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCompetitions();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        closeModals();
      }
    }

    if (selectedApplicationsCompetition || selectedResultsCompetition) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [selectedApplicationsCompetition, selectedResultsCompetition]);

  function closeModals() {
    setSelectedApplicationsCompetition(null);
    setSelectedResultsCompetition(null);
    setApplications([]);
    setApprovedApplications([]);
    setResultDrafts({});
    setModalError("");
  }

  async function openApplicationsModal(competition) {
    setSelectedApplicationsCompetition(competition);
    setSelectedResultsCompetition(null);
    setModalError("");
    setPageSuccess("");
    setIsModalLoading(true);

    try {
      setApplications(await fetchCompetitionApplications(competition.id));
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Nije moguće učitati prijave.",
      );
    } finally {
      setIsModalLoading(false);
    }
  }

  async function openResultsModal(competition) {
    setSelectedResultsCompetition(competition);
    setSelectedApplicationsCompetition(null);
    setModalError("");
    setPageSuccess("");
    setIsModalLoading(true);

    try {
      const [approvedData, resultsData] = await Promise.all([
        fetchApprovedApplications(competition.id),
        fetchCompetitionResults(competition.id),
      ]);

      const resultMap = resultsData.reduce((drafts, result) => {
        drafts[result.member_id] = {
          category: result.category || "",
          placement: result.placement || "",
          medal: result.medal || "bez medalje",
        };
        return drafts;
      }, {});

      approvedData.forEach((application) => {
        if (!resultMap[application.member_id]) {
          resultMap[application.member_id] = {
            category: application.weight_category || "",
            placement: "",
            medal: "bez medalje",
          };
        }
      });

      setApprovedApplications(approvedData);
      setResultDrafts(resultMap);
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Nije moguće učitati rezultate.",
      );
    } finally {
      setIsModalLoading(false);
    }
  }

  async function updateApplicationStatus(application, status) {
    setModalError("");
    setPageSuccess("");

    try {
      await axiosInstance.put(
        `/competition-applications/${application.id}/status`,
        {
          status,
          note: application.note || null,
        },
      );

      if (selectedApplicationsCompetition) {
        setApplications(
          await fetchCompetitionApplications(selectedApplicationsCompetition.id),
        );
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          "Nije moguće izmijeniti status prijave.",
      );
    }
  }

  function updateResultDraft(memberId, field, value) {
    setResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [memberId]: {
        ...(currentDrafts[memberId] || {}),
        [field]: value,
      },
    }));
  }

  async function saveResults() {
    if (!selectedResultsCompetition) {
      return;
    }

    if (approvedApplications.length === 0) {
      setModalError("Nema odobrenih takmičara za unos rezultata.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    setPageSuccess("");

    const results = approvedApplications.map((application) => {
      const draft = resultDrafts[application.member_id] || {};

      return {
        member_id: application.member_id,
        category: draft.category || application.weight_category || null,
        placement: draft.placement || null,
        medal: draft.medal || "bez medalje",
      };
    });

    try {
      await axiosInstance.post("/competition-results/bulk", {
        competition_id: selectedResultsCompetition.id,
        results,
      });

      setPageSuccess("Rezultati su uspješno sačuvani.");
      closeModals();
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Nije moguće sačuvati rezultate.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.coachCompetitionsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Takmičenja</h1>
          <p>
            Pregled takmičenja, prijava takmičara i unos rezultata za odobrene
            učesnike.
          </p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Učitavanje takmičenja...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno takmičenja</span>
              <strong>{competitions.length}</strong>
            </article>

            <article>
              <span>Buduća</span>
              <strong>{upcomingCompetitionsCount}</strong>
            </article>

            <article>
              <span>Prošla</span>
              <strong>{pastCompetitionsCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filterGroup} aria-label="Filter takmičenja">
              {competitionFilters.map((filter) => (
                <button
                  className={
                    statusFilter === filter.value
                      ? styles.activeFilterButton
                      : styles.filterButton
                  }
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <input
              aria-label="Pretraga takmičenja"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po nazivu, gradu ili organizatoru..."
              type="search"
              value={searchTerm}
            />
          </div>

          <div className={styles.competitionGrid}>
            {filteredCompetitions.map((competition) => {
              const competitionDate = normalizeDateForInput(
                competition.competition_date,
              );
              const isUpcomingCompetition = competitionDate >= todayDate;

              return (
                <article className={styles.competitionCard} key={competition.id}>
                  <div className={styles.cardDate}>
                    <span>{formatCompetitionDate(competition.competition_date)}</span>
                    <strong>{isUpcomingCompetition ? "Buduće" : "Prošlo"}</strong>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2>{competition.name}</h2>
                        <p>{getLocation(competition) || "Lokacija nije unesena"}</p>
                      </div>

                      <span
                        className={
                          isUpcomingCompetition
                            ? styles.statusUpcoming
                            : styles.statusPast
                        }
                      >
                        {isUpcomingCompetition ? "Predstoji" : "Završeno"}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      <span>Organizator</span>
                      <strong>{competition.organizer || "-"}</strong>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.applicationsButton}
                        onClick={() => openApplicationsModal(competition)}
                        type="button"
                      >
                        Prijave
                      </button>

                      <button
                        className={styles.resultsButton}
                        onClick={() => openResultsModal(competition)}
                        type="button"
                      >
                        Rezultati
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredCompetitions.length === 0 && (
            <p className={styles.emptyTable}>Nema pronađenih takmičenja.</p>
          )}

          {selectedApplicationsCompetition &&
            createPortal(
              <div
                className={styles.modalBackdrop}
                onClick={closeModals}
                role="presentation"
              >
                <div
                  aria-labelledby="applications-modal-title"
                  aria-modal="true"
                  className={styles.competitionsModal}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                >
                  <div className={styles.modalHeader}>
                    <div>
                      <span>Prijave takmičara</span>
                      <h2 id="applications-modal-title">
                        {selectedApplicationsCompetition.name}
                      </h2>
                      <p>
                        {getLocation(selectedApplicationsCompetition) || "-"} /{" "}
                        {formatCompetitionDate(
                          selectedApplicationsCompetition.competition_date,
                        )}
                      </p>
                    </div>

                    <button
                      className={styles.closeModalButton}
                      onClick={closeModals}
                      type="button"
                    >
                      x
                    </button>
                  </div>

                  {isModalLoading && (
                    <p className={styles.emptyState}>Učitavanje prijava...</p>
                  )}

                  {modalError && (
                    <p className={styles.modalError}>{modalError}</p>
                  )}

                  {!isModalLoading && (
                    <div className={styles.applicationsList}>
                      {applications.map((application) => (
                        <article
                          className={styles.applicationItem}
                          key={application.id}
                        >
                          <div>
                            <strong>{getMemberName(application)}</strong>
                            <span>
                              {application.belt || "bez pojasa"} /{" "}
                              {application.weight_category ||
                                "bez težinske kategorije"}
                            </span>
                            {application.note && <p>{application.note}</p>}
                          </div>

                          <div className={styles.applicationActions}>
                            <span
                              className={`${styles.applicationStatus} ${getApplicationStatusClass(
                                application.status,
                              )}`}
                            >
                              {application.status}
                            </span>

                            <button
                              className={styles.approveButton}
                              disabled={application.status === "odobreno"}
                              onClick={() =>
                                updateApplicationStatus(application, "odobreno")
                              }
                              type="button"
                            >
                              Odobri
                            </button>

                            <button
                              className={styles.rejectButton}
                              disabled={application.status === "odbijeno"}
                              onClick={() =>
                                updateApplicationStatus(application, "odbijeno")
                              }
                              type="button"
                            >
                              Odbij
                            </button>
                          </div>
                        </article>
                      ))}

                      {applications.length === 0 && (
                        <p className={styles.emptyTable}>
                          Nema prijavljenih takmičara.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>,
              document.body,
            )}

          {selectedResultsCompetition &&
            createPortal(
              <div
                className={styles.modalBackdrop}
                onClick={closeModals}
                role="presentation"
              >
                <div
                  aria-labelledby="results-modal-title"
                  aria-modal="true"
                  className={styles.competitionsModal}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                >
                  <div className={styles.modalHeader}>
                    <div>
                      <span>Rezultati takmičenja</span>
                      <h2 id="results-modal-title">
                        {selectedResultsCompetition.name}
                      </h2>
                      <p>
                        Rezultati se unose samo za odobrene takmičare.
                      </p>
                    </div>

                    <button
                      className={styles.closeModalButton}
                      onClick={closeModals}
                      type="button"
                    >
                      x
                    </button>
                  </div>

                  {isModalLoading && (
                    <p className={styles.emptyState}>Učitavanje rezultata...</p>
                  )}

                  {modalError && (
                    <p className={styles.modalError}>{modalError}</p>
                  )}

                  {!isModalLoading && (
                    <>
                      <div className={styles.resultsList}>
                        {approvedApplications.map((application) => {
                          const draft = resultDrafts[application.member_id] || {};

                          return (
                            <article
                              className={styles.resultItem}
                              key={application.id}
                            >
                              <div className={styles.resultMember}>
                                <strong>{getMemberName(application)}</strong>
                                <span>
                                  {application.belt || "bez pojasa"} /{" "}
                                  {application.weight_category ||
                                    "bez težinske kategorije"}
                                </span>
                              </div>

                              <label>
                                Kategorija
                                <input
                                  onChange={(event) =>
                                    updateResultDraft(
                                      application.member_id,
                                      "category",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="-73kg seniori"
                                  type="text"
                                  value={draft.category || ""}
                                />
                              </label>

                              <label>
                                Plasman
                                <input
                                  onChange={(event) =>
                                    updateResultDraft(
                                      application.member_id,
                                      "placement",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="1. mjesto"
                                  type="text"
                                  value={draft.placement || ""}
                                />
                              </label>

                              <label>
                                Medalja
                                <select
                                  onChange={(event) =>
                                    updateResultDraft(
                                      application.member_id,
                                      "medal",
                                      event.target.value,
                                    )
                                  }
                                  value={draft.medal || "bez medalje"}
                                >
                                  {medalOptions.map((medal) => (
                                    <option key={medal.value} value={medal.value}>
                                      {medal.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </article>
                          );
                        })}
                      </div>

                      {approvedApplications.length === 0 && (
                        <p className={styles.emptyTable}>
                          Nema odobrenih takmičara za unos rezultata.
                        </p>
                      )}

                      <div className={styles.modalFooter}>
                        <button
                          className={styles.cancelButton}
                          onClick={closeModals}
                          type="button"
                        >
                          Otkaži
                        </button>

                        <button
                          className={styles.saveButton}
                          disabled={isSaving || approvedApplications.length === 0}
                          onClick={saveResults}
                          type="button"
                        >
                          {isSaving ? "Čuvanje..." : "Sačuvaj rezultate"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>,
              document.body,
            )}
        </>
      )}
    </section>
  );
}

export default CoachCompetitions;
