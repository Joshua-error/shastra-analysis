'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function FinishGameButton({ gameId }: { gameId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleFinish() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.rpc('finalize_game', { p_game_id: gameId });
      if (error) throw error;
      router.push(`/report/${gameId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finalize game');
      setLoading(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white text-xs font-semibold">Finish this game?</span>
        <button
          onClick={() => setShowConfirm(false)}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold px-3 py-1.5 rounded-lg text-xs"
        >
          Cancel
        </button>
        <button
          onClick={handleFinish}
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs"
        >
          {loading ? 'Finalizing…' : '✓ Confirm Finish'}
        </button>
        {error && <span className="text-red-400 text-xs">⚠ {error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
    >
      🏁 Finish Game
    </button>
  );
}
