import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function ReopenGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase.from('games').select('*').eq('id', id).single();
  if (!game) notFound();
  if (game.status !== 'completed') redirect(`/live/${id}`);

  // Server-side reopen
  const { error } = await supabase.rpc('reopen_game', { p_game_id: id });
  if (error) {
    redirect('/games');
  }

  redirect(`/live/${id}`);
}
