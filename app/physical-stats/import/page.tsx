// app/physical-stats/import/page.tsx
import Link from "next/link";
import { ImportForm } from "@/components/physicalStats/ImportForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

export default function PhysicalStatsImportPage() {
  return (
    <DashboardPageShell
      title="Import Physical Stats"
      description={
        <>
          Upload Catapult OpenField Athlete Report PDFs. The Team Summary table (whole-session totals) and every
          per-drill/period breakdown (games, warm-up, HSR, ...) are extracted automatically and saved to{" "}
          <code>player_physical_stats</code>. Re-importing the same session date replaces its rows instead of
          duplicating them. Already imported a few sessions?{" "}
          <Link href="/physical-stats/compare" className="text-blue-600 font-semibold hover:underline">
            Compare two of them →
          </Link>
        </>
      }
    >
      <div className={`${shell.card} p-5`}>
        <ImportForm />
      </div>
    </DashboardPageShell>
  );
}
