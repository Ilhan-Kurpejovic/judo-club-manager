import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import styles from "./Files.module.css";

const fileTypes = [
  "opsti dokument",
  "ljekarsko uvjerenje",
  "saglasnost roditelja",
  "dokument za takmicenje",
  "fotografija",
  "drugo",
];

const initialUploadForm = {
  member_id: "",
  file_type: "opsti dokument",
  file: null,
};

const uploadsBaseUrl = "http://localhost:5000/uploads";

async function fetchFiles() {
  const response = await axiosInstance.get("/files");

  return response.data;
}

async function fetchMembers() {
  const response = await axiosInstance.get("/members");

  return response.data;
}

function getMemberName(file) {
  return `${file.member_first_name || ""} ${file.member_last_name || ""}`.trim();
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

function Files() {
  const [files, setFiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (selectedType && file.file_type !== selectedType) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchableText = [
        file.file_name,
        file.file_type,
        getMemberName(file),
        file.member_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [files, normalizedSearchTerm, selectedType]);

  const filesWithMemberCount = files.filter((file) => file.member_id).length;
  const medicalFilesCount = files.filter(
    (file) => file.file_type === "ljekarsko uvjerenje",
  ).length;

  useEffect(() => {
    let isActive = true;

    async function loadPageData() {
      try {
        const [filesData, membersData] = await Promise.all([
          fetchFiles(),
          fetchMembers(),
        ]);

        if (isActive) {
          setFiles(filesData);
          setMembers(membersData);
        }
      } catch (error) {
        if (isActive) {
          setError(error.response?.data?.message || "Could not load files.");
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
    const { name, value, files } = event.target;

    setUploadForm((currentForm) => ({
      ...currentForm,
      [name]: name === "file" ? files[0] || null : value,
    }));
  }

  function closeForm() {
    setIsFormOpen(false);
    setUploadForm(initialUploadForm);
    setFormError("");
  }

  function openForm() {
    setUploadForm(initialUploadForm);
    setFormError("");
    setPageSuccess("");
    setIsFormOpen(true);
  }

  async function handleUploadFile(event) {
    event.preventDefault();

    setFormError("");
    setPageSuccess("");

    if (!uploadForm.file) {
      setFormError("Odaberi fajl za upload.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("member_id", uploadForm.member_id);
    formData.append("file_type", uploadForm.file_type);
    formData.append("file", uploadForm.file);

    try {
      await axiosInstance.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setFiles(await fetchFiles());
      setPageSuccess("File uploaded successfully.");
      closeForm();
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not upload file.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteFile(file) {
    const shouldDelete = window.confirm(
      `Da li ste sigurni da zelite da obrisete fajl ${file.file_name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setPageSuccess("");

    try {
      await axiosInstance.delete(`/files/${file.id}`);

      setFiles(await fetchFiles());
      setPageSuccess("File deleted successfully.");
    } catch (error) {
      setError(error.response?.data?.message || "Could not delete file.");
    }
  }

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
      setError("Could not download file.");
    }
  }

  return (
    <section className={styles.filesPage}>
      <div className={styles.pageHeader}>
        <span className={styles.accentLine}></span>

        <div>
          <h1>Fajlovi</h1>
          <p>Dokumenti i fajlovi povezani sa clanovima kluba.</p>
        </div>

        <button className={styles.addButton} onClick={openForm} type="button">
          Upload fajla
        </button>
      </div>

      {isLoading && <p className={styles.emptyState}>Loading files...</p>}

      {error && !isLoading && <p className={styles.errorState}>{error}</p>}

      {!isLoading && !error && (
        <>
          {pageSuccess && <p className={styles.pageSuccess}>{pageSuccess}</p>}

          {isFormOpen && (
            <form className={styles.uploadForm} onSubmit={handleUploadFile}>
              <div className={styles.formHeader}>
                <h2>Upload fajla</h2>
                <p>Dodaj dokument i povezi ga sa clanom kluba.</p>
              </div>

              <div className={styles.formGrid}>
                <label>
                  Clan
                  <select
                    name="member_id"
                    onChange={handleFormChange}
                    required
                    value={uploadForm.member_id}
                  >
                    <option value="">Odaberi clana</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tip fajla
                  <select
                    name="file_type"
                    onChange={handleFormChange}
                    value={uploadForm.file_type}
                  >
                    {fileTypes.map((fileType) => (
                      <option key={fileType} value={fileType}>
                        {fileType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.fullWidthField}>
                  Fajl
                  <input name="file" onChange={handleFormChange} type="file" />
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
                  {isSubmitting ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          )}

          <div className={styles.summaryGrid}>
            <article>
              <span>Ukupno fajlova</span>
              <strong>{files.length}</strong>
            </article>

            <article>
              <span>Povezano sa clanom</span>
              <strong>{filesWithMemberCount}</strong>
            </article>

            <article>
              <span>Ljekarska uvjerenja</span>
              <strong>{medicalFilesCount}</strong>
            </article>
          </div>

          <div className={styles.toolbar}>
            <input
              aria-label="Search files"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po nazivu, tipu ili clanu..."
              type="search"
              value={searchTerm}
            />

            <select
              aria-label="Filter by file type"
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
              Showing {filteredFiles.length} of {files.length}
            </span>
          </div>

          <div className={styles.filesGrid}>
            {filteredFiles.map((file) => (
              <article className={styles.fileCard} key={file.id}>
                <div className={styles.fileIcon}>
                  {file.file_name?.split(".").pop()?.slice(0, 3) || "file"}
                </div>

                <div className={styles.fileBody}>
                  <div className={styles.fileHeader}>
                    <div>
                      <h2>{file.file_name}</h2>
                      <p>{file.file_type || "bez tipa"}</p>
                    </div>

                    <span>{formatUploadDate(file.uploaded_at)}</span>
                  </div>

                  <div className={styles.fileMeta}>
                    <span>Clan</span>
                    <strong>{getMemberName(file) || "-"}</strong>
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
                      Download
                    </button>

                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteFile(file)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <p className={styles.emptyTable}>No files found.</p>
          )}
        </>
      )}
    </section>
  );
}

export default Files;
