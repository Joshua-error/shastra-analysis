'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureCourtsideSession } from '@/lib/supabase/autoAuth';
import type { PlayerFormEntry } from '@/lib/types';

interface Props {
  tournamentId: string;
  currentGameCount: number;
  nextGameNumber: number;
  editGame?: {
    id: string;
    game_number: number;
    team_a_name: string;
    team_b_name: string;
    scheduled_at: string | null;
    players_a: Array<{ id: string; name: string; jersey_number: number }>;
    players_b: Array<{ id: string; name: string; jersey_number: number }>;
  };
}

const emptyPlayer = (): PlayerFormEntry => ({ jersey_number: '', name: '' });

function RosterSection({
  team,
  teamName,
  players,
  onChange,
  onAdd,
  onRemove,
  error,
}: {
  team: 'A' | 'B';
  teamName: string;
  players: PlayerFormEntry[];
  onChange: (idx: number, field: keyof PlayerFormEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  error?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm">
          {team === 'A' ? '🔵' : '🔴'} {teamName || `Team ${team}`} — Roster
        </h3>
        <span className="text-gray-400 text-xs font-semibold">{players.length}/12</span>
      </div>

      <div className="space-y-2 mb-3">
        {players.map((player, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              max="99"
              placeholder="#"
              value={player.jersey_number}
              onChange={(e) => onChange(idx, 'jersey_number', e.target.value)}
              className="w-16 bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label={`Team ${team} player ${idx + 1} jersey number`}
            />
            <input
              type="text"
              placeholder="Player name"
              value={player.name}
              onChange={(e) => onChange(idx, 'name', e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label={`Team ${team} player ${idx + 1} name`}
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors text-lg"
              aria-label={`Remove player ${idx + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      {players.length < 12 ? (
        <button
          type="button"
          onClick={onAdd}
          className="w-full border border-dashed border-gray-600 hover:border-orange-500 text-gray-400 hover:text-orange-400 
                     rounded-lg py-2 text-sm font-semibold transition-colors"
        >
          + Add Player
        </button>
      ) : (
        <p className="text-center text-gray-500 text-xs py-2">Maximum 12 players reached</p>
      )}
    </div>
  );
}

export default function GameForm({ tournamentId, currentGameCount, nextGameNumber, editGame }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [gameNumber, setGameNumber] = useState(editGame?.game_number.toString() ?? nextGameNumber.toString());
  const [teamAName, setTeamAName] = useState(editGame?.team_a_name ?? '');
  const [teamBName, setTeamBName] = useState(editGame?.team_b_name ?? '');
  const [scheduledDate, setScheduledDate] = useState(
    editGame?.scheduled_at ? new Date(editGame.scheduled_at).toISOString().split('T')[0] : ''
  );
  const [scheduledTime, setScheduledTime] = useState(
    editGame?.scheduled_at ? new Date(editGame.scheduled_at).toTimeString().slice(0, 5) : ''
  );

  const [playersA, setPlayersA] = useState<PlayerFormEntry[]>(
    editGame?.players_a.map(p => ({ jersey_number: p.jersey_number.toString(), name: p.name })) ?? [emptyPlayer()]
  );
  const [playersB, setPlayersB] = useState<PlayerFormEntry[]>(
    editGame?.players_b.map(p => ({ jersey_number: p.jersey_number.toString(), name: p.name })) ?? [emptyPlayer()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rosterErrorA, setRosterErrorA] = useState('');
  const [rosterErrorB, setRosterErrorB] = useState('');

  const handlePlayerChange = useCallback(
    (team: 'A' | 'B', idx: number, field: keyof PlayerFormEntry, value: string) => {
      const setter = team === 'A' ? setPlayersA : setPlayersB;
      setter((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
    },
    []
  );

  const validateRoster = (players: PlayerFormEntry[], team: string): string => {
    const attempted = players.filter(p => p.name.trim() || p.jersey_number.trim());
    if (attempted.length === 0) {
      return ''; // Allowed to create game with empty roster initially if desired
    }

    for (const p of attempted) {
      if (!p.name.trim()) {
        return `Team ${team}: Player with jersey #${p.jersey_number} is missing a name.`;
      }
      if (!p.jersey_number.trim()) {
        return `Team ${team}: Player "${p.name}" is missing a jersey number.`;
      }
      if (isNaN(parseInt(p.jersey_number.trim()))) {
        return `Team ${team}: Jersey number for "${p.name}" must be a valid number.`;
      }
    }

    const jerseys = attempted.map(p => p.jersey_number.trim());
    const unique = new Set(jerseys);
    if (unique.size !== jerseys.length) {
      return `Team ${team} has duplicate jersey numbers.`;
    }
    return '';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setRosterErrorA('');
    setRosterErrorB('');

    const validA = playersA.filter(p => p.name.trim() && p.jersey_number.trim());
    const validB = playersB.filter(p => p.name.trim() && p.jersey_number.trim());

    const errA = validateRoster(playersA, 'A');
    const errB = validateRoster(playersB, 'B');
    if (errA) { setRosterErrorA(errA); return; }
    if (errB) { setRosterErrorB(errB); return; }

    setLoading(true);
    try {
      // Ensure background operator session exists to satisfy Supabase RLS policies
      const activeUser = await ensureCourtsideSession(supabase);

      const scheduledAt =
        scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : scheduledDate
          ? new Date(`${scheduledDate}T00:00`).toISOString()
          : null;

      if (editGame) {
        // Update existing game
        const { error: gameErr } = await supabase
          .from('games')
          .update({
            team_a_name: teamAName.trim(),
            team_b_name: teamBName.trim(),
            scheduled_at: scheduledAt,
          })
          .eq('id', editGame.id);
        if (gameErr) throw gameErr;

        // Delete old players and re-create
        const { error: delErr } = await supabase.from('players').delete().eq('game_id', editGame.id);
        if (delErr) throw delErr;

        const allPlayers = [
          ...validA.map(p => ({ game_id: editGame.id, team: 'A', name: p.name.trim(), jersey_number: parseInt(p.jersey_number) })),
          ...validB.map(p => ({ game_id: editGame.id, team: 'B', name: p.name.trim(), jersey_number: parseInt(p.jersey_number) })),
        ];
        if (allPlayers.length > 0) {
          const { error: playersErr } = await supabase.from('players').insert(allPlayers);
          if (playersErr) throw playersErr;
        }
      } else {
        // Create new game via API route (uses service role key to bypass RLS)
        const res = await fetch('/api/games/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_number: parseInt(gameNumber),
            team_a_name: teamAName.trim(),
            team_b_name: teamBName.trim(),
            scheduled_at: scheduledAt,
            players_a: validA,
            players_b: validB,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to create game');
        }
      }

      router.push('/games');
      router.refresh();
    } catch (err: any) {
      console.error('Save game error:', err?.message || JSON.stringify(err));
      const msg = err?.message || err?.details || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-bold text-white mb-5">Game Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Game Number
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={gameNumber}
              onChange={(e) => setGameNumber(e.target.value)}
              disabled={!!editGame}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>
          <div />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Team A Name
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              required
              placeholder="e.g. Blazers"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Team B Name
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              required
              placeholder="e.g. Thunder"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Date (optional)
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Time (optional)
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Rosters */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-bold text-white mb-5">Team Rosters</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RosterSection
            team="A"
            teamName={teamAName}
            players={playersA}
            onChange={(idx, field, value) => handlePlayerChange('A', idx, field, value)}
            onAdd={() => playersA.length < 12 && setPlayersA(prev => [...prev, emptyPlayer()])}
            onRemove={(idx) => setPlayersA(prev => prev.filter((_, i) => i !== idx))}
            error={rosterErrorA}
          />
          <RosterSection
            team="B"
            teamName={teamBName}
            players={playersB}
            onChange={(idx, field, value) => handlePlayerChange('B', idx, field, value)}
            onAdd={() => playersB.length < 12 && setPlayersB(prev => [...prev, emptyPlayer()])}
            onRemove={(idx) => setPlayersB(prev => prev.filter((_, i) => i !== idx))}
            error={rosterErrorB}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          {loading ? 'Saving…' : editGame ? 'Save Changes' : 'Create Game'}
        </button>
      </div>
    </form>
  );
}
