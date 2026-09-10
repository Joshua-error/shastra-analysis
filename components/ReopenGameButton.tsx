'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ReopenGameButton({ gameId }: { gameId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleReopen() {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('reopen_game', { p_game_id: gameId });
      if (error) throw error;
      router.push(`/live/${gameId}`);
      router.refresh();
    } catch (err) {
      console.error('Reopen failed:', err);
      setLoading(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white text-xs font-semibold">Reopen game?</span>
        <button
          onClick={() => setShowConfirm(false)}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold px-3 py-1.5 rounded-lg text-xs"
        >Cancel</button>
        <button
          onClick={handleReopen}
          disabled={loading}
          className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
        >
          {loading ? 'Reopening…' : '✓ Reopen'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors no-print"
    >
      ↩ Reopen / Edit
    </button>
  );
}
