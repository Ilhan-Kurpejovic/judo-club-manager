import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axiosInstance from "../../api/axiosInstance";
import styles from "./Attendance.module.css";

const attendanceStatuses = [
  { label: "Prisutan", value: "prisutan" },
  { label: "Odsutan", value: "odsutan" },
  { label: "Opravdano", value: "opravdano" },
];

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchTrainings() {
  const response = await axiosInstance.get("/trainings");

  return response.data;
}

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

async function fetchAllAttendance() {
  const response = await axiosInstance.get("/attendance");

  return response.data;
}

async function fetchTrainingAttendance(trainingId) {
  const response = await axiosInstance.get(
    `/attendance/training/${trainingId}`,
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

function getMemberName(member) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim();
}

function getStatusClass(status) {
  if (status === "prisutan") {
    return styles.statusPresent;
  }

  if (status === "opravdano") {
    return styles.statusExcused;
  }

  return styles.statusAbsent;
}

function Attendance() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const todayDate = getTodayDate();

  const coachGroups = useMemo(() => {
    if (!user?.coach_id) {
      return [];
    }

    return groups.filter(
      (group) => Number(group.coach_id) === Number(user.coach_id),
    );
  }, [groups, user]);

  const coachGroupIds = useMemo(() => {
    return new Set(coachGroups.map((group) => Number(group.id)));
  }, [coachGroups]);

  const attendanceCountByTrainingId = useMemo(() => {
    return attendanceRecords.reduce((counts, record) => {
      const trainingId = Number(record.training_id);

      counts[trainingId] = (counts[trainingId] || 0) + 1;

      return counts;
    }, {});
  }, [attendanceRecords]);

  const coachTrainings = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return trainings
      .filter((training) =>
        coachGroupIds.has(Number(training.training_group_id)),
      )
      .filter((training) => {
        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = [
          training.training_group_name,
          training.age_category,
          training.location,
          training.description,
          normalizeDateForInput(training.training_date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort((firstTraining, secondTraining) => {
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

        return String(firstTraining.start_time || "").localeCompare(
          String(secondTraining.start_time || ""),
        );
      });
  }, [coachGroupIds, searchTerm, todayDate, trainings]);

  const selectedTrainingMembers = useMemo(() => {
    if (!selectedTraining) {
      return [];
    }

    return members
      .filter(
        (member) =>
          Number(member.training_group_id) ===
          Number(selectedTraining.training_group_id),
      )
      .sort((firstMember, secondMember) =>
        getMemberName(firstMember).localeCompare(getMemberName(secondMember)),
      );
  }, [members, selectedTraining]);

  const selectedTrainingDate = selectedTraining
    ? normalizeDateForInput(selectedTraining.training_date)
    : "";
  const canEditSelectedAttendance = selectedTrainingDate === todayDate;

  const savedStatusesCount = Object.values(attendanceDrafts).filter(
    (status) => status === "prisutan",
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [
          currentUser,
          groupsData,
          trainingsData,
          membersData,
          attendanceData,
        ] = await Promise.all([
          fetchCurrentUser(),
          fetchTrainingGroups(),
          fetchTrainings(),
          fetchMembers(),
          fetchAllAttendance(),
        ]);

        if (isActive) {
          setUser(currentUser);
          setGroups(groupsData);
          setTrainings(trainingsData);
          setMembers(membersData);
          setAttendanceRecords(attendanceData);
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              "Nije moguće učitati podatke za prisustvo.",
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

  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        closeAttendanceModal();
      }
    }

    if (selectedTraining) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [selectedTraining]);

  async function openAttendanceModal(training) {
    setSelectedTraining(training);
    setAttendanceDrafts({});
    setModalError("");
    setPageSuccess("");
    setIsModalLoading(true);

    try {
      const existingAttendance = await fetchTrainingAttendance(training.id);
      const existingDrafts = existingAttendance.reduce((drafts, item) => {
        drafts[item.member_id] = item.status;
        return drafts;
      }, {});

      const groupMembers = members.filter(
        (member) =>
          Number(member.training_group_id) ===
          Number(training.training_group_id),
      );

      groupMembers.forEach((member) => {
        if (!existingDrafts[member.id]) {
          existingDrafts[member.id] = "odsutan";
        }
      });

      setAttendanceDrafts(existingDrafts);
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          "Nije moguće učitati postojeću evidenciju prisustva.",
      );
    } finally {
      setIsModalLoading(false);
    }
  }

  function closeAttendanceModal() {
    setSelectedTraining(null);
    setAttendanceDrafts({});
    setModalError("");
  }

  function changeMemberStatus(memberId, status) {
    if (!canEditSelectedAttendance) {
      return;
    }

    setAttendanceDrafts((currentDrafts) => ({
      ...currentDrafts,
      [memberId]: status,
    }));
  }

  async function saveAttendance() {
    if (!selectedTraining) {
      return;
    }

    if (!canEditSelectedAttendance) {
      setModalError("Prisustvo se može mijenjati samo na dan treninga.");
      return;
    }

    if (selectedTrainingMembers.length === 0) {
      setModalError("Ova trening grupa nema članova za evidenciju.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    setPageSuccess("");

    const attendance = selectedTrainingMembers.map((member) => ({
      member_id: member.id,
      status: attendanceDrafts[member.id] || "odsutan",
    }));

    try {
      await axiosInstance.post("/attendance/bulk", {
        training_id: selectedTraining.id,
        attendance,
      });

      setAttendanceRecords(await fetchAllAttendance());
      setPageSuccess("Prisustvo je uspješno sačuvano.");
      closeAttendanceModal();
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Nije moguće sačuvati prisustvo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.attendancePage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Treninzi i evidencija prisustva</h1>
          <p>Izaberi trening svoje grupe i evidentiraj prisustvo članova.</p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Učitavanje treninga...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          <div className={styles.summaryGrid}>
            <article>
              <span>Treninzi</span>
              <strong>{coachTrainings.length}</strong>
            </article>

            <article>
              <span>Moje grupe</span>
              <strong>{coachGroups.length}</strong>
            </article>

            <article>
              <span>Danas</span>
              <strong>
                {
                  coachTrainings.filter(
                    (training) =>
                      normalizeDateForInput(training.training_date) ===
                      todayDate,
                  ).length
                }
              </strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Pretraga treninga"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po grupi, datumu ili lokaciji..."
              type="search"
              value={searchTerm}
            />
          </div>

          <div className={styles.trainingsGrid}>
            {coachTrainings.map((training) => {
              const trainingDate = normalizeDateForInput(
                training.training_date,
              );
              const isTodayTraining = trainingDate === todayDate;
              const isPastTraining = trainingDate < todayDate;
              const attendanceCount =
                attendanceCountByTrainingId[Number(training.id)] || 0;
              const hasAttendance = attendanceCount > 0;

              return (
                <article className={styles.trainingCard} key={training.id}>
                  <div className={styles.dateBlock}>
                    <span>{formatDate(training.training_date)}</span>
                    <strong>
                      {formatTime(training.start_time)} -{" "}
                      {formatTime(training.end_time)}
                    </strong>
                  </div>

                  <div className={styles.trainingBody}>
                    <div className={styles.trainingHeader}>
                      <div>
                        <h2>{training.training_group_name}</h2>
                        <p>{training.age_category || "Bez kategorije"}</p>
                      </div>

                      <span
                        className={
                          isTodayTraining
                            ? styles.statusToday
                            : isPastTraining
                              ? styles.statusFinished
                              : styles.statusUpcoming
                        }
                      >
                        {isTodayTraining
                          ? "Danas"
                          : isPastTraining
                            ? "Završen"
                            : "Predstoji"}
                      </span>
                    </div>

                    <div className={styles.trainingMeta}>
                      <span>
                        {training.location || "Lokacija nije unesena"}
                      </span>
                    </div>

                    {training.description && (
                      <p className={styles.description}>
                        {training.description}
                      </p>
                    )}

                    <div className={styles.actionRow}>
                      <button
                        className={styles.attendanceButton}
                        onClick={() => openAttendanceModal(training)}
                        type="button"
                      >
                        {isTodayTraining
                          ? "Evidentiraj prisustvo"
                          : "Pregled prisustva"}
                      </button>

                      {(hasAttendance || isTodayTraining) && (
                        <div
                          className={
                            hasAttendance
                              ? styles.attendanceDoneBadge
                              : styles.attendanceMissingBadge
                          }
                        >
                          <span>{hasAttendance ? "✓" : "!"}</span>
                          {hasAttendance
                            ? `Prisustvo evidentirano (${attendanceCount})`
                            : "Prisustvo nije evidentirano"}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {coachTrainings.length === 0 && (
            <p className={styles.emptyTable}>
              Trenutno nema treninga za grupe ovog trenera.
            </p>
          )}

          {selectedTraining &&
            createPortal(
              <div
                className={styles.modalBackdrop}
                onClick={closeAttendanceModal}
                role="presentation"
              >
                <div
                  aria-labelledby="attendance-modal-title"
                  aria-modal="true"
                  className={styles.attendanceModal}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                >
                  <div className={styles.modalHeader}>
                    <div>
                      <span>Evidencija prisustva</span>
                      <h2 id="attendance-modal-title">
                        {selectedTraining.training_group_name}
                      </h2>
                      <p>
                        {formatDate(selectedTraining.training_date)} /{" "}
                        {formatTime(selectedTraining.start_time)} -{" "}
                        {formatTime(selectedTraining.end_time)}
                      </p>
                    </div>

                    <button
                      className={styles.closeModalButton}
                      onClick={closeAttendanceModal}
                      type="button"
                    >
                      x
                    </button>
                  </div>

                  {isModalLoading && (
                    <p className={styles.emptyState}>
                      Učitavanje evidencije...
                    </p>
                  )}

                  {modalError && (
                    <p className={styles.modalError}>{modalError}</p>
                  )}

                  {!isModalLoading && (
                    <>
                      {!canEditSelectedAttendance && (
                        <p className={styles.readOnlyNotice}>
                          Prisustvo je moguće mijenjati samo na dan treninga.
                          Ovdje možeš samo pregledati evidenciju.
                        </p>
                      )}

                      <div className={styles.modalSummary}>
                        <span>
                          Članovi:{" "}
                          <strong>{selectedTrainingMembers.length}</strong>
                        </span>
                        <span>
                          Prisustvo: <strong>{savedStatusesCount}</strong>
                        </span>
                      </div>

                      <div className={styles.membersList}>
                        {selectedTrainingMembers.map((member) => {
                          const selectedStatus =
                            attendanceDrafts[member.id] || "odsutan";

                          return (
                            <article
                              className={styles.memberAttendance}
                              key={member.id}
                            >
                              <div>
                                <strong>{getMemberName(member)}</strong>
                                <span>
                                  {member.belt || "bez pojasa"} /{" "}
                                  {member.weight_category ||
                                    "bez težinske kategorije"}
                                </span>
                              </div>

                              <div className={styles.statusButtons}>
                                {attendanceStatuses.map((status) => (
                                  <button
                                    className={
                                      selectedStatus === status.value
                                        ? `${styles.statusButton} ${getStatusClass(
                                            status.value,
                                          )}`
                                        : styles.statusButton
                                    }
                                    key={status.value}
                                    onClick={() =>
                                      changeMemberStatus(
                                        member.id,
                                        status.value,
                                      )
                                    }
                                    disabled={!canEditSelectedAttendance}
                                    type="button"
                                  >
                                    {status.label}
                                  </button>
                                ))}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {selectedTrainingMembers.length === 0 && (
                        <p className={styles.emptyTable}>
                          Ova trening grupa nema članova.
                        </p>
                      )}

                      <div className={styles.modalFooter}>
                        <button
                          className={styles.cancelButton}
                          onClick={closeAttendanceModal}
                          type="button"
                        >
                          Otkaži
                        </button>

                        <button
                          className={styles.saveButton}
                          disabled={isSaving || !canEditSelectedAttendance}
                          onClick={saveAttendance}
                          type="button"
                        >
                          {!canEditSelectedAttendance
                            ? "Samo pregled"
                            : isSaving
                              ? "Čuvanje..."
                              : "Sačuvaj prisustvo"}
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

export default Attendance;
