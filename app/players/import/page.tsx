// app/players/import/page.tsx
import { ImportForm } from "@/components/playerImport/ImportForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

export default function PlayersImportPage() {
  return (
    <DashboardPageShell
      title="Update Player Stats"
      maxWidthClassName="max-w-5xl"
      description={
        <>
          Upload the weekly Wyscout player-search export (whole league). Existing players (matched by name + club) get
          their stats refreshed in place; anyone not already in the database gets a new player record. Safe to
          re-run every gameweek.
        </>
      }
    >
      <div className={`${shell.card} p-5`}>
        <ImportForm />
      </div>
    </DashboardPageShell>
  );
}
