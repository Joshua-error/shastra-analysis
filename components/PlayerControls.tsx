'use client';

import type { PlayerWithStats, StatKey } from '@/lib/types';

interface Props {
  player: PlayerWithStats;
  onStat: (player: PlayerWithStats, stat: StatKey, delta: number) => void;
}

const OTHER_STATS: Array<{ key: StatKey; label: string }> = [
  { key: 'fouls', label: 'Fouls' },
  { key: 'rebounds', label: 'Rebounds' },
  { key: 'assists', label: 'Assists' },
  { key: 'steals', label: 'Steals' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'turnovers', label: 'Turnovers' },
];

export function PlayerCard({ player, onStat }: Props) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/50 hover:border-gray-600 rounded-2xl p-4 transition-all shadow-lg hover:shadow-xl">
      {/* Player identity */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 font-black text-lg">
            {player.jersey_number}
          </span>
          <span className="text-white font-bold text-lg tracking-wide truncate max-w-[150px]">{player.name}</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-3xl font-black text-white leading-none">{player.stats.points}</div>
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-1">PTS</span>
        </div>
      </div>

      {/* Points buttons */}
      <div className="flex gap-2 mb-5">
        {([1, 2, 3] as const).map((pts) => (
          <button
            key={pts}
            onClick={() => onStat(player, 'points', pts)}
            className={`flex-1 py-3.5 rounded-xl font-black text-white text-lg shadow-sm transition-transform active:scale-95 touch-manipulation
              ${pts === 1 ? 'bg-gradient-to-t from-green-700 to-green-600 hover:from-green-600 hover:to-green-500' :
                pts === 2 ? 'bg-gradient-to-t from-green-600 to-green-500 hover:from-green-500 hover:to-green-400' :
                            'bg-gradient-to-t from-green-500 to-green-400 hover:from-green-400 hover:to-green-300'}`}
            aria-label={`Increase ${player.name} points by ${pts}`}
          >
            +{pts}
          </button>
        ))}
      </div>

      {/* Other stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {OTHER_STATS.map(({ key, label }) => (
          <div key={key} className="bg-gray-800/60 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="text-gray-400 text-[10px] uppercase font-black tracking-widest text-center mb-2">{label}</div>
            <div className="flex items-center justify-between gap-1 bg-gray-900/50 rounded-lg p-1">
              <button
                onClick={() => onStat(player, key, -1)}
                className="w-8 h-8 rounded bg-gray-700/80 hover:bg-gray-600 text-gray-300 font-black text-lg flex items-center justify-center transition-colors active:scale-95"
                aria-label={`Decrease ${player.name} ${label}`}
              >
                −
              </button>
              <span className="text-white font-black text-base flex-1 text-center">{player.stats[key]}</span>
              <button
                onClick={() => onStat(player, key, 1)}
                className="w-8 h-8 rounded bg-gray-700/80 hover:bg-gray-600 text-gray-300 font-black text-lg flex items-center justify-center transition-colors active:scale-95"
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
