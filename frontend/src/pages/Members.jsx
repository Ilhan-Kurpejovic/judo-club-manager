import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Members.module.css";

function Members() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      try {
        const response = await axiosInstance.get("/members");

        setMembers(response.data);
      } catch (error) {
        setError(error.response?.data?.message || "Could not load members.");
      } finally {
        setIsLoading(false);
      }
    }

    loadMembers();
  }, []);

  return (
    <section className={styles.membersPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>
        <div>
          <h1>Clanovi</h1>
          <p>Pregled clanova kluba, trening grupa i osnovnih kontakt podataka.</p>
        </div>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading members...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
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
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
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
                    <span className={styles.statusBadge}>
                      {member.status || "nepoznato"}
                    </span>
                  </td>
                  <td>{member.phone || member.parent_phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {members.length === 0 && (
            <p className={styles.emptyTable}>No members found.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default Members;
