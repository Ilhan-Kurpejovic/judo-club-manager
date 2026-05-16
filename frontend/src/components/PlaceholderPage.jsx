import styles from "./PlaceholderPage.module.css";

function PlaceholderPage({ title, description }) {
  return (
    <section className={styles.pagePanel}>
      <p className={styles.eyebrow}>Judo Club Manager</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

export default PlaceholderPage;
