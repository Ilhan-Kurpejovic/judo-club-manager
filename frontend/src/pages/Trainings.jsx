import { useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Trainings.module.css";

const initialTrainingForm = {
  training_group_id: "",
  training_date: "",
  start_time: "",
  end_time: "",
  location: "",
  description: "",
};

const scheduleFilters = [
  { label: "Svi", value: "all" },
  { label: "Buduci", value: "upcoming" },
  { label: "Prosli", value: "past" },
];

async function fetchTrainings() {
  const response = await axiosInstance.get("/trainings");

  return response.data;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

function formatDate(dateValue) {
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

function formatTime(timeValue) {
  if (!timeValue) {
    return "--:--";
  }

  return String(timeValue).slice(0, 5);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function Trainings() {
  const formRef = useRef(null);
  const [trainings, setTrainings] = useState([]);
  const [trainingGroups, setTrainingGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [trainingForm, setTrainingForm] = useState(initialTrainingForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDate = getTodayDate();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const sortedTrainings = useMemo(() => {
    return [...trainings].sort((firstTraining, secondTraining) => {
      const firstDate = normalizeDateForInput(firstTraining.training_date);
      const secondDate = normalizeDateForInput(secondTraining.training_date);
      const firstIsUpcoming = firstDate >= todayDate;
      const secondIsUpcoming = secondDate >= todayDate;

      if (firstIsUpcoming !== secondIsUpcoming) {
        return firstIsUpcoming ? -1 : 1;
      }

      if (firstDate !== secondDate) {
        return firstIsUpcoming
          ? firstDate.localeCompare(secondDate)
          : secondDate.localeCompare(firstDate);
      }

      const firstTime = String(firstTraining.start_time || "");
      const secondTime = String(secondTraining.start_time || "");

      return firstIsUpcoming
        ? firstTime.localeCompare(secondTime)
        : secondTime.localeCompare(firstTime);
    });
  }, [todayDate, trainings]);

  const filteredTrainings = sortedTrainings.filter((training) => {
    const trainingDate = normalizeDateForInput(training.training_date);
    const isUpcomingTraining = trainingDate >= todayDate;

    if (scheduleFilter === "upcoming" && !isUpcomingTraining) {
      return false;
    }

    if (scheduleFilter === "past" && isUpcomingTraining) {
      return false;
    }

    const searchableText = [
      training.training_group_name,
      training.age_category,
      training.location,
      training.description,
      trainingDate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  const upcomingTrainingsCount = trainings.filter((training) => {
    return normalizeDateForInput(training.training_date) >= todayDate;
  }).length;

  const pastTrainingsCount = trainings.length - upcomingTrainingsCount;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [trainingsData, groupsData] = await Promise.all([
          fetchTrainings(),
          fetchTrainingGroups(),
        ]);

        if (isActive) {
          setTrainings(trainingsData);
          setTrainingGroups(groupsData);
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Could not load trainings.");
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
  }, []);

  useEffect(() => {
    if (isFormOpen && editingTrainingId) {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [editingTrainingId, isFormOpen]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setTrainingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingTrainingId(null);
    setTrainingForm(initialTrainingForm);
    setFormError("");
  }

  function openCreateForm() {
    setEditingTrainingId(null);
    setTrainingForm(initialTrainingForm);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  function openEditForm(training) {
    setEditingTrainingId(training.id);
    setTrainingForm({
      training_group_id: training.training_group_id || "",
      training_date: normalizeDateForInput(training.training_date),
      start_time: formatTime(training.start_time),
      end_time: formatTime(training.end_time),
      location: training.location || "",
      description: training.description || "",
    });
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  async function handleSubmitTraining(event) {
    event.preventDefault();

    setFormError("");
    setPageSuccess("");
    setIsSubmitting(true);

    if (trainingForm.end_time <= trainingForm.start_time) {
      setFormError("Vrijeme zavrsetka mora biti poslije vremena pocetka.");
      setIsSubmitting(false);
      return;
    }

    const trainingPayload = {
      training_group_id: trainingForm.training_group_id,
      training_date: trainingForm.training_date,
      start_time: trainingForm.start_time,
      end_time: trainingForm.end_time,
      location: trainingForm.location || null,
      description: trainingForm.description || null,
    };

    try {
      if (editingTrainingId) {
        await axiosInstance.put(`/trainings/${editingTrainingId}`, trainingPayload);
        setPageSuccess("Training updated successfully.");
      } else {
        await axiosInstance.post("/trainings", trainingPayload);
        setPageSuccess("Training created successfully.");
      }

      setTrainings(await fetchTrainings());
      closeForm();
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not save training.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTraining(training) {
    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete trening za ${training.training_group_name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/trainings/${training.id}`);

      if (editingTrainingId === training.id) {
        closeForm();
      }

      setTrainings(await fetchTrainings());
      setPageSuccess("Training deleted successfully.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not delete training.");
    }
  }

  return (
    <section className={styles.trainingsPage}>
      <div className={styles.heroPanel}>
        <div>
          <span className={styles.accentLine}></span>
          <h1>Treninzi</h1>
          <p>
            Raspored termina po trening grupama, lokacijama i vremenu odrzavanja.
          </p>
        </div>

        <button className={styles.addButton} onClick={openCreateForm} type="button">
          Dodaj trening
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading trainings...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          <div className={styles.overviewGrid}>
            <article>
              <span>Ukupno treninga</span>
              <strong>{trainings.length}</strong>
            </article>

            <article>
              <span>Buduci termini</span>
              <strong>{upcomingTrainingsCount}</strong>
            </article>

            <article>
              <span>Zavrseni termini</span>
              <strong>{pastTrainingsCount}</strong>
            </article>
          </div>

          {isFormOpen && (
            <form
              className={styles.trainingForm}
              onSubmit={handleSubmitTraining}
              ref={formRef}
            >
              <div className={styles.formHeader}>
                <h2>{editingTrainingId ? "Edit training" : "Add training"}</h2>
                <p>
                  {editingTrainingId
                    ? "Update date, time and location for this training."
                    : "Create a scheduled session for one training group."}
                </p>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.fullWidthField}>
                  Trening grupa
                  <select
                    name="training_group_id"
                    onChange={handleFormChange}
                    required
                    value={trainingForm.training_group_id}
                  >
                    <option value="">Odaberi trening grupu</option>
                    {trainingGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} {group.age_category ? `- ${group.age_category}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Datum
                  <input
                    name="training_date"
                    onChange={handleFormChange}
                    required
                    type="date"
                    value={trainingForm.training_date}
                  />
                </label>

                <label>
                  Lokacija
                  <input
                    name="location"
                    onChange={handleFormChange}
                    placeholder="npr. Sala 1"
                    type="text"
                    value={trainingForm.location}
                  />
                </label>

                <label>
                  Pocetak
                  <input
                    name="start_time"
                    onChange={handleFormChange}
                    required
                    type="time"
                    value={trainingForm.start_time}
                  />
                </label>

                <label>
                  Kraj
                  <input
                    name="end_time"
                    onChange={handleFormChange}
                    required
                    type="time"
                    value={trainingForm.end_time}
                  />
                </label>

                <label className={styles.fullWidthField}>
                  Opis
                  <textarea
                    name="description"
                    onChange={handleFormChange}
                    placeholder="Kratka napomena za trening..."
                    rows="4"
                    value={trainingForm.description}
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
                    : editingTrainingId
                      ? "Save changes"
                      : "Create training"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.scheduleToolbar}>
            <div>
              <h2>Raspored</h2>
              <p>Pregled termina kroz kartice, sortirano po datumu i vremenu.</p>
            </div>

            <div className={styles.scheduleControls}>
              <div className={styles.filterGroup} aria-label="Filter trainings">
                {scheduleFilters.map((filter) => (
                  <button
                    className={
                      scheduleFilter === filter.value
                        ? styles.activeFilterButton
                        : styles.filterButton
                    }
                    key={filter.value}
                    onClick={() => setScheduleFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <input
                aria-label="Search trainings"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pretraga po grupi, datumu, lokaciji..."
                type="search"
                value={searchTerm}
              />
            </div>
          </div>

          <div className={styles.timelineGrid}>
            {filteredTrainings.map((training) => {
              const normalizedDate = normalizeDateForInput(training.training_date);
              const isPastTraining = normalizedDate < todayDate;

              return (
                <article className={styles.trainingCard} key={training.id}>
                  <div className={styles.dateBlock}>
                    <span>{formatDate(training.training_date)}</span>
                    <strong>
                      {formatTime(training.start_time)} - {formatTime(training.end_time)}
                    </strong>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <div>
                        <h3>{training.training_group_name || "Bez grupe"}</h3>
                        <p>{training.age_category || "Bez kategorije"}</p>
                      </div>

                      <span
                        className={
                          isPastTraining
                            ? styles.statusFinished
                            : styles.statusUpcoming
                        }
                      >
                        {isPastTraining ? "Zavrseno" : "Predstoji"}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      <span>{training.location || "Lokacija nije unijeta"}</span>
                    </div>

                    {training.description && (
                      <p className={styles.description}>{training.description}</p>
                    )}

                    <div className={styles.cardActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditForm(training)}
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteTraining(training)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredTrainings.length === 0 && (
            <p className={styles.emptyTable}>No trainings found.</p>
          )}
        </>
      )}
    </section>
  );
}

export default Trainings;
