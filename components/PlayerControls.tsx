'use client';

import type { PlayerWithStats, StatKey } from '@/lib/types';

interface Props {
  player: PlayerWithStats;
  onStat: (player: PlayerWithStats, stat: StatKey, delta: number) => void;
  compact?: boolean;
}

const OTHER_STATS: Array<{ key: StatKey; label: string; short: string }> = [
  { key: 'fouls', label: 'Fouls', short: 'F' },
  { key: 'rebounds', label: 'Rebounds', short: 'R' },
  { key: 'assists', label: 'Assists', short: 'A' },
  { key: 'steals', label: 'Steals', short: 'S' },
  { key: 'blocks', label: 'Blocks', short: 'B' },
  { key: 'turnovers', label: 'Turnovers', short: 'TO' },
];

// ── Compact desktop row layout ──────────────────────────────
export function PlayerRow({ player, onStat }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      {/* Identity */}
      <div className="w-36 flex-shrink-0">
        <span className="text-orange-400 font-black text-sm mr-1.5">#{player.jersey_number}</span>
        <span className="text-white font-semibold text-sm">{player.name}</span>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onStat(player, 'points', 1)}
          className="point-btn bg-green-700 hover:bg-green-600 text-white"
          aria-label={`Increase ${player.name} points by 1`}
        >+1</button>
        <button
          onClick={() => onStat(player, 'points', 2)}
          className="point-btn bg-green-600 hover:bg-green-500 text-white"
          aria-label={`Increase ${player.name} points by 2`}
        >+2</button>
        <button
          onClick={() => onStat(player, 'points', 3)}
          className="point-btn bg-green-500 hover:bg-green-400 text-white"
          aria-label={`Increase ${player.name} points by 3`}
        >+3</button>
        <span className="text-white font-black text-lg w-8 text-center">{player.stats.points}</span>
      </div>

      {/* Other stats */}
      {OTHER_STATS.map(({ key, label, short }) => (
        <div key={key} className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onStat(player, key, -1)}
            className="stat-btn w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
            aria-label={`Decrease ${player.name} ${label}`}
          >−</button>
          <span className="text-white font-bold text-sm w-6 text-center">{player.stats[key]}</span>
          <button
            onClick={() => onStat(player, key, 1)}
            className="stat-btn w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
            aria-label={`Increase ${player.name} ${label}`}
          >+</button>
          <span className="text-gray-500 text-xs w-5">{short}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mobile card layout ─────────────────────────────────────
export function PlayerCard({ player, onStat }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
      {/* Player identity */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-orange-400 font-black text-xl mr-2">#{player.jersey_number}</span>
          <span className="text-white font-bold text-base">{player.name}</span>
        </div>
        <div className="text-2xl font-black text-white">{player.stats.points} <span className="text-gray-500 text-sm font-normal">pts</span></div>
      </div>

      {/* Points buttons */}
      <div className="flex gap-2 mb-4">
        {([1, 2, 3] as const).map((pts) => (
          <button
            key={pts}
            onClick={() => onStat(player, 'points', pts)}
            className={`flex-1 py-4 rounded-xl font-black text-white text-lg touch-manipulation
              ${pts === 1 ? 'bg-green-700 hover:bg-green-600 active:bg-green-800' :
                pts === 2 ? 'bg-green-600 hover:bg-green-500 active:bg-green-700' :
                            'bg-green-500 hover:bg-green-400 active:bg-green-600'}`}
            aria-label={`Increase ${player.name} points by ${pts}`}
          >
            +{pts}
          </button>
        ))}
      </div>

      {/* Other stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {OTHER_STATS.map(({ key, label, short }) => (
          <div key={key} className="bg-gray-800 rounded-xl p-2.5">
            <div className="text-gray-400 text-xs font-bold mb-1.5">{label}</div>
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => onStat(player, key, -1)}
                className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center touch-manipulation"
                aria-label={`Decrease ${player.name} ${label}`}
              >
                −
              </button>
              <span className="text-white font-black text-lg flex-1 text-center">{player.stats[key]}</span>
              <button
                onClick={() => onStat(player, key, 1)}
                className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center touch-manipulation"
                aria-label={`Increase ${player.name} ${label}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
