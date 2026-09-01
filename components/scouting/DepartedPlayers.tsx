// components/scouting/DepartedPlayers.tsx
import { DepartedPlayerInput } from "@/lib/scouting/departedPlayers";

function Group({
  title,
  list,
}: {
  title: string;
  list: DepartedPlayerInput[];
}) {
  if (list.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((s) => (
          <div key={s.name} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg px-4 py-3">
            <div className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</div>
            {(s.note || s.origin) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{[s.note, s.origin].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DepartedPlayers({
  teamName,
  list,
}: {
  teamName: string;
  list: DepartedPlayerInput[];
}) {
  if (list.length === 0) return null;
  const asing = list.filter((s) => s.group === "asing");
  const lokal = list.filter((s) => s.group === "lokal");

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Departed Players</h3>
        <p className="text-xs text-gray-500">No longer at {teamName} this season.</p>
      </div>
      <Group title="Departed Foreign Players" list={asing} />
      <Group title="Departed Local Players" list={lokal} />
    </div>
  );
}
