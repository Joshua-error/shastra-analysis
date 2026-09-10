'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { GameWithPlayers, StatKey } from '@/lib/types';
import { useLiveGame } from '@/lib/hooks/useLiveGame';
import { useGameTimer } from '@/lib/hooks/useGameTimer';
import { PlayerCard } from '@/components/PlayerControls';
import FinishGameButton from '@/components/FinishGameButton';

const STAT_HEADERS: Array<{ key: StatKey | 'pts'; label: string }> = [
  { key: 'pts', label: 'PTS' },
  { key: 'fouls', label: 'F' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'steals', label: 'STL' },
  { key: 'blocks', label: 'BLK' },
  { key: 'turnovers', label: 'TO' },
];

function SaveIndicator({ status }: { status: string }) {
  if (status === 'saving') return <span className="save-status text-yellow-400">⟳ Saving…</span>;
  if (status === 'saved') return <span className="save-status text-green-400">● Saved</span>;
  if (status === 'error') return <span className="save-status text-red-400">⚠ Sync error — retrying</span>;
  return null;
}

interface Props {
  initialGame: GameWithPlayers;
}

export default function LiveGameClient({ initialGame }: Props) {
  const { game, saveStatus, undoStack, recordStat, undo, canUndo } = useLiveGame(initialGame);
  const timer = useGameTimer();
  const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');
  const [undoMsg, setUndoMsg] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Ctrl+Z / Cmd+Z keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack]);

  const handleUndo = useCallback(async () => {
    const last = undoStack[0];
    if (!last) return;
    await undo();
    const statName = last.stat.charAt(0).toUpperCase() + last.stat.slice(1);
    const sign = last.delta > 0 ? `+${last.delta}` : `${last.delta}`;
    setUndoMsg(`Undid ${last.playerName}'s ${sign} ${statName}`);
    setTimeout(() => setUndoMsg(''), 3000);
  }, [undo, undoStack]);

  const teamAScore = game.players_a.reduce((s, p) => s + p.stats.points, 0);
  const teamBScore = game.players_b.reduce((s, p) => s + p.stats.points, 0);

  return (
    <div className="min-h-screen bg-gray-950 pb-32 md:pb-6">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-gray-950 border-b border-gray-800 no-print">
        <div className="px-4 py-3">
          {/* Game header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/games" className="text-gray-400 hover:text-white transition-colors text-sm">
                ← Games
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-300 font-bold text-sm">
                Game {game.game_number}
              </span>
              <SaveIndicator status={saveStatus} />
            </div>
            <FinishGameButton gameId={game.id} />
          </div>

          {/* Scoreboard */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-right flex-1">
              <div className="text-white font-bold text-sm md:text-base truncate">{game.team_a_name}</div>
              <div className="text-orange-400 font-black text-4xl md:text-5xl leading-none">{teamAScore}</div>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-gray-600 font-bold text-lg">VS</span>
              {/* Timer */}
              <div className="text-gray-300 font-mono text-xl font-bold">{timer.formatted}</div>
              <div className="flex gap-1">
                {timer.status !== 'running' ? (
                  <button
                    onClick={timer.start}
                    className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold px-3 py-1 rounded"
                    aria-label="Start timer"
                  >▶</button>
                ) : (
                  <button
                    onClick={timer.pause}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-bold px-3 py-1 rounded"
                    aria-label="Pause timer"
                  >⏸</button>
                )}
                <button
                  onClick={timer.reset}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded"
                  aria-label="Reset timer"
                >↺</button>
              </div>
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-sm md:text-base truncate">{game.team_b_name}</div>
              <div className="text-blue-400 font-black text-4xl md:text-5xl leading-none">{teamBScore}</div>
            </div>
          </div>
        </div>

        {/* Mobile team tabs */}
        <div className="lg:hidden flex border-t border-gray-800">
          <button
            onClick={() => setActiveTeam('A')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              activeTeam === 'A'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            {game.team_a_name}
          </button>
          <button
            onClick={() => setActiveTeam('B')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              activeTeam === 'B'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            {game.team_b_name}
          </button>
        </div>
      </div>

      {/* Undo toast */}
      {undoMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 rounded-xl px-5 py-3 text-white text-sm font-semibold shadow-2xl">
          ↩ {undoMsg}
        </div>
      )}

    {/* ── Desktop: side by side ── */}
      {isDesktop ? (
        <div className="flex">
          {/* Team A panel */}
          <div className="flex-1 min-w-0 border-r border-gray-800">
            <div className="px-6 py-4 bg-orange-500/10 border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-orange-400 text-lg">{game.team_a_name}</span>
              <span className="text-orange-400 font-black text-2xl">{teamAScore}</span>
            </div>
            
            <div className="p-4 grid grid-cols-1 2xl:grid-cols-2 gap-4">
              {game.players_a.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onStat={recordStat}
                />
              ))}
              {game.players_a.length === 0 && (
                <p className="text-gray-500 text-sm p-4 col-span-full">No players on this team.</p>
              )}
            </div>
          </div>

          {/* Team B panel */}
          <div className="flex-1 min-w-0">
            <div className="px-6 py-4 bg-blue-500/10 border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-blue-400 text-lg">{game.team_b_name}</span>
              <span className="text-blue-400 font-black text-2xl">{teamBScore}</span>
            </div>
            
            <div className="p-4 grid grid-cols-1 2xl:grid-cols-2 gap-4">
              {game.players_b.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onStat={recordStat}
                />
              ))}
              {game.players_b.length === 0 && (
                <p className="text-gray-500 text-sm p-4 col-span-full">No players on this team.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mobile: one team at a time */
        <div className="p-4">
          {activeTeam === 'A'
            ? game.players_a.map((player) => (
                <PlayerCard key={player.id} player={player} onStat={recordStat} />
              ))
            : game.players_b.map((player) => (
                <PlayerCard key={player.id} player={player} onStat={recordStat} />
              ))
          }
          {((activeTeam === 'A' && game.players_a.length === 0) ||
            (activeTeam === 'B' && game.players_b.length === 0)) && (
            <p className="text-gray-500 text-sm text-center py-8">No players on this team.</p>
          )}
        </div>
      )}

      {/* ── Undo button — fixed bottom left ── */}
      <div className="fixed bottom-20 md:bottom-6 left-4 z-40 no-print">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-2xl transition-all
            ${canUndo
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
              : 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed'
            }`}
          aria-label="Undo last action (Ctrl+Z)"
          title="Undo last action (Ctrl+Z)"
        >
          ↩ Undo {canUndo && undoStack[0] && (
            <span className="text-gray-400 text-xs font-normal">
              {undoStack[0].playerName.split(' ')[0]}&apos;s {undoStack[0].stat}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
