// app/page.tsx
import { fetchLeagueTable } from "@/lib/scouting/queries";
import { LandingPage } from "@/components/LandingPage";

export const revalidate = 300;

export default async function HomePage() {
  const rows = await fetchLeagueTable();
  const psim = rows.find((r) => r.Team === "PSIM Yogyakarta");

  return <LandingPage rows={rows} brandLogoUrl={psim?.logo_url} />;
}
