// app/physical-stats/import/page.tsx
import { ImportForm } from "@/components/physicalStats/ImportForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

export default function PhysicalStatsImportPage() {
  return (
    <DashboardPageShell
      title="Import Physical Stats"
      description={
        <>
          Upload Catapult OpenField Athlete Report PDFs. The Team Summary table (per-player session totals) is
          extracted automatically and saved to <code>player_physical_stats</code>. Re-importing the same session date
          replaces its rows instead of duplicating them. Per-drill breakdowns aren&apos;t parsed yet.
        </>
      }
    >
      <div className={`${shell.card} p-5`}>
        <ImportForm />
      </div>
    </DashboardPageShell>
  );
}
