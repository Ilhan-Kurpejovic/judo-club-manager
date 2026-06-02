import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./CoachMembers.module.css";

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchTrainingGroups() {
  const response = await axiosInstance.get("/training-groups");

  return response.data;
}

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

function getMemberName(member) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim();
}

function CoachMembers() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const coachGroups = useMemo(() => {
    if (!user?.coach_id) {
      return [];
    }

    return groups.filter((group) => Number(group.coach_id) === Number(user.coach_id));
  }, [groups, user]);

  const coachGroupIds = useMemo(() => {
    return new Set(coachGroups.map((group) => Number(group.id)));
  }, [coachGroups]);

  const groupedMembers = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return coachGroups.map((group) => {
      const groupMembers = members
        .filter((member) => Number(member.training_group_id) === Number(group.id))
        .filter((member) => {
          if (!normalizedSearchTerm) {
            return true;
          }

          const searchableText = [
            getMemberName(member),
            member.belt,
            member.age_category,
            member.weight_category,
            member.status,
            member.email,
            member.phone,
            group.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedSearchTerm);
        })
        .sort((firstMember, secondMember) =>
          getMemberName(firstMember).localeCompare(getMemberName(secondMember)),
        );

      return {
        group,
        members: groupMembers,
      };
    });
  }, [coachGroups, members, searchTerm]);

  const visibleMembers = groupedMembers.flatMap((group) => group.members);

  const activeMembersCount = visibleMembers.filter(
    (member) => member.status === "aktivan",
  ).length;

  const allCoachMembersCount = members.filter((member) =>
    coachGroupIds.has(Number(member.training_group_id)),
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [currentUser, groupsData, membersData] = await Promise.all([
          fetchCurrentUser(),
          fetchTrainingGroups(),
          fetchMembers(),
        ]);

        if (isActive) {
          setUser(currentUser);
          setGroups(groupsData);
          setMembers(membersData);
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Nije moguće učitati članove.");
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

  return (
    <section className={styles.coachMembersPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Članovi</h1>
          <p>Pregled članova raspoređenih po trening grupama koje vodi trener.</p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Učitavanje članova...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno članova</span>
              <strong>{allCoachMembersCount}</strong>
            </article>

            <article>
              <span>Prikazano</span>
              <strong>{visibleMembers.length}</strong>
            </article>

            <article>
              <span>Aktivni članovi</span>
              <strong>{activeMembersCount}</strong>
            </article>

            <article>
              <span>Trening grupe</span>
              <strong>{coachGroups.length}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Pretraga članova"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po imenu, pojasu, kategoriji ili grupi..."
              type="search"
              value={searchTerm}
            />
          </div>

          <div className={styles.groupSections}>
            {groupedMembers.map(({ group, members: groupMembers }) => (
              <section className={styles.groupSection} key={group.id}>
                <div className={styles.groupHeader}>
                  <div>
                    <h2>{group.name}</h2>
                    <p>{group.age_category || "Bez uzrasne kategorije"}</p>
                  </div>

                  <span>
                    {groupMembers.length}{" "}
                    {groupMembers.length === 1 ? "član" : "članova"}
                  </span>
                </div>

                {groupMembers.length > 0 ? (
                  <div className={styles.membersGrid}>
                    {groupMembers.map((member) => (
                      <article className={styles.memberCard} key={member.id}>
                        <div className={styles.memberHeader}>
                          <div>
                            <h3>{getMemberName(member)}</h3>
                            <p>{member.age_category || "Bez kategorije"}</p>
                          </div>

                          <span
                            className={
                              member.status === "aktivan"
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {member.status || "bez statusa"}
                          </span>
                        </div>

                        <div className={styles.memberDetails}>
                          <span>Pojas: {member.belt || "-"}</span>
                          <span>Težina: {member.weight_category || "-"}</span>
                          <span>Telefon: {member.phone || "-"}</span>
                          <span>Email: {member.email || "-"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyGroup}>
                    Nema članova za prikaz u ovoj grupi.
                  </p>
                )}
              </section>
            ))}
          </div>

          {coachGroups.length === 0 && (
            <p className={styles.emptyTable}>
              Trener trenutno nema dodijeljenih trening grupa.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default CoachMembers;
