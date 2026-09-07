import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="eyebrow">404 / Not found</p>
      <h1 id="not-found-title">Page not found.</h1>
      <p>The requested surface is not part of this foundation.</p>
      <Link className="text-link" to="/">
        Return to the foundation home
      </Link>
    </section>
  );
}
