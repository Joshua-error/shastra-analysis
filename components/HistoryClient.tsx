'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Game } from '@/lib/types';

interface HistoryEntry extends Game {
  mvp_name?: string;
  mvp_jersey?: number;
  defender_name?: string;
  defender_jersey?: number;
}

export default function HistoryClient({ games }: { games: HistoryEntry[] }) {
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filtered = games.filter((g) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      g.team_a_name.toLowerCase().includes(q) ||
      g.team_b_name.toLowerCase().includes(q) ||
      g.game_number.toString().includes(q) ||
      g.mvp_name?.toLowerCase().includes(q) ||
      g.defender_name?.toLowerCase().includes(q);

    const matchesDate =
      !filterDate ||
      (g.finished_at && g.finished_at.startsWith(filterDate));

    return matchesSearch && matchesDate;
  });

  return (
    <>
      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search team, game, player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
        />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {(search || filterDate) && (
          <button
            onClick={() => { setSearch(''); setFilterDate(''); }}
            className="text-gray-400 hover:text-white text-sm px-3"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No matching games found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((game) => (
            <div
              key={game.id}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-bold mb-1">
                    Game {game.game_number} · {game.finished_at ? new Date(game.finished_at).toLocaleDateString() : ''}
                  </div>
                  <div className="text-lg font-bold text-white flex items-center gap-3">
                    {game.team_a_name}
                    <span className="text-white font-black text-xl">{game.team_a_score}–{game.team_b_score}</span>
                    {game.team_b_name}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    {game.mvp_name && (
                      <span>🏅 MVP: #{game.mvp_jersey} {game.mvp_name}</span>
                    )}
                    {game.defender_name && (
                      <span>🛡 Def: #{game.defender_jersey} {game.defender_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/report/${game.id}`}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    View Report
                  </Link>
                  <Link
                    href={`/games/${game.id}/reopen`}
                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Reopen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
