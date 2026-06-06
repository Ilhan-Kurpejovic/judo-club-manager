import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import styles from "./MemberFiles.module.css";

const uploadsBaseUrl = "http://localhost:5000/uploads";

async function fetchCurrentUser() {
  const response = await axiosInstance.get("/auth/me");

  return response.data.user;
}

async function fetchMemberFiles(memberId) {
  const response = await axiosInstance.get(`/files/member/${memberId}`);

  return response.data;
}

function formatUploadDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function getFileUrl(filePath) {
  return `${uploadsBaseUrl}/${encodeURIComponent(filePath)}`;
}

function getFileExtension(fileName) {
  const extension = String(fileName || "").split(".").pop();

  return extension && extension !== fileName ? extension.slice(0, 4) : "file";
}

function formatFileType(fileType) {
  return fileType || "bez tipa";
}

function MemberFiles() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadFilesPage() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!currentUser.member_id) {
          throw new Error("Članski profil nije pronađen.");
        }

        const filesData = await fetchMemberFiles(currentUser.member_id);

        if (isActive) {
          setUser(currentUser);
          setFiles(filesData);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        if (isActive) {
          setError(
            error.response?.data?.message ||
              error.message ||
              "Nije moguće učitati fajlove.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadFilesPage();

    return () => {
      isActive = false;
    };
  }, []);

  const fileTypes = useMemo(() => {
    return [...new Set(files.map((file) => file.file_type).filter(Boolean))];
  }, [files]);

  const filteredFiles = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return files.filter((file) => {
      if (selectedType && file.file_type !== selectedType) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchableText = [file.file_name, file.file_type, file.uploaded_at]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [files, searchTerm, selectedType]);

  const medicalFilesCount = files.filter(
    (file) => file.file_type === "ljekarsko uvjerenje",
  ).length;

  const competitionFilesCount = files.filter(
    (file) => file.file_type === "dokument za takmicenje",
  ).length;

  async function handleDownloadFile(file) {
    try {
      const response = await fetch(getFileUrl(file.file_path));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.file_name;
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setError("Nije moguće preuzeti fajl.");
    }
  }

  if (isLoading) {
    return <p className={styles.emptyState}>Učitavanje fajlova...</p>;
  }

  if (error) {
    return <p className={styles.errorState}>{error}</p>;
  }

  return (
    <section className={styles.memberFilesPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Moji fajlovi</h1>
          <p>
            Pregled dokumenata i fajlova povezanih sa profilom člana{" "}
            <strong>{user?.name}</strong>.
          </p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article>
          <span>Ukupno fajlova</span>
          <strong>{files.length}</strong>
        </article>

        <article>
          <span>Tipovi dokumenata</span>
          <strong>{fileTypes.length}</strong>
        </article>

        <article>
          <span>Ljekarska uvjerenja</span>
          <strong>{medicalFilesCount}</strong>
        </article>

        <article>
          <span>Takmičarski dokumenti</span>
          <strong>{competitionFilesCount}</strong>
        </article>
      </div>

      <div className={styles.toolbar}>
        <input
          aria-label="Pretraga fajlova"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Pretraga po nazivu ili tipu fajla..."
          type="search"
          value={searchTerm}
        />

        <select
          aria-label="Filter po tipu fajla"
          onChange={(event) => setSelectedType(event.target.value)}
          value={selectedType}
        >
          <option value="">Svi tipovi</option>
          {fileTypes.map((fileType) => (
            <option key={fileType} value={fileType}>
              {fileType}
            </option>
          ))}
        </select>

        <span>
          Prikazano {filteredFiles.length} od {files.length}
        </span>
      </div>

      <div className={styles.filesGrid}>
        {filteredFiles.map((file) => (
          <article className={styles.fileCard} key={file.id}>
            <div className={styles.fileIcon}>
              {getFileExtension(file.file_name)}
            </div>

            <div className={styles.fileBody}>
              <div className={styles.fileHeader}>
                <div>
                  <h2>{file.file_name}</h2>
                  <p>{formatFileType(file.file_type)}</p>
                </div>

                <span>{formatUploadDate(file.uploaded_at)}</span>
              </div>

              <div className={styles.fileMeta}>
                <span>Vlasnik dokumenta</span>
                <strong>{user?.name || "-"}</strong>
              </div>

              <div className={styles.cardActions}>
                <a
                  className={styles.openButton}
                  href={getFileUrl(file.file_path)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Otvori
                </a>

                <button
                  className={styles.downloadButton}
                  onClick={() => handleDownloadFile(file)}
                  type="button"
                >
                  Preuzmi
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <p className={styles.emptyTable}>
          Nema fajlova koji odgovaraju izabranom prikazu.
        </p>
      )}
    </section>
  );
}

export default MemberFiles;
