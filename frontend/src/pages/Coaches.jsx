import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Coaches.module.css";

const initialCoachForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  specialization: "",
  login_email: "",
  initial_password: "",
  user_id: "",
};

async function fetchCoaches() {
  const response = await axiosInstance.get("/coaches");

  return response.data;
}

function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const [coachForm, setCoachForm] = useState(initialCoachForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredCoaches = coaches.filter((coach) => {
    const searchableText = [
      coach.first_name,
      coach.last_name,
      coach.email,
      coach.phone,
      coach.specialization,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  const coachesWithSpecializationCount = coaches.filter(
    (coach) => coach.specialization,
  ).length;

  const coachesWithoutPhoneCount = coaches.filter(
    (coach) => !coach.phone,
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadCoaches() {
      try {
        const coachesData = await fetchCoaches();

        if (isActive) {
          setCoaches(coachesData);
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Could not load coaches.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCoaches();

    return () => {
      isActive = false;
    };
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setCoachForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingCoachId(null);
    setCoachForm(initialCoachForm);
    setFormError("");
  }

  function toggleCreateForm() {
    if (isFormOpen && !editingCoachId) {
      closeForm();
      return;
    }

    setCoachForm(initialCoachForm);
    setEditingCoachId(null);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  function startEditingCoach(coach) {
    setCoachForm({
      first_name: coach.first_name || "",
      last_name: coach.last_name || "",
      phone: coach.phone || "",
      email: coach.email || "",
      specialization: coach.specialization || "",
      login_email: "",
      initial_password: "",
      user_id: coach.user_id || "",
    });

    setEditingCoachId(coach.id);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  async function handleSubmitCoach(event) {
    event.preventDefault();

    setFormError("");
    setPageSuccess("");
    setIsSubmitting(true);

    try {
      if (editingCoachId) {
        await axiosInstance.put(`/coaches/${editingCoachId}`, {
          first_name: coachForm.first_name,
          last_name: coachForm.last_name,
          phone: coachForm.phone || null,
          email: coachForm.email || null,
          specialization: coachForm.specialization || null,
          user_id: coachForm.user_id || null,
        });

        setPageSuccess("Coach updated successfully.");
      } else {
        await axiosInstance.post("/coaches", {
          first_name: coachForm.first_name,
          last_name: coachForm.last_name,
          phone: coachForm.phone || null,
          email: coachForm.email || null,
          specialization: coachForm.specialization || null,
          login_email: coachForm.login_email,
          initial_password: coachForm.initial_password,
        });

        setPageSuccess("Coach created successfully.");
      }

      setCoachForm(initialCoachForm);
      setEditingCoachId(null);
      setCoaches(await fetchCoaches());
      setIsFormOpen(false);
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not save coach.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCoach(coach) {
    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete trenera ${coach.first_name} ${coach.last_name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/coaches/${coach.id}`);

      if (editingCoachId === coach.id) {
        closeForm();
      }

      setCoaches(await fetchCoaches());
      setPageSuccess("Coach deleted successfully.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not delete coach.");
    }
  }

  return (
    <section className={styles.coachesPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Treneri</h1>
          <p>Pregled trenera, specijalizacija i osnovnih kontakt podataka.</p>
        </div>

        <button
          className={styles.addButton}
          onClick={isFormOpen ? closeForm : toggleCreateForm}
          type="button"
        >
          {isFormOpen ? "Close form" : "Add coach"}
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading coaches...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          {isFormOpen && (
            <form className={styles.coachForm} onSubmit={handleSubmitCoach}>
              <div className={styles.formHeader}>
                <h2>{editingCoachId ? "Edit coach" : "Add coach"}</h2>
                <p>
                  {editingCoachId
                    ? "Update coach profile details."
                    : "Create a coach profile and initial login account."}
                </p>
              </div>

              <div className={styles.formGrid}>
                <label>
                  First name
                  <input
                    name="first_name"
                    onChange={handleFormChange}
                    required
                    type="text"
                    value={coachForm.first_name}
                  />
                </label>

                <label>
                  Last name
                  <input
                    name="last_name"
                    onChange={handleFormChange}
                    required
                    type="text"
                    value={coachForm.last_name}
                  />
                </label>

                {!editingCoachId && (
                  <>
                    <label>
                      Login email
                      <input
                        name="login_email"
                        onChange={handleFormChange}
                        required
                        type="email"
                        value={coachForm.login_email}
                      />
                    </label>

                    <label>
                      Initial password
                      <input
                        name="initial_password"
                        onChange={handleFormChange}
                        required
                        type="password"
                        value={coachForm.initial_password}
                      />
                    </label>
                  </>
                )}

                <label>
                  Contact email
                  <input
                    name="email"
                    onChange={handleFormChange}
                    type="email"
                    value={coachForm.email}
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    onChange={handleFormChange}
                    type="tel"
                    value={coachForm.phone}
                  />
                </label>

                <label className={styles.fullWidthField}>
                  Specialization
                  <input
                    name="specialization"
                    onChange={handleFormChange}
                    placeholder="npr. tehnika, kondicija, djeciji uzrast"
                    type="text"
                    value={coachForm.specialization}
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
                    : editingCoachId
                      ? "Save changes"
                      : "Create coach"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.summaryGrid}>
            <article>
              <span>Total coaches</span>
              <strong>{coaches.length}</strong>
            </article>

            <article>
              <span>Specialized</span>
              <strong>{coachesWithSpecializationCount}</strong>
            </article>

            <article>
              <span>Without phone</span>
              <strong>{coachesWithoutPhoneCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Search coaches"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, phone or specialization..."
              type="search"
              value={searchTerm}
            />

            <span>
              Showing {filteredCoaches.length} of {coaches.length}
            </span>
          </div>

          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>Ime i prezime</th>
                  <th>Specijalizacija</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Akcije</th>
                </tr>
              </thead>

              <tbody>
                {filteredCoaches.map((coach) => (
                  <tr key={coach.id}>
                    <td>
                      <strong>
                        {coach.first_name} {coach.last_name}
                      </strong>
                    </td>
                    <td>{coach.specialization || "-"}</td>
                    <td>{coach.email || "-"}</td>
                    <td>{coach.phone || "-"}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => startEditingCoach(coach)}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteCoach(coach)}
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

            {filteredCoaches.length === 0 && (
              <p className={styles.emptyTable}>No coaches found.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Coaches;
