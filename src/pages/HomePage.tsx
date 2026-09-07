const foundationItems = [
  "Independent versioned API boundary",
  "Accessible responsive shell",
  "Provider-neutral local configuration",
];

export function HomePage() {
  return (
    <div className="home-page">
      <section className="intro-grid" aria-labelledby="page-title">
        <div className="intro-copy">
          <p className="eyebrow">Independent web foundation</p>
          <h1 id="page-title">A language community foundation.</h1>
          <p className="lede">
            The product surface is intentionally small while language and
            community contracts are shaped in their own repositories.
          </p>
        </div>

        <aside className="scope-panel" aria-labelledby="scope-title">
          <p className="panel-kicker">Current scope</p>
          <h2 id="scope-title">Ready for the next layer.</h2>
          <ul className="foundation-list">
            {foundationItems.map((item) => (
              <li key={item}>
                <span className="list-marker" aria-hidden="true">
                  /
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="next-section" aria-labelledby="next-title">
        <div>
          <p className="eyebrow">What comes next</p>
          <h2 id="next-title">Language and community features will arrive deliberately.</h2>
        </div>
        <p>
          Authentication, profiles, conversations, and contribution workflows
          are not active in this foundation shell. They will be introduced
          behind their approved contracts and verification gates.
        </p>
      </section>
    </div>
  );
}
