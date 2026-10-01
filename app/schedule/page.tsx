// app/schedule/page.tsx
import { fetchSchedule } from "@/lib/scouting/schedule";
import { FullScheduleCalendar } from "@/components/schedule/FullScheduleCalendar";
import { DashboardPageShell } from "@/components/DashboardPageShell";

const PSIM = "PSIM Yogyakarta";

export default async function SchedulePage() {
  const data = await fetchSchedule(PSIM);

  return (
    <DashboardPageShell title="Schedule" maxWidthClassName="max-w-5xl" description="PSIM Yogyakarta — training sessions and match days. Click a date for details.">
      <FullScheduleCalendar data={data} />
    </DashboardPageShell>
  );
}
