import { createClient } from '@/lib/supabase/server';
import type { Player, PlayerGameStats, PlayerWithStats } from '@/lib/types';
import {
  calculateMvpScore,
  calculateDefenderScore,
  calculateTournamentStats,
  formatScore,
} from '@/lib/calculations';

export default async function TournamentPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tournament) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-4">Tournament Stats</h1>
        <p className="text-gray-400">No tournament data yet.</p>
      </div>
    );
  }

  // Load all completed games
  const { data: games } = await supabase
    .from('games')
    .select('id, game_number, team_a_name, team_b_name, team_a_score, team_b_score, status')
    .eq('tournament_id', tournament.id)
    .eq('status', 'completed')
    .order('game_number');

  const completedGames = games ?? [];

  // Load all players + stats for completed games
  const gameIds = completedGames.map((g: { id: string }) => g.id);

  let allWithStats: PlayerWithStats[] = [];
  if (gameIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .in('game_id', gameIds);
    const { data: stats } = await supabase
      .from('player_game_stats')
      .select('*')
      .in('game_id', gameIds);

    const allPlayers = (players as Player[]) ?? [];
    const allStats = (stats as PlayerGameStats[]) ?? [];
    const statsMap = new Map(allStats.map((s) => [s.player_id, s]));

    allWithStats = allPlayers.map((p) => ({
      ...p,
      stats: statsMap.get(p.id) ?? {
        id: '', game_id: p.game_id, player_id: p.id,
        points: 0, fouls: 0, rebounds: 0, assists: 0,
        steals: 0, blocks: 0, turnovers: 0,
        mvp_score: null, defender_score: null,
        updated_at: new Date().toISOString(),
      },
    }));
  }

  const tournamentStats = calculateTournamentStats(allWithStats);

  // Top performers
  const withScores = allWithStats.map((p) => ({
    ...p,
    mvpScore: calculateMvpScore(p.stats),
    defScore: calculateDefenderScore(p.stats),
  }));

  const topScorers = [...withScores].sort((a, b) => b.stats.points - a.stats.points).slice(0, 5);
  const topMvp = [...withScores].sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 5);
  const topDef = [...withScores].sort((a, b) => b.defScore - a.defScore).slice(0, 5);

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">{tournament.name}</h1>
        <p className="text-gray-400 mt-1">Tournament Statistics</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Points', value: tournamentStats.totals.points },
          { label: 'Total Rebounds', value: tournamentStats.totals.rebounds },
          { label: 'Total Assists', value: tournamentStats.totals.assists },
          { label: 'Total Steals', value: tournamentStats.totals.steals },
          { label: 'Total Blocks', value: tournamentStats.totals.blocks },
          { label: 'Total Turnovers', value: tournamentStats.totals.turnovers },
          { label: 'Total Fouls', value: tournamentStats.totals.fouls },
          { label: 'Players', value: allWithStats.length },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-gray-400 text-xs font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top performers */}
      {allWithStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Top Scorers */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-4">🏀 Top Scorers</h3>
            <ol className="space-y-2">
              {topScorers.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 text-xs mr-2">{i + 1}.</span>
                    <span className="text-white font-semibold text-sm">#{p.jersey_number} {p.name}</span>
                  </div>
                  <span className="text-green-400 font-black">{p.stats.points}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Top MVP Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-4">🏅 Top MVP Score</h3>
            <ol className="space-y-2">
              {topMvp.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 text-xs mr-2">{i + 1}.</span>
                    <span className="text-white font-semibold text-sm">#{p.jersey_number} {p.name}</span>
                  </div>
                  <span className="text-yellow-300 font-black">{formatScore(p.mvpScore)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Top Defender */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-4">🛡 Top Defenders</h3>
            <ol className="space-y-2">
              {topDef.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 text-xs mr-2">{i + 1}.</span>
                    <span className="text-white font-semibold text-sm">#{p.jersey_number} {p.name}</span>
                  </div>
                  <span className="text-blue-300 font-black">{formatScore(p.defScore)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {allWithStats.length === 0 && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400">Complete some games to see tournament statistics.</p>
        </div>
      )}
    </div>
  );
}
