// lib/scouting/schedule.ts
// Server-only. Combines `matches` (match days, including future fixtures
// once inserted) and `training_sessions` (training days — table exists but
// is empty until it's populated) into one schedule for the calendar widget.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface ScheduleMatch {
  date: string; // yyyy-mm-dd
  opponent: string;
  opponentLogoUrl: string | null;
  home: boolean;
  round: string | null;
}

export interface ScheduleTraining {
  date: string; // yyyy-mm-dd
  category: string | null;
  notes: string | null;
  timeOfDay: "morning" | "early_afternoon" | "afternoon" | "evening" | null;
}

export interface ScheduleData {
  matches: ScheduleMatch[];
  training: ScheduleTraining[];
}

export async function fetchSchedule(clubName: string): Promise<ScheduleData> {
  const supabase = createPsimServerClient();
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (!club) return { matches: [], training: [] };

  const { data: matchRows, error: matchesErr } = await supabase
    .from("matches")
    .select("match_date, round, home_club_id, away_club_id, home:clubs!home_club_id(name, logo_url), away:clubs!away_club_id(name, logo_url)")
    .or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`)
    .order("match_date", { ascending: true });
  if (matchesErr) throw new Error(`matches query failed: ${matchesErr.message}`);

  const { data: trainingRows, error: trainingErr } = await supabase
    .from("training_sessions")
    .select("session_date, category, notes, time_of_day")
    .eq("club_id", club.id)
    .order("session_date", { ascending: true });
  if (trainingErr) throw new Error(`training_sessions query failed: ${trainingErr.message}`);

  const matches: ScheduleMatch[] = (matchRows ?? []).map((m: any) => {
    const isHome = m.home_club_id === club.id;
    const opponentRel = isHome ? m.away : m.home;
    const opponent = Array.isArray(opponentRel) ? opponentRel[0] : opponentRel;
    return {
      date: m.match_date,
      opponent: opponent?.name ?? "Unknown",
      opponentLogoUrl: opponent?.logo_url ?? null,
      home: isHome,
      round: m.round,
    };
  });

  const training: ScheduleTraining[] = (trainingRows ?? []).map((t) => ({
    date: t.session_date,
    category: t.category,
    notes: t.notes,
    timeOfDay: t.time_of_day,
  }));

  return { matches, training };
}
