import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import styles from "./Login.module.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      setSuccessMessage("Login successful.");
      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginShell}>
        <header className={styles.loginBrand}>
          <div className={styles.loginLogo}>J</div>

          <div>
            <p className={styles.loginBrandTitle}>Judo Club Manager</p>
            <p className={styles.loginBrandSubtitle}>Club management system</p>
          </div>
        </header>

        <form className={styles.loginCard} onSubmit={handleSubmit}>
          <div className={styles.loginAccent}></div>

          <h1>Uloguj se na sistem</h1>

          <p className={styles.loginDescription}>
            Usesi svoje podatke kako bi se ulogovao na Judo Club Manager
            aplikaciju.
          </p>

          <div className={styles.loginField}>
            <label htmlFor="email">Email adresa</label>
            <input
              id="email"
              type="email"
              placeholder="name@club.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.loginField}>
            <div className={styles.loginPasswordRow}>
              <label htmlFor="password">Lozinka</label>
              <a href="#">Zaboravio/la sam loziknu?</a>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.loginError}>{error}</p>}
          {successMessage && (
            <p className={styles.loginSuccess}>{successMessage}</p>
          )}

          <button
            className={styles.loginButton}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Prijavljivanje..." : "Prijavi se"}
          </button>

          <p className={styles.loginNote}>
            Isključivo autorizovan pristup. Kontaktirajte administratora kluba
            za kreiranje akaunta.
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
