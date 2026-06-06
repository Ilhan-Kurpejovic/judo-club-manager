import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberCompetitions.module.css";

const competitionFilters = [
  { label: "Sva", value: "all" },
  { label: "Buduća", value: "upcoming" },
  { label: "Moje prijave", value: "applied" },
  { label: "Prošla", value: "past" },
];

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchCompetitions() {
  const response = await axiosInstance.get("/competitions");

  return response.data;
}

async function fetchAllowedCategories() {
  const response = await axiosInstance.get("/competition-allowed-categories");

  return response.data;
}

async function fetchMemberApplications(memberId) {
  const response = await axiosInstance.get(
    `/competition-applications/member/${memberId}`,
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

function normalizeCategory(category) {
  return String(category || "").trim().toLowerCase();
}

function getStatusLabel(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "odobreno") {
    return "Odobreno";
  }

  if (normalizedStatus === "odbijeno") {
    return "Odbijeno";
  }

  return "Na čekanju";
}

function getApplicationStatusClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "odobreno") {
    return styles.applicationApproved;
  }

  if (normalizedStatus === "odbijeno") {
    return styles.applicationRejected;
  }

  return styles.applicationPending;
}

function MemberCompetitions() {
  const [user, setUser] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [applicationNote, setApplicationNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const todayDate = getTodayDate();

  useEffect(() => {
    let isActive = true;

    async function loadCompetitionsPage() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!currentUser.member_id) {
          throw new Error("Članski profil nije pronađen.");
        }

        const [competitionsData, categoriesData, applicationsData] =
          await Promise.all([
            fetchCompetitions(),
            fetchAllowedCategories(),
            fetchMemberApplications(currentUser.member_id),
          ]);

        if (isActive) {
          setUser(currentUser);
          setCompetitions(competitionsData);
          setAllowedCategories(categoriesData);
          setApplications(applicationsData);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              error.message ||
              "Nije moguće učitati takmičenja.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCompetitionsPage();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        closeApplicationModal();
      }
    }

    if (selectedCompetition) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [selectedCompetition]);

  const allowedCategoriesByCompetitionId = useMemo(() => {
    return allowedCategories.reduce((categoryMap, category) => {
      const competitionId = Number(category.competition_id);
      const currentCategories = categoryMap.get(competitionId) || [];

      categoryMap.set(competitionId, [...currentCategories, category]);
      return categoryMap;
    }, new Map());
  }, [allowedCategories]);

  const applicationsByCompetitionId = useMemo(() => {
    return applications.reduce((applicationMap, application) => {
      applicationMap.set(Number(application.competition_id), application);
      return applicationMap;
    }, new Map());
  }, [applications]);

  const filteredCompetitions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return [...competitions]
      .sort((firstCompetition, secondCompetition) => {
        const firstDate = normalizeDateForInput(firstCompetition.competition_date);
        const secondDate = normalizeDateForInput(secondCompetition.competition_date);
        const firstIsUpcoming = firstDate >= todayDate;
        const secondIsUpcoming = secondDate >= todayDate;

        if (firstIsUpcoming !== secondIsUpcoming) {
          return firstIsUpcoming ? -1 : 1;
        }

        return firstIsUpcoming
          ? firstDate.localeCompare(secondDate)
          : secondDate.localeCompare(firstDate);
      })
      .filter((competition) => {
        const competitionDate = normalizeDateForInput(
          competition.competition_date,
        );
        const isUpcomingCompetition = competitionDate >= todayDate;
        const application = applicationsByCompetitionId.get(
          Number(competition.id),
        );

        if (activeFilter === "upcoming" && !isUpcomingCompetition) {
          return false;
        }

        if (activeFilter === "past" && isUpcomingCompetition) {
          return false;
        }

        if (activeFilter === "applied" && !application) {
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
  }, [
    activeFilter,
    applicationsByCompetitionId,
    competitions,
    searchTerm,
    todayDate,
  ]);

  const upcomingCompetitionsCount = competitions.filter(
    (competition) =>
      normalizeDateForInput(competition.competition_date) >= todayDate,
  ).length;

  const approvedApplicationsCount = applications.filter(
    (application) => application.status === "odobreno",
  ).length;

  function canApplyForCompetition(competition) {
    const competitionDate = normalizeDateForInput(competition.competition_date);
    const isUpcomingCompetition = competitionDate >= todayDate;
    const application = applicationsByCompetitionId.get(Number(competition.id));
    const competitionCategories =
      allowedCategoriesByCompetitionId.get(Number(competition.id)) || [];
    const userCategory = normalizeCategory(user?.age_category);
    const isAllowedCategory = competitionCategories.some(
      (category) => normalizeCategory(category.age_category) === userCategory,
    );

    return Boolean(
      isUpcomingCompetition && !application && userCategory && isAllowedCategory,
    );
  }

  function getCompetitionMessage(competition) {
    const competitionDate = normalizeDateForInput(competition.competition_date);
    const isUpcomingCompetition = competitionDate >= todayDate;
    const application = applicationsByCompetitionId.get(Number(competition.id));
    const competitionCategories =
      allowedCategoriesByCompetitionId.get(Number(competition.id)) || [];
    const userCategory = normalizeCategory(user?.age_category);
    const isAllowedCategory = competitionCategories.some(
      (category) => normalizeCategory(category.age_category) === userCategory,
    );

    if (application) {
      return `Prijava je poslata: ${getStatusLabel(application.status)}.`;
    }

    if (!isUpcomingCompetition) {
      return "Takmičenje je završeno, prijava nije dostupna.";
    }

    if (!userCategory) {
      return "Tvoja uzrasna kategorija nije definisana.";
    }

    if (!isAllowedCategory) {
      return "Tvoja uzrasna kategorija nije dozvoljena za ovo takmičenje.";
    }

    return "Možeš poslati prijavu za ovo takmičenje.";
  }

  function openApplicationModal(competition) {
    setSelectedCompetition(competition);
    setApplicationNote("");
    setModalError("");
    setPageSuccess("");
  }

  function closeApplicationModal() {
    setSelectedCompetition(null);
    setApplicationNote("");
    setModalError("");
  }

  async function submitApplication(event) {
    event.preventDefault();

    if (!selectedCompetition || !user?.member_id) {
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    setPageSuccess("");

    try {
      await axiosInstance.post("/competition-applications", {
        competition_id: selectedCompetition.id,
        member_id: user.member_id,
        note: applicationNote.trim() || null,
      });

      setApplications(await fetchMemberApplications(user.member_id));
      setPageSuccess("Prijava je uspješno poslata.");
      closeApplicationModal();
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Nije moguće poslati prijavu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje takmičenja...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.memberCompetitionsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Takmičenja</h1>
          <p>
            Pregled dostupnih takmičenja i prijava za tvoju uzrasnu kategoriju.
          </p>
        </div>
      </div>

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
          <span>Moje prijave</span>
          <strong>{applications.length}</strong>
        </article>

        <article>
          <span>Odobreno</span>
          <strong>{approvedApplicationsCount}</strong>
        </article>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterTabs} aria-label="Filter takmičenja">
          {competitionFilters.map((filter) => (
            <button
              className={
                activeFilter === filter.value ? styles.activeTab : undefined
              }
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
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
          const application = applicationsByCompetitionId.get(
            Number(competition.id),
          );
          const competitionCategories =
            allowedCategoriesByCompetitionId.get(Number(competition.id)) || [];

          return (
            <article className={styles.competitionCard} key={competition.id}>
              <div className={styles.cardDate}>
                <span>{formatCompetitionDate(competition.competition_date)}</span>
                <strong>
                  {isUpcomingCompetition ? "Predstoji" : "Završeno"}
                </strong>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2>{competition.name}</h2>
                    <p>{getLocation(competition) || "Lokacija nije unesena"}</p>
                  </div>

                  <span
                    className={
                      application
                        ? `${styles.applicationBadge} ${getApplicationStatusClass(
                            application.status,
                          )}`
                        : isUpcomingCompetition
                          ? styles.statusUpcoming
                          : styles.statusPast
                    }
                  >
                    {application
                      ? getStatusLabel(application.status)
                      : isUpcomingCompetition
                        ? "Dostupno"
                        : "Prošlo"}
                  </span>
                </div>

                <div className={styles.cardMeta}>
                  <div>
                    <span>Organizator</span>
                    <strong>{competition.organizer || "-"}</strong>
                  </div>

                  <div>
                    <span>Moja kategorija</span>
                    <strong>{user?.age_category || "-"}</strong>
                  </div>
                </div>

                <div className={styles.categoriesRow}>
                  <span>Dozvoljene kategorije</span>
                  <div>
                    {competitionCategories.length > 0 ? (
                      competitionCategories.map((category) => (
                        <small key={category.id}>
                          {category.age_category}
                        </small>
                      ))
                    ) : (
                      <small>Nema definisanih kategorija</small>
                    )}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <p
                    className={
                      canApplyForCompetition(competition)
                        ? styles.availableMessage
                        : styles.unavailableMessage
                    }
                  >
                    {getCompetitionMessage(competition)}
                  </p>

                  <button
                    className={styles.applyButton}
                    disabled={!canApplyForCompetition(competition)}
                    onClick={() => openApplicationModal(competition)}
                    type="button"
                  >
                    {application ? "Prijava poslata" : "Prijavi se"}
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

      {selectedCompetition &&
        createPortal(
          <div
            className={styles.modalBackdrop}
            onClick={closeApplicationModal}
            role="presentation"
          >
            <form
              aria-labelledby="application-modal-title"
              aria-modal="true"
              className={styles.applicationModal}
              onClick={(event) => event.stopPropagation()}
              onSubmit={submitApplication}
              role="dialog"
            >
              <div className={styles.modalHeader}>
                <div>
                  <span>Prijava za takmičenje</span>
                  <h2 id="application-modal-title">
                    {selectedCompetition.name}
                  </h2>
                  <p>
                    {getLocation(selectedCompetition) || "-"} /{" "}
                    {formatCompetitionDate(selectedCompetition.competition_date)}
                  </p>
                </div>

                <button
                  className={styles.closeModalButton}
                  onClick={closeApplicationModal}
                  type="button"
                >
                  x
                </button>
              </div>

              {modalError && <p className={styles.modalError}>{modalError}</p>}

              <div className={styles.modalInfoGrid}>
                <article>
                  <span>Takmičar</span>
                  <strong>{user?.name}</strong>
                </article>

                <article>
                  <span>Uzrasna kategorija</span>
                  <strong>{user?.age_category || "-"}</strong>
                </article>

                <article>
                  <span>Status prijave</span>
                  <strong>Nova prijava</strong>
                </article>
              </div>

              <label className={styles.noteField}>
                Napomena za trenera ili administraciju
                <textarea
                  onChange={(event) => setApplicationNote(event.target.value)}
                  placeholder="Npr. želim da učestvujem na ovom takmičenju."
                  rows="4"
                  value={applicationNote}
                ></textarea>
              </label>

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={closeApplicationModal}
                  type="button"
                >
                  Otkaži
                </button>

                <button
                  className={styles.submitButton}
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Slanje..." : "Pošalji prijavu"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </section>
  );
}

export default MemberCompetitions;
