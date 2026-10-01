// app/opponent-analysis/page.tsx
import { fetchLeagueTable } from "@/lib/scouting/queries";
import { LandingPage } from "@/components/LandingPage";

export const revalidate = 300;

export default async function OpponentAnalysisPage() {
  const rows = await fetchLeagueTable();
  return <LandingPage rows={rows} />;
}
