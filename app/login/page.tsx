// app/login/page.tsx
"use client";
import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { createPsimBrowserClient } from "@/lib/supabase/psimBrowserClient";
import styles from "./StaffLogin.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-poppins" });

function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IconEye({ off }: { off?: boolean }) {
  return off ? (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61C3.35 8.36 2 12 2 12s3 8 10 8a9.14 9.14 0 0 0 5.39-1.61M2 2l20 20" />
      <path d="M12.53 15.53a3 3 0 0 1-4.06-4.06" />
    </svg>
  ) : (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconShieldCheck({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid staff email address.");
    if (password.length < 6) return setError("Password must contain at least 6 characters.");
    setError("");
    setLoading(true);
    const supabase = createPsimBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const next = searchParams.get("next") || "/";
    router.push(next);
    router.refresh();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.loginModal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <IconX />
        </button>
        <span className={styles.secureLabel}>
          <IconShieldCheck /> Secure staff access
        </span>
        <h2 className={styles.modalTitle}>Welcome back</h2>
        <p className={styles.modalDescription}>Sign in to access the PSIM Intelligence Dashboard.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email address</label>
          <div className={styles.inputWrap}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@psimjogja.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.passwordRow}>
            <label htmlFor="password">Password</label>
          </div>
          <div className={styles.inputWrap}>
            <IconLock />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.iconButton}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
            >
              <IconEye off={showPassword} />
            </button>
          </div>
          <label className={styles.remember}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Keep me signed in on this device</span>
          </label>
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"} <IconArrowRight />
          </button>
        </form>
        <p className={styles.inviteCopy}>No account yet? Ask the club administrator to invite you.</p>
      </div>
    </div>
  );
}

function StaffLoginContent() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className={`${styles.landingPage} ${poppins.variable}`}>
      <div className={styles.blueField} aria-hidden="true" />
      <div className={styles.navySlice} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.topbar}>
        <a className={styles.brand} href="#" aria-label="PSIM Intelligence home">
          <span className={styles.brandIcon}>PI</span>
          <span>
            <strong>PSIM</strong>
            <small>INTELLIGENCE</small>
          </span>
        </a>
        <span className={styles.portalLabel}>Staff data &amp; report access</span>
      </header>

      <section className={styles.heroCopy}>
        <span className={styles.heroKicker}>PSIM Intelligence Dashboard</span>
        <h1>
          See the game.
          <br />
          <em>Shape what&apos;s next.</em>
        </h1>
        <p>One secure workspace for technical, physical and tactical intelligence across the first team.</p>
        <button className={styles.loginTrigger} onClick={() => setModalOpen(true)}>
          Login <IconArrowRight />
        </button>
      </section>

      <div className={styles.players} aria-label="PSIM first-team players">
        <div className={`${styles.player} ${styles.playerBack}`}>
          <Image src="/psim-player-17.png" alt="PSIM player wearing the home kit" fill sizes="40vw" style={{ objectFit: "contain" }} priority />
        </div>
        <div className={`${styles.player} ${styles.playerFront}`}>
          <Image
            src="/psim-player-listen.png"
            alt="PSIM player inviting supporters to listen"
            fill
            sizes="44vw"
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </div>

      <footer className={styles.landingFooter}>
        <span>2026/27</span>
        <span>Internal club platform</span>
      </footer>

      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginContent />
    </Suspense>
  );
}
