// components/scouting/SquadUpdate.tsx
import { NexusPlayerRow, PlayerProfileRow } from "@/lib/scouting/players";
import { SQUAD_UPDATE_WARNING, DEPARTED_PLAYERS, NEW_SIGNEES, REPOSITIONING } from "@/lib/scouting/squadUpdate";
import { PlayerProfileCard } from "./PlayerProfileCard";

export function SquadUpdate({
  players,
  leaguePool,
  incomingPlayers,
}: {
  players: NexusPlayerRow[];
  leaguePool: PlayerProfileRow[];
  incomingPlayers: NexusPlayerRow[];
}) {
  const findInSquad = (nexusName: string) => players.find((p) => p.player_name === nexusName);
  const findIncoming = (nexusName: string) => incomingPlayers.find((p) => p.player_name === nexusName);

  const ferarri = findInSquad(REPOSITIONING.nexusName);
  const damjanovic = findInSquad(REPOSITIONING.comparesTo);

  const signeesWithData = NEW_SIGNEES.filter((s) => s.nexusName && findIncoming(s.nexusName));
  const signeesNoData = NEW_SIGNEES.filter((s) => !s.nexusName || !findIncoming(s.nexusName));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-blue-50 dark:bg-[#2b2410] border border-blue-200 dark:border-[#7a6a33] rounded-lg p-5">
        <div className="text-xs font-bold text-blue-600 dark:text-[#ffcf4d] mb-1">IMPORTANT — SQUAD UPDATE</div>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{SQUAD_UPDATE_WARNING}</p>
      </div>

      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Departed Players</h3>
        <p className="text-xs text-gray-500 mb-4">
          The data below reflects last season's performance at Bhayangkara (still stored in our database) — these
          players are no longer at the club.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTED_PLAYERS.map((d) => {
            const player = findInSquad(d.nexusName);
            return player ? (
              <PlayerProfileCard key={d.nexusName} player={player} subtitle={d.role} leaguePool={leaguePool} />
            ) : (
              <div key={d.nexusName} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white">{d.nexusName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">{d.role}</div>
                <p className="text-xs text-gray-500">Player data not found in our database.</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          {DEPARTED_PLAYERS.map((d) => (
            <span key={d.nexusName}>
              <b className="text-gray-600 dark:text-gray-300">{d.nexusName}</b>: {d.note}
            </span>
          ))}
        </div>
      </div>

      {signeesWithData.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">New Signings — Full Stats Available</h3>
          <p className="text-xs text-gray-500 mb-4">
            These stats are from their previous club (not from performance at Bhayangkara) — treat them as a profile
            snapshot, not a guarantee of the same output in Liga 1.
          </p>
          <div className="flex flex-col gap-5">
            {signeesWithData.map((s) => {
              const signee = findIncoming(s.nexusName!)!;
              const departedMatch = s.likelyReplaces ? findInSquad(s.likelyReplaces) : undefined;
              const currentOptions = s.compareToCurrentNames
                ? s.compareToCurrentNames.map((n) => findInSquad(n)).filter((p): p is NexusPlayerRow => !!p)
                : [];

              return (
                <div key={s.name}>
                  {departedMatch ? (
                    <>
                      <div className="text-xs text-gray-500 mb-2">
                        <b className="text-gray-600 dark:text-gray-300">{s.name}</b> vs <b className="text-gray-600 dark:text-gray-300">{s.likelyReplaces}</b>{" "}
                        (the player they likely replace)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PlayerProfileCard
                          player={signee}
                          subtitle={`${s.position} · ${s.previousClub} (new signing)`}
                          leaguePool={leaguePool}
                        />
                        <PlayerProfileCard
                          player={departedMatch}
                          subtitle={`${departedMatch.position_group} (departed player)`}
                          leaguePool={leaguePool}
                        />
                      </div>
                    </>
                  ) : currentOptions.length > 0 ? (
                    <>
                      <div className="text-xs text-gray-500 mb-2">
                        <b className="text-gray-600 dark:text-gray-300">{s.name}</b> vs Bhayangkara's current {s.position} options
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PlayerProfileCard
                          player={signee}
                          subtitle={`${s.position} · ${s.previousClub} (new signing)`}
                          leaguePool={leaguePool}
                        />
                        {currentOptions.map((p) => (
                          <PlayerProfileCard
                            key={p.player_master_id}
                            player={p}
                            subtitle={`${p.role_label ?? p.position_group} (current squad)`}
                            leaguePool={leaguePool}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PlayerProfileCard
                        player={signee}
                        subtitle={`${s.position} · ${s.previousClub}`}
                        leaguePool={leaguePool}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{s.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Repositioning: {REPOSITIONING.nexusName}</h3>
        <p className="text-xs text-gray-500 mb-4">
          {REPOSITIONING.fromPosition} → {REPOSITIONING.toPosition}, likely replacing{" "}
          {REPOSITIONING.comparesTo}. The stats below are still from his role as {REPOSITIONING.fromPosition} last
          season — <b className="text-gray-900 dark:text-white">there's no track record yet as a {REPOSITIONING.toPosition}</b>, so this isn't an
          apples-to-apples comparison, just a general profile snapshot of the player.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {ferarri && (
            <PlayerProfileCard player={ferarri} subtitle={`${REPOSITIONING.fromPosition} (current position)`} leaguePool={leaguePool} />
          )}
          {damjanovic && (
            <PlayerProfileCard player={damjanovic} subtitle={`${REPOSITIONING.toPosition} (vacated position)`} leaguePool={leaguePool} />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{REPOSITIONING.note}</p>
      </div>

      {signeesNoData.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">New Signings — No Data Yet</h3>
          <p className="text-xs text-gray-500 mb-4">
            None of these players are yet in our database — most likely because they're recent signings or come
            from a league/level that isn't tracked. The notes below are from manual scouting observation, not statistical data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {signeesNoData.map((s) => (
              <div key={s.name} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {s.position} · from {s.previousClub}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                    No data
                  </span>
                </div>
                {s.likelyReplaces && (
                  <div className="text-xs text-gray-500 mb-2">
                    Likely replacing: <b className="text-gray-600 dark:text-gray-300">{s.likelyReplaces}</b>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
