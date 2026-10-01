// components/LandingPage.tsx
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LeagueTeamRow } from "@/lib/scouting/types";
import { MATCH_LOG_BY_TEAM } from "@/lib/scouting/matchlog";
import styles from "./LandingPage.module.css";

type Club = {
  team: LeagueTeamRow;
  position: number;
  points: number;
  lastFive: ("W" | "D" | "L")[] | null;
};

function shortNameOf(name: string) {
  return name.split(" ")[0].toUpperCase();
}

function Crest({ club, large = false }: { club: Club; large?: boolean }) {
  const { logo_url, Team } = club.team;
  if (logo_url) {
    return <img src={logo_url} alt="" className={large ? styles.crestImgLarge : styles.crestImg} />;
  }
  const short = shortNameOf(Team);
  return (
    <div className={`${styles.crest} ${large ? styles.crestLarge : ""}`}>
      <span>{short}</span>
      <strong>{short.slice(0, 2)}</strong>
      <i />
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export function LandingPage({ rows }: { rows: LeagueTeamRow[] }) {
  const clubs: Club[] = useMemo(
    () =>
      rows.map((team, i) => ({
        team,
        position: i + 1,
        points: team.W * 3 + team.D,
        lastFive: MATCH_LOG_BY_TEAM[team.Team]?.slice(-5).map((e) => e.result) ?? null,
      })),
    [rows]
  );

  const defaultSelected = Math.max(0, clubs.findIndex((c) => c.team.Team === "PSIM Yogyakarta"));
  const [selected, setSelected] = useState(defaultSelected);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"carousel" | "directory">("carousel");

  const active = clubs[selected];
  const visible = useMemo(
    () => clubs.filter((c) => c.team.Team.toLowerCase().includes(query.toLowerCase())),
    [clubs, query]
  );
  const shift = (value: number) => setSelected((selected + value + clubs.length) % clubs.length);
  const around = [-2, -1, 0, 1, 2].map((offset) => ({
    club: clubs[(selected + offset + clubs.length) % clubs.length],
    offset,
  }));

  if (clubs.length === 0) return null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <span className={styles.eyebrow}>MATCH INTELLIGENCE</span>
            <h1>PSIM Intelligence Dashboard</h1>
            <p>PSIM Yogyakarta&apos;s home for squad and match data — plus opponent reports for every club in the league.</p>
          </div>
          <div className={styles.modeSwitch}>
            <button onClick={() => setView("carousel")} className={view === "carousel" ? styles.selectedMode : ""}>
              Focus view
            </button>
            <button onClick={() => setView("directory")} className={view === "directory" ? styles.selectedMode : ""}>
              All clubs
            </button>
          </div>
        </div>

        {view === "carousel" ? (
          <>
            <div className={styles.carousel}>
              <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={() => shift(-1)} aria-label="Previous club">
                <Chevron direction="left" />
              </button>
              {around.map(({ club, offset }) => (
                <button
                  key={`${club.team.Team}-${offset}`}
                  className={`${styles.clubStage} ${styles[`offset${offset}` as keyof typeof styles]}`}
                  onClick={() => setSelected(clubs.findIndex((c) => c.team.Team === club.team.Team))}
                >
                  <Crest club={club} large={offset === 0} />
                  {offset === 0 ? (
                    <div className={styles.activeClub}>
                      <span>{club.team.Team === "PSIM Yogyakarta" ? "YOUR CLUB" : "SELECTED OPPONENT"}</span>
                      <h2>{club.team.Team}</h2>
                      <p>BRI Super League</p>
                    </div>
                  ) : (
                    <small>{club.team.Team}</small>
                  )}
                </button>
              ))}
              <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={() => shift(1)} aria-label="Next club">
                <Chevron direction="right" />
              </button>
            </div>

            <div className={styles.snapshot}>
              <div>
                <span>LEAGUE POSITION</span>
                <strong>{String(active.position).padStart(2, "0")}</strong>
              </div>
              <div>
                <span>POINTS</span>
                <strong>{active.points}</strong>
              </div>
              <div>
                <span>MATCHES</span>
                <strong>{active.team.MP}</strong>
              </div>
              <div className={styles.form}>
                <span>LAST FIVE</span>
                {active.lastFive ? (
                  <p>
                    {active.lastFive.map((r, i) => (
                      <b key={i} data-result={r}>
                        {r}
                      </b>
                    ))}
                  </p>
                ) : (
                  <p className={styles.formEmpty}>Not tracked yet</p>
                )}
              </div>
              <Link href={`/scouting/${encodeURIComponent(active.team.Team)}`} className={styles.reportButton}>
                {active.team.Team === "PSIM Yogyakarta" ? "Open PSIM dashboard" : "Open scouting report"} <span>↗</span>
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.directoryHero}>
            <div className={styles.search}>
              <span>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search club" />
            </div>
            <p>{visible.length} clubs available</p>
          </div>
        )}
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>LEAGUE DIRECTORY</span>
            <h2>All teams in the league</h2>
          </div>
          <div className={styles.filters}>
            <button className={styles.filterActive}>BRI Super League</button>
            <button>2026/27</button>
            <button>Indonesia</button>
          </div>
        </div>
        <div className={styles.clubGrid}>
          {visible.map((club) => (
            <button
              key={club.team.Team}
              onClick={() => {
                setSelected(clubs.findIndex((c) => c.team.Team === club.team.Team));
                setView("carousel");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={club.team.Team === active.team.Team ? styles.clubCardActive : ""}
            >
              <Crest club={club} />
              <div>
                <h3>{club.team.Team}</h3>
                <p>#{club.position} in league</p>
              </div>
              <span>View report ↗</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
