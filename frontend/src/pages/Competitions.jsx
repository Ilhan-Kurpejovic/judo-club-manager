import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axiosInstance from "../api/axiosInstance";
import styles from "./Competitions.module.css";

const initialCompetitionForm = {
  name: "",
  city: "",
  country: "",
  competition_date: "",
  organizer: "",
};

const competitionFilters = [
  { label: "Sva", value: "all" },
  { label: "Buduca", value: "upcoming" },
  { label: "Prosla", value: "past" },
];

const ageCategories = ["poletarac", "pionir", "kadet", "junior", "senior"];

async function fetchCompetitions() {
  const response = await axiosInstance.get("/competitions");

  return response.data;
}

async function fetchAllowedCategories(competitionId) {
  const response = await axiosInstance.get(
    `/competition-allowed-categories/competition/${competitionId}`,
  );

  return response.data;
}

async function fetchCompetitionApplications(competitionId) {
  const response = await axiosInstance.get(
    `/competition-applications/competition/${competitionId}`,
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
  return new Date().toISOString().slice(0, 10);
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

function getApplicationStatusClass(status) {
  if (status === "odobreno") {
    return styles.applicationStatusApproved;
  }

  if (status === "odbijeno") {
    return styles.applicationStatusRejected;
  }

  return styles.applicationStatusPending;
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function createSafeFileName(value) {
  return String(value || "takmicenje")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Competitions() {
  const [competitions, setCompetitions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetitionId, setEditingCompetitionId] = useState(null);
  const [competitionForm, setCompetitionForm] = useState(initialCompetitionForm);
  const [openCategoriesCompetitionId, setOpenCategoriesCompetitionId] =
    useState(null);
  const [openApplicationsCompetitionId, setOpenApplicationsCompetitionId] =
    useState(null);
  const [categoriesByCompetitionId, setCategoriesByCompetitionId] = useState({});
  const [applicationsByCompetitionId, setApplicationsByCompetitionId] = useState(
    {},
  );
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [isApplicationSaving, setIsApplicationSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDate = getTodayDate();

  const sortedCompetitions = useMemo(() => {
    return [...competitions].sort((firstCompetition, secondCompetition) => {
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
    });
  }, [competitions, todayDate]);

  const filteredCompetitions = sortedCompetitions.filter((competition) => {
    const competitionDate = normalizeDateForInput(competition.competition_date);
    const isUpcomingCompetition = competitionDate >= todayDate;

    if (statusFilter === "upcoming" && !isUpcomingCompetition) {
      return false;
    }

    if (statusFilter === "past" && isUpcomingCompetition) {
      return false;
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

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

  const upcomingCompetitionsCount = competitions.filter((competition) => {
    return normalizeDateForInput(competition.competition_date) >= todayDate;
  }).length;

  const pastCompetitionsCount = competitions.length - upcomingCompetitionsCount;
  const selectedApplicationsCompetition = competitions.find(
    (competition) => competition.id === openApplicationsCompetitionId,
  );

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
          setError(error.response?.data?.message || "Could not load competitions.");
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
        setOpenApplicationsCompetitionId(null);
      }
    }

    if (openApplicationsCompetitionId) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [openApplicationsCompetitionId]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setCompetitionForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingCompetitionId(null);
    setCompetitionForm(initialCompetitionForm);
    setFormError("");
  }

  function openCreateForm() {
    setEditingCompetitionId(null);
    setCompetitionForm(initialCompetitionForm);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  function openEditForm(competition) {
    setEditingCompetitionId(competition.id);
    setCompetitionForm({
      name: competition.name || "",
      city: competition.city || "",
      country: competition.country || "",
      competition_date: normalizeDateForInput(competition.competition_date),
      organizer: competition.organizer || "",
    });
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  async function handleSubmitCompetition(event) {
    event.preventDefault();

    setFormError("");
    setPageSuccess("");
    setIsSubmitting(true);

    const competitionPayload = {
      name: competitionForm.name,
      city: competitionForm.city || null,
      country: competitionForm.country || null,
      competition_date: competitionForm.competition_date,
      organizer: competitionForm.organizer || null,
    };

    try {
      if (editingCompetitionId) {
        await axiosInstance.put(
          `/competitions/${editingCompetitionId}`,
          competitionPayload,
        );
        setPageSuccess("Competition updated successfully.");
      } else {
        await axiosInstance.post("/competitions", competitionPayload);
        setPageSuccess("Competition created successfully.");
      }

      setCompetitions(await fetchCompetitions());
      closeForm();
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Could not save competition.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCompetition(competition) {
    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete takmicenje ${competition.name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/competitions/${competition.id}`);

      if (editingCompetitionId === competition.id) {
        closeForm();
      }

      setCompetitions(await fetchCompetitions());
      setPageSuccess("Competition deleted successfully.");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Could not delete competition. It may be connected to categories, applications or results.",
      );
    }
  }

  async function loadCategoriesForCompetition(competitionId) {
    const categories = await fetchAllowedCategories(competitionId);

    setCategoriesByCompetitionId((currentCategories) => ({
      ...currentCategories,
      [competitionId]: categories,
    }));
  }

  async function loadApplicationsForCompetition(competitionId) {
    const applications = await fetchCompetitionApplications(competitionId);

    setApplicationsByCompetitionId((currentApplications) => ({
      ...currentApplications,
      [competitionId]: applications,
    }));
  }

  function updateApplicationInState(competitionId, applicationId, updates) {
    setApplicationsByCompetitionId((currentApplications) => ({
      ...currentApplications,
      [competitionId]: (currentApplications[competitionId] || []).map(
        (application) =>
          application.id === applicationId
            ? { ...application, ...updates }
            : application,
      ),
    }));
  }

  async function toggleCategoriesPanel(competitionId) {
    setCategoryError("");
    setPageSuccess("");

    if (openCategoriesCompetitionId === competitionId) {
      setOpenCategoriesCompetitionId(null);
      return;
    }

    setOpenCategoriesCompetitionId(competitionId);

    if (!categoriesByCompetitionId[competitionId]) {
      try {
        await loadCategoriesForCompetition(competitionId);
      } catch (error) {
        setCategoryError(
          error.response?.data?.message || "Could not load categories.",
        );
      }
    }
  }

  async function toggleApplicationsPanel(competitionId) {
    setApplicationError("");
    setPageSuccess("");

    if (openApplicationsCompetitionId === competitionId) {
      setOpenApplicationsCompetitionId(null);
      return;
    }

    setOpenApplicationsCompetitionId(competitionId);

    if (!applicationsByCompetitionId[competitionId]) {
      try {
        await loadApplicationsForCompetition(competitionId);
      } catch (error) {
        setApplicationError(
          error.response?.data?.message || "Could not load applications.",
        );
      }
    }
  }

  function closeApplicationsModal() {
    setOpenApplicationsCompetitionId(null);
    setApplicationError("");
  }

  function handleCategoryDraftChange(competitionId, value) {
    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [competitionId]: value,
    }));
  }

  async function handleAddCategory(competitionId) {
    const selectedCategory = categoryDrafts[competitionId];

    if (!selectedCategory) {
      setCategoryError("Odaberi uzrasnu kategoriju.");
      return;
    }

    setIsCategorySaving(true);
    setCategoryError("");
    setPageSuccess("");

    try {
      await axiosInstance.post("/competition-allowed-categories", {
        competition_id: competitionId,
        age_category: selectedCategory,
      });

      await loadCategoriesForCompetition(competitionId);
      handleCategoryDraftChange(competitionId, "");
      setPageSuccess("Category added successfully.");
    } catch (error) {
      setCategoryError(error.response?.data?.message || "Could not add category.");
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleDeleteCategory(competitionId, categoryId) {
    setIsCategorySaving(true);
    setCategoryError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/competition-allowed-categories/${categoryId}`);

      await loadCategoriesForCompetition(competitionId);
      setPageSuccess("Category removed successfully.");
    } catch (error) {
      setCategoryError(
        error.response?.data?.message || "Could not remove category.",
      );
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleUpdateApplicationStatus(
    competitionId,
    application,
    status,
  ) {
    setIsApplicationSaving(true);
    setApplicationError("");
    setPageSuccess("");

    try {
      await axiosInstance.put(`/competition-applications/${application.id}/status`, {
        status,
        note: application.note || null,
      });

      updateApplicationInState(competitionId, application.id, { status });
      await loadApplicationsForCompetition(competitionId);
      setPageSuccess("Application status updated successfully.");
    } catch (error) {
      setApplicationError(
        error.response?.data?.message || "Could not update application status.",
      );
    } finally {
      setIsApplicationSaving(false);
    }
  }

  async function handleDeleteApplication(competitionId, application) {
    const memberName = `${application.member_first_name || ""} ${
      application.member_last_name || ""
    }`.trim();

    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete prijavu za ${memberName}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsApplicationSaving(true);
    setApplicationError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/competition-applications/${application.id}`);

      await loadApplicationsForCompetition(competitionId);
      setPageSuccess("Application deleted successfully.");
    } catch (error) {
      setApplicationError(
        error.response?.data?.message || "Could not delete application.",
      );
    } finally {
      setIsApplicationSaving(false);
    }
  }

  function exportApplicationsCsv(competition) {
    const applications = applicationsByCompetitionId[competition.id] || [];

    if (applications.length === 0) {
      setApplicationError("Nema prijava za export.");
      return;
    }

    const rows = [
      [
        "Ime",
        "Prezime",
        "Pojas",
        "Tezinska kategorija",
        "Status",
        "Napomena",
        "Takmicenje",
        "Datum takmicenja",
      ],
      ...applications.map((application) => [
        application.member_first_name || "",
        application.member_last_name || "",
        application.belt || "",
        application.weight_category || "",
        application.status || "na cekanju",
        application.note || "",
        competition.name || "",
        normalizeDateForInput(competition.competition_date),
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${createSafeFileName(competition.name)}-prijave.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.competitionsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Takmicenja</h1>
          <p>Pregled turnira, lokacija, organizatora i datuma odrzavanja.</p>
        </div>

        <button className={styles.addButton} onClick={openCreateForm} type="button">
          Dodaj takmicenje
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading competitions...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}
          {categoryError && <p className={styles.categoryError}>{categoryError}</p>}
          {applicationError && (
            <p className={styles.applicationError}>{applicationError}</p>
          )}

          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno takmicenja</span>
              <strong>{competitions.length}</strong>
            </article>

            <article>
              <span>Buduca</span>
              <strong>{upcomingCompetitionsCount}</strong>
            </article>

            <article>
              <span>Prosla</span>
              <strong>{pastCompetitionsCount}</strong>
            </article>
          </div>

          {isFormOpen && (
            <form
              className={styles.competitionForm}
              onSubmit={handleSubmitCompetition}
            >
              <div className={styles.formHeader}>
                <h2>
                  {editingCompetitionId
                    ? "Edit competition"
                    : "Add competition"}
                </h2>
                <p>
                  {editingCompetitionId
                    ? "Update basic competition details."
                    : "Create a new competition record."}
                </p>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.fullWidthField}>
                  Naziv takmicenja
                  <input
                    name="name"
                    onChange={handleFormChange}
                    placeholder="npr. Montenegro Open"
                    required
                    type="text"
                    value={competitionForm.name}
                  />
                </label>

                <label>
                  Datum
                  <input
                    name="competition_date"
                    onChange={handleFormChange}
                    required
                    type="date"
                    value={competitionForm.competition_date}
                  />
                </label>

                <label>
                  Organizator
                  <input
                    name="organizer"
                    onChange={handleFormChange}
                    placeholder="npr. Judo savez"
                    type="text"
                    value={competitionForm.organizer}
                  />
                </label>

                <label>
                  Grad
                  <input
                    name="city"
                    onChange={handleFormChange}
                    placeholder="npr. Podgorica"
                    type="text"
                    value={competitionForm.city}
                  />
                </label>

                <label>
                  Drzava
                  <input
                    name="country"
                    onChange={handleFormChange}
                    placeholder="npr. Crna Gora"
                    type="text"
                    value={competitionForm.country}
                  />
                </label>
              </div>

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.formActions}>
                <button
                  className={styles.cancelButton}
                  onClick={closeForm}
                  type="button"
                >
                  Cancel
                </button>

                <button disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? "Saving..."
                    : editingCompetitionId
                      ? "Save changes"
                      : "Create competition"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.toolbar}>
            <div className={styles.filterGroup} aria-label="Filter competitions">
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
              aria-label="Search competitions"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po nazivu, gradu, drzavi ili organizatoru..."
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
                    <strong>
                      {isUpcomingCompetition ? "Buduce" : "Proslo"}
                    </strong>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2>{competition.name}</h2>
                        <p>{getLocation(competition) || "Lokacija nije unijeta"}</p>
                      </div>

                      <span
                        className={
                          isUpcomingCompetition
                            ? styles.statusUpcoming
                            : styles.statusPast
                        }
                      >
                        {isUpcomingCompetition ? "Predstoji" : "Zavrseno"}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      <span>Organizator</span>
                      <strong>{competition.organizer || "-"}</strong>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.applicationsButton}
                        onClick={() => toggleApplicationsPanel(competition.id)}
                        type="button"
                      >
                        Prijave
                      </button>

                      <button
                        className={styles.categoriesButton}
                        onClick={() => toggleCategoriesPanel(competition.id)}
                        type="button"
                      >
                        Kategorije
                      </button>

                      <button
                        className={styles.editButton}
                        onClick={() => openEditForm(competition)}
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteCompetition(competition)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>

                    {openCategoriesCompetitionId === competition.id && (
                      <div className={styles.categoriesPanel}>
                        <div className={styles.categoriesHeader}>
                          <div>
                            <h3>Dozvoljene kategorije</h3>
                            <p>
                              Clan se moze prijaviti samo ako pripada jednoj od
                              ovih kategorija.
                            </p>
                          </div>
                        </div>

                        <div className={styles.categoryBadges}>
                          {(categoriesByCompetitionId[competition.id] || []).map(
                            (category) => (
                              <span
                                className={styles.categoryBadge}
                                key={category.id}
                              >
                                {category.age_category}
                                <button
                                  disabled={isCategorySaving}
                                  onClick={() =>
                                    handleDeleteCategory(
                                      competition.id,
                                      category.id,
                                    )
                                  }
                                  type="button"
                                >
                                  x
                                </button>
                              </span>
                            ),
                          )}

                          {(categoriesByCompetitionId[competition.id] || [])
                            .length === 0 && (
                            <p className={styles.emptyCategories}>
                              Nema dodatih kategorija.
                            </p>
                          )}
                        </div>

                        <div className={styles.categoryForm}>
                          <select
                            onChange={(event) =>
                              handleCategoryDraftChange(
                                competition.id,
                                event.target.value,
                              )
                            }
                            value={categoryDrafts[competition.id] || ""}
                          >
                            <option value="">Odaberi kategoriju</option>
                            {ageCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>

                          <button
                            disabled={isCategorySaving}
                            onClick={() => handleAddCategory(competition.id)}
                            type="button"
                          >
                            Dodaj kategoriju
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {filteredCompetitions.length === 0 && (
            <p className={styles.emptyTable}>No competitions found.</p>
          )}

          {selectedApplicationsCompetition &&
            createPortal(
              <div
                className={styles.modalBackdrop}
                onClick={closeApplicationsModal}
                role="presentation"
              >
                <div
                  aria-labelledby="applications-modal-title"
                  aria-modal="true"
                  className={styles.applicationsModal}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                >
                  <div className={styles.modalHeader}>
                    <div>
                      <span>Prijave takmicara</span>
                      <h2 id="applications-modal-title">
                        {selectedApplicationsCompetition.name}
                      </h2>
                      <p>
                        {getLocation(selectedApplicationsCompetition) ||
                          "Lokacija nije unijeta"}{" "}
                        /{" "}
                        {formatCompetitionDate(
                          selectedApplicationsCompetition.competition_date,
                        )}
                      </p>
                    </div>

                    <button
                      className={styles.closeModalButton}
                      onClick={closeApplicationsModal}
                      type="button"
                    >
                      x
                    </button>
                  </div>

                  <div className={styles.applicationsList}>
                    {(
                      applicationsByCompetitionId[
                        selectedApplicationsCompetition.id
                      ] || []
                    ).map((application) => (
                      <article
                        className={styles.applicationItem}
                        key={application.id}
                      >
                        <div>
                          <strong>
                            {application.member_first_name}{" "}
                            {application.member_last_name}
                          </strong>
                          <span>
                            {application.belt || "bez pojasa"} /{" "}
                            {application.weight_category ||
                              "bez tezinske kategorije"}
                          </span>
                          {application.note && <p>{application.note}</p>}
                        </div>

                        <div className={styles.applicationActions}>
                          <span
                            className={`${styles.applicationStatus} ${getApplicationStatusClass(
                              application.status,
                            )}`}
                          >
                            {application.status || "na cekanju"}
                          </span>

                          <button
                            className={styles.approveButton}
                            disabled={
                              isApplicationSaving ||
                              application.status === "odobreno"
                            }
                            onClick={() =>
                              handleUpdateApplicationStatus(
                                selectedApplicationsCompetition.id,
                                application,
                                "odobreno",
                              )
                            }
                            type="button"
                          >
                            {application.status === "odobreno"
                              ? "Odobreno"
                              : "Odobri"}
                          </button>

                          <button
                            className={styles.rejectButton}
                            disabled={
                              isApplicationSaving ||
                              application.status === "odbijeno"
                            }
                            onClick={() =>
                              handleUpdateApplicationStatus(
                                selectedApplicationsCompetition.id,
                                application,
                                "odbijeno",
                              )
                            }
                            type="button"
                          >
                            {application.status === "odbijeno"
                              ? "Odbijeno"
                              : "Odbij"}
                          </button>

                          <button
                            className={styles.deleteApplicationButton}
                            disabled={isApplicationSaving}
                            onClick={() =>
                              handleDeleteApplication(
                                selectedApplicationsCompetition.id,
                                application,
                              )
                            }
                            type="button"
                          >
                            Obrisi
                          </button>
                        </div>
                      </article>
                    ))}

                    {(
                      applicationsByCompetitionId[
                        selectedApplicationsCompetition.id
                      ] || []
                    ).length === 0 && (
                      <p className={styles.emptyApplications}>
                        Nema prijava za ovo takmicenje.
                      </p>
                    )}
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      className={styles.exportButton}
                      onClick={() =>
                        exportApplicationsCsv(selectedApplicationsCompetition)
                      }
                      type="button"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </>
      )}
    </section>
  );
}

export default Competitions;
