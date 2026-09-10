import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import StartGameClient from '@/components/StartGameClient';

export default async function StartGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (!game) notFound();
  if (game.status === 'in_progress') redirect(`/live/${id}`);
  if (game.status === 'completed') redirect(`/report/${id}`);

  return (
    <StartGameClient
      gameId={game.id}
      gameNumber={game.game_number}
      teamA={game.team_a_name}
      teamB={game.team_b_name}
    />
  );
}
