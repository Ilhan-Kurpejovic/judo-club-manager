import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Members.module.css";

const initialMemberForm = {
  first_name: "",
  last_name: "",
  login_email: "",
  initial_password: "",
  date_of_birth: "",
  gender: "",
  age_category: "",
  belt: "",
  weight_category: "",
  email: "",
  phone: "",
  parent_phone: "",
  address: "",
  training_group_id: "",
  status: "aktivan",
};

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

function normalizeOptionalValue(value) {
  return value === "" ? null : value;
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function Members() {
  const [members, setMembers] = useState([]);
  const [trainingGroups, setTrainingGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredMembers = members.filter((member) => {
    const searchableText = [
      member.first_name,
      member.last_name,
      member.email,
      member.phone,
      member.parent_phone,
      member.training_group_name,
      member.age_category,
      member.belt,
      member.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });
  const activeMembersCount = members.filter(
    (member) => member.status === "aktivan",
  ).length;
  const membersWithoutGroupCount = members.filter(
    (member) => !member.training_group_name,
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [membersData, trainingGroupsData] = await Promise.all([
          fetchMembers(),
          fetchTrainingGroups(),
        ]);

        if (isActive) {
          setMembers(membersData);
          setTrainingGroups(trainingGroupsData);
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Could not load members.");
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

    setMemberForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleCreateMember(event) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");
    setIsSubmitting(true);

    try {
      await axiosInstance.post("/members", {
        ...memberForm,
        date_of_birth: normalizeOptionalValue(memberForm.date_of_birth),
        gender: normalizeOptionalValue(memberForm.gender),
        age_category: normalizeOptionalValue(memberForm.age_category),
        belt: normalizeOptionalValue(memberForm.belt),
        weight_category: normalizeOptionalValue(memberForm.weight_category),
        parent_phone: normalizeOptionalValue(memberForm.parent_phone),
        address: normalizeOptionalValue(memberForm.address),
        photo: null,
        training_group_id: normalizeOptionalValue(memberForm.training_group_id),
        status: memberForm.status || "aktivan",
      });

      setMemberForm(initialMemberForm);
      setMembers(await fetchMembers());
      setPageSuccess("Member created successfully.");
      setIsFormOpen(false);
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not create member.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateForm() {
    setEditingMember(null);
    setMemberForm(initialMemberForm);
    setFormError("");
    setFormSuccess("");
    setPageSuccess("");
    setIsFormOpen((isOpen) => !isOpen);
  }

  function openEditForm(member) {
    setEditingMember(member);
    setMemberForm({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      login_email: "",
      initial_password: "",
      date_of_birth: formatDateForInput(member.date_of_birth),
      gender: member.gender || "",
      age_category: member.age_category || "",
      belt: member.belt || "",
      weight_category: member.weight_category || "",
      email: member.email || "",
      phone: member.phone || "",
      parent_phone: member.parent_phone || "",
      address: member.address || "",
      training_group_id: member.training_group_id
        ? String(member.training_group_id)
        : "",
      status: member.status || "aktivan",
    });
    setFormError("");
    setFormSuccess("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingMember(null);
    setMemberForm(initialMemberForm);
    setFormError("");
    setFormSuccess("");
  }

  async function handleUpdateMember(event) {
    event.preventDefault();

    if (!editingMember) {
      return;
    }

    setFormError("");
    setFormSuccess("");
    setPageSuccess("");
    setIsSubmitting(true);

    try {
      await axiosInstance.put(`/members/${editingMember.id}`, {
        first_name: memberForm.first_name,
        last_name: memberForm.last_name,
        date_of_birth: normalizeOptionalValue(memberForm.date_of_birth),
        gender: normalizeOptionalValue(memberForm.gender),
        belt: normalizeOptionalValue(memberForm.belt),
        weight_category: normalizeOptionalValue(memberForm.weight_category),
        phone: memberForm.phone || null,
        parent_phone: normalizeOptionalValue(memberForm.parent_phone),
        email: memberForm.email || null,
        address: normalizeOptionalValue(memberForm.address),
        photo: editingMember.photo || null,
        training_group_id: normalizeOptionalValue(memberForm.training_group_id),
        user_id: editingMember.user_id || null,
        status: memberForm.status || "aktivan",
        age_category: normalizeOptionalValue(memberForm.age_category),
      });

      setMembers(await fetchMembers());
      setPageSuccess("Member updated successfully.");
      setIsFormOpen(false);
      setEditingMember(null);
      setMemberForm(initialMemberForm);
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not update member.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMember(member) {
    const shouldDelete = window.confirm(
      `Delete member ${member.first_name} ${member.last_name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await axiosInstance.delete(`/members/${member.id}`);
      setMembers(await fetchMembers());
      setPageSuccess("Member deleted successfully.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not delete member.");
    }
  }

  return (
    <section className={styles.membersPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <div>
          <h1>Clanovi</h1>
          <p>Pregled clanova kluba, trening grupa i osnovnih kontakt podataka.</p>
        </div>
        <button
          className={styles.addButton}
          onClick={isFormOpen ? closeForm : openCreateForm}
          type="button"
        >
          {isFormOpen ? "Close form" : "Add member"}
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading members...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && (
            <p className={styles.pageSuccess}>{pageSuccess}</p>
          )}

          {isFormOpen && (
            <form
              className={styles.memberForm}
              onSubmit={editingMember ? handleUpdateMember : handleCreateMember}
            >
              <div className={styles.formHeader}>
                <h2>{editingMember ? "Edit member" : "Add member"}</h2>
                <p>
                  {editingMember
                    ? "Update member profile details."
                    : "Create a member profile and initial login account."}
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
                    value={memberForm.first_name}
                  />
                </label>

                <label>
                  Last name
                  <input
                    name="last_name"
                    onChange={handleFormChange}
                    required
                    type="text"
                    value={memberForm.last_name}
                  />
                </label>

                {!editingMember && (
                  <>
                    <label>
                      Login email
                      <input
                        name="login_email"
                        onChange={handleFormChange}
                        required
                        type="email"
                        value={memberForm.login_email}
                      />
                    </label>

                    <label>
                      Initial password
                      <input
                        name="initial_password"
                        onChange={handleFormChange}
                        required
                        type="password"
                        value={memberForm.initial_password}
                      />
                    </label>
                  </>
                )}

                <label>
                  Date of birth
                  <input
                    name="date_of_birth"
                    onChange={handleFormChange}
                    type="date"
                    value={memberForm.date_of_birth}
                  />
                </label>

                <label>
                  Gender
                  <select
                    name="gender"
                    onChange={handleFormChange}
                    value={memberForm.gender}
                  >
                    <option value="">Select gender</option>
                    <option value="muski">muski</option>
                    <option value="zenski">zenski</option>
                  </select>
                </label>

                <label>
                  Age category
                  <select
                    name="age_category"
                    onChange={handleFormChange}
                    value={memberForm.age_category}
                  >
                    <option value="">Select age category</option>
                    <option value="poletarac">poletarac</option>
                    <option value="pionir">pionir</option>
                    <option value="kadet">kadet</option>
                    <option value="junior">junior</option>
                    <option value="senior">senior</option>
                  </select>
                </label>

                <label>
                  Belt
                  <select
                    name="belt"
                    onChange={handleFormChange}
                    value={memberForm.belt}
                  >
                    <option value="">Select belt</option>
                    <option value="bijeli">bijeli</option>
                    <option value="zuti">zuti</option>
                    <option value="narandzasti">narandzasti</option>
                    <option value="zeleni">zeleni</option>
                    <option value="plavi">plavi</option>
                    <option value="braon">braon</option>
                    <option value="crni">crni</option>
                  </select>
                </label>

                <label>
                  Weight category
                  <input
                    name="weight_category"
                    onChange={handleFormChange}
                    placeholder="npr. -73kg"
                    type="text"
                    value={memberForm.weight_category}
                  />
                </label>

                <label>
                  Training group
                  <select
                    name="training_group_id"
                    onChange={handleFormChange}
                    value={memberForm.training_group_id}
                  >
                    <option value="">Bez grupe</option>
                    {trainingGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Contact email
                  <input
                    name="email"
                    onChange={handleFormChange}
                    type="email"
                    value={memberForm.email}
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    onChange={handleFormChange}
                    type="tel"
                    value={memberForm.phone}
                  />
                </label>

                <label>
                  Parent phone
                  <input
                    name="parent_phone"
                    onChange={handleFormChange}
                    type="tel"
                    value={memberForm.parent_phone}
                  />
                </label>

                <label className={styles.fullWidthField}>
                  Address
                  <input
                    name="address"
                    onChange={handleFormChange}
                    type="text"
                    value={memberForm.address}
                  />
                </label>

                <label>
                  Status
                  <select
                    name="status"
                    onChange={handleFormChange}
                    value={memberForm.status}
                  >
                    <option value="aktivan">aktivan</option>
                    <option value="neaktivan">neaktivan</option>
                  </select>
                </label>
              </div>

              {formError && <p className={styles.formError}>{formError}</p>}
              {formSuccess && (
                <p className={styles.formSuccess}>{formSuccess}</p>
              )}

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
                    ? editingMember
                      ? "Saving..."
                      : "Creating..."
                    : editingMember
                      ? "Save changes"
                      : "Create member"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.summaryGrid}>
            <article>
              <span>Total members</span>
              <strong>{members.length}</strong>
            </article>
            <article>
              <span>Active members</span>
              <strong>{activeMembersCount}</strong>
            </article>
            <article>
              <span>Without group</span>
              <strong>{membersWithoutGroupCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Search members"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, group or belt..."
              type="search"
              value={searchTerm}
            />

            <span>
              Showing {filteredMembers.length} of {members.length}
            </span>
          </div>

          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>Ime i prezime</th>
                  <th>Grupa</th>
                  <th>Kategorija</th>
                  <th>Pojas</th>
                  <th>Status</th>
                  <th>Kontakt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>
                        {member.first_name} {member.last_name}
                      </strong>
                      <span>{member.email || "Nema email"}</span>
                    </td>
                    <td>{member.training_group_name || "Bez grupe"}</td>
                    <td>{member.age_category || "-"}</td>
                    <td>{member.belt || "-"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          member.status === "aktivan"
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        {member.status || "nepoznato"}
                      </span>
                    </td>
                    <td>{member.phone || member.parent_phone || "-"}</td>
                    <td>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditForm(member)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteMember(member)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMembers.length === 0 && (
              <p className={styles.emptyTable}>No members found.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Members;
