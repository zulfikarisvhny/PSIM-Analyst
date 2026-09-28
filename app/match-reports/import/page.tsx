// app/match-reports/import/page.tsx
import { ImportForm } from "@/components/matchReports/ImportForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

export default function MatchReportImportPage() {
  return (
    <DashboardPageShell
      title="Import Match Reports"
      description={
        <>
          Upload Wyscout-format &quot;Match Report&quot; PDFs. Teams, score, Team Stats (~55 metrics per side), the Match
          Dynamics time-segment breakdown (1-15, 16-30, 31-45+, 46-60, 61-75, 76-90+), and the Passes page&apos;s
          player-to-player pass combinations are extracted automatically and saved to the database. Re-importing the
          same match updates it instead of duplicating it.
        </>
      }
    >
      <div className={`${shell.card} p-5`}>
        <ImportForm />
      </div>
    </DashboardPageShell>
  );
}
