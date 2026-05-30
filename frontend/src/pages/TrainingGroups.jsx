import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./TrainingGroups.module.css";

const ageCategories = [
  "poletarac",
  "pionir",
  "kadet",
  "junior",
  "senior",
  "mjesovita grupa",
];

const initialGroupForm = {
  name: "",
  age_category: "",
  coach_id: "",
  description: "",
};

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchCoaches() {
  const response = await axiosInstance.get("/coaches");

  return response.data;
}

function getCoachName(group) {
  if (!group.coach_first_name && !group.coach_last_name) {
    return "Bez trenera";
  }

  return `${group.coach_first_name || ""} ${group.coach_last_name || ""}`.trim();
}

function TrainingGroups() {
  const [trainingGroups, setTrainingGroups] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredGroups = trainingGroups.filter((group) => {
    const searchableText = [
      group.name,
      group.age_category,
      getCoachName(group),
      group.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  const groupsWithCoachCount = trainingGroups.filter(
    (group) => group.coach_id,
  ).length;

  const groupsWithoutCoachCount = trainingGroups.length - groupsWithCoachCount;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [groupsData, coachesData] = await Promise.all([
          fetchTrainingGroups(),
          fetchCoaches(),
        ]);

        if (isActive) {
          setTrainingGroups(groupsData);
          setCoaches(coachesData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message || "Could not load training groups.",
          );
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

  function handleFormChange(event) {
    const { name, value } = event.target;

    setGroupForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingGroupId(null);
    setGroupForm(initialGroupForm);
    setFormError("");
  }

  function openCreateForm() {
    setEditingGroupId(null);
    setGroupForm(initialGroupForm);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  function openEditForm(group) {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name || "",
      age_category: group.age_category || "",
      coach_id: group.coach_id || "",
      description: group.description || "",
    });
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  async function handleSubmitGroup(event) {
    event.preventDefault();

    setFormError("");
    setPageSuccess("");
    setIsSubmitting(true);

    const groupPayload = {
      name: groupForm.name,
      age_category: groupForm.age_category || null,
      coach_id: groupForm.coach_id || null,
      description: groupForm.description || null,
    };

    try {
      if (editingGroupId) {
        await axiosInstance.put(
          `/training-groups/${editingGroupId}`,
          groupPayload,
        );
        setPageSuccess("Training group updated successfully.");
      } else {
        await axiosInstance.post("/training-groups", groupPayload);
        setPageSuccess("Training group created successfully.");
      }

      setTrainingGroups(await fetchTrainingGroups());
      closeForm();
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Could not save training group.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGroup(group) {
    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete grupu ${group.name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/training-groups/${group.id}`);

      if (editingGroupId === group.id) {
        closeForm();
      }

      setTrainingGroups(await fetchTrainingGroups());
      setPageSuccess("Training group deleted successfully.");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Could not delete training group. It may be connected to members or trainings.",
      );
    }
  }

  return (
    <section className={styles.trainingGroupsPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Trening grupe</h1>
          <p>Pregled grupa, dodijeljenih trenera i uzrasnih kategorija.</p>
        </div>

        <button className={styles.addButton} onClick={openCreateForm} type="button">
          Dodaj grupu
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading groups...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          {isFormOpen && (
            <form className={styles.groupForm} onSubmit={handleSubmitGroup}>
              <div className={styles.formHeader}>
                <h2>{editingGroupId ? "Edit group" : "Add group"}</h2>
                <p>
                  {editingGroupId
                    ? "Update training group details."
                    : "Create a new training group and assign a coach."}
                </p>
              </div>

              <div className={styles.formGrid}>
                <label>
                  Naziv grupe
                  <input
                    name="name"
                    onChange={handleFormChange}
                    placeholder="npr. Pocetnici"
                    required
                    type="text"
                    value={groupForm.name}
                  />
                </label>

                <label>
                  Uzrasna kategorija
                  <select
                    name="age_category"
                    onChange={handleFormChange}
                    value={groupForm.age_category}
                  >
                    <option value="">Odaberi kategoriju</option>
                    {ageCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.fullWidthField}>
                  Trener
                  <select
                    name="coach_id"
                    onChange={handleFormChange}
                    value={groupForm.coach_id}
                  >
                    <option value="">Bez trenera</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.first_name} {coach.last_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.fullWidthField}>
                  Opis
                  <textarea
                    name="description"
                    onChange={handleFormChange}
                    placeholder="Kratak opis grupe..."
                    rows="4"
                    value={groupForm.description}
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
                    : editingGroupId
                      ? "Save changes"
                      : "Create group"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno grupa</span>
              <strong>{trainingGroups.length}</strong>
            </article>

            <article>
              <span>Grupe sa trenerom</span>
              <strong>{groupsWithCoachCount}</strong>
            </article>

            <article>
              <span>Grupe bez trenera</span>
              <strong>{groupsWithoutCoachCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Search training groups"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po nazivu grupe, uzrastu ili treneru..."
              type="search"
              value={searchTerm}
            />

            <span>
              Showing {filteredGroups.length} of {trainingGroups.length}
            </span>
          </div>

          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>Naziv grupe</th>
                  <th>Uzrasna kategorija</th>
                  <th>Trener</th>
                  <th>Broj clanova</th>
                  <th>Opis</th>
                  <th>Akcije</th>
                </tr>
              </thead>

              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <strong>{group.name}</strong>
                    </td>
                    <td>{group.age_category || "-"}</td>
                    <td>{getCoachName(group)}</td>
                    <td>-</td>
                    <td>{group.description || "-"}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditForm(group)}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteGroup(group)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredGroups.length === 0 && (
              <p className={styles.emptyTable}>No training groups found.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default TrainingGroups;
