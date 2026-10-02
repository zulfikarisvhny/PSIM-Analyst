// app/team-style/import/page.tsx
import { ImportForm } from "@/components/teamStyle/ImportForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

export default function TeamStyleImportPage() {
  return (
    <DashboardPageShell
      title="Import Team Style Stats"
      description={
        <>
          Upload a Wyscout &quot;Team Stats&quot; xlsx export. Every team found in the file gets its matches averaged
          into style metrics (possession, directness, pass accuracy, xG/shot, proactive defending, step-out rate,
          aerial tendency). Pick which teams to save. Re-importing at the same matches-played count updates that
          row instead of duplicating it.
        </>
      }
    >
      <div className={`${shell.card} p-5`}>
        <ImportForm />
      </div>
    </DashboardPageShell>
  );
}
