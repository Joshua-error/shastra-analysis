'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function StartGamePage({ gameId, gameNumber, teamA, teamB }: {
  gameId: string;
  gameNumber: number;
  teamA: string;
  teamB: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', gameId);
      if (error) throw error;
      router.push(`/live/${gameId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto pt-20">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🏀</div>
        <h1 className="text-2xl font-black text-white mb-1">Game {gameNumber}</h1>
        <p className="text-gray-300 font-semibold mb-2">
          {teamA} <span className="text-gray-500">vs</span> {teamB}
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Once started, the roster cannot be edited.
        </p>

        {error && (
          <div className="bg-red-950 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
            ⚠ {error}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-white font-black px-8 py-3 rounded-xl transition-colors text-lg"
          >
            {loading ? 'Starting…' : '▶ START GAME'}
          </button>
        </div>
      </div>
    </div>
  );
}
