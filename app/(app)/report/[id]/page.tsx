import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Player, PlayerGameStats, PlayerWithStats } from '@/lib/types';
import {
  calculateMvpScore,
  calculateDefenderScore,
  formatScore,
} from '@/lib/calculations';
import ReopenGameButton from '@/components/ReopenGameButton';
import PrintButton from '@/components/PrintButton';

function StatTable({
  players,
  teamName,
  mvpPlayerIds,
  defenderPlayerIds,
}: {
  players: PlayerWithStats[];
  teamName: string;
  mvpPlayerIds: Set<string>;
  defenderPlayerIds: Set<string>;
}) {
  return (
    <div className="mb-8 print-container">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="text-gray-400">Team</span> {teamName}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['#', 'Player', 'PTS', 'F', 'REB', 'AST', 'STL', 'BLK', 'TO', 'MVP Score', 'Def Score'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-gray-400 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="px-3 py-2 text-gray-400 font-bold text-xs uppercase">Awards</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const mvpScore = calculateMvpScore(player.stats);
              const defScore = calculateDefenderScore(player.stats);
              const isMvp = mvpPlayerIds.has(player.id);
              const isDef = defenderPlayerIds.has(player.id);
              return (
                <tr
                  key={player.id}
                  className={`border-b border-gray-800 ${isMvp || isDef ? 'bg-yellow-500/5' : ''}`}
                >
                  <td className="px-3 py-3 text-orange-400 font-black">#{player.jersey_number}</td>
                  <td className="px-3 py-3 text-white font-semibold whitespace-nowrap">{player.name}</td>
                  <td className="px-3 py-3 text-white font-bold">{player.stats.points}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.fouls}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.rebounds}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.assists}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.steals}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.blocks}</td>
                  <td className="px-3 py-3 text-gray-300">{player.stats.turnovers}</td>
                  <td className="px-3 py-3 text-yellow-300 font-bold">{formatScore(mvpScore)}</td>
                  <td className="px-3 py-3 text-blue-300 font-bold">{formatScore(defScore)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {isMvp && (
                        <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-bold px-2 py-0.5 rounded-full print-badge">
                          MVP
                        </span>
                      )}
                      {isDef && (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold px-2 py-0.5 rounded-full print-badge">
                          DEF
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase.from('games').select('*').eq('id', id).single();
  if (!game) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', id)
    .order('jersey_number', { ascending: true });

  const { data: stats } = await supabase
    .from('player_game_stats')
    .select('*')
    .eq('game_id', id);

  const allPlayers = (players as Player[]) ?? [];
  const allStats = (stats as PlayerGameStats[]) ?? [];
  const statsMap = new Map(allStats.map((s) => [s.player_id, s]));

  const defaultStats = (playerId: string): PlayerGameStats => ({
    id: '', game_id: id, player_id: playerId,
    points: 0, fouls: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
    mvp_score: null, defender_score: null, updated_at: new Date().toISOString(),
  });

  const withStats = (team: 'A' | 'B'): PlayerWithStats[] =>
    allPlayers
      .filter((p) => p.team === team)
      .map((p) => ({ ...p, stats: statsMap.get(p.id) ?? defaultStats(p.id) }));

  const teamA = withStats('A');
  const teamB = withStats('B');
  const allWithStats = [...teamA, ...teamB];

  // Live-calculate awards for display (also stored in DB after finalize)
  const scored = allWithStats.map((p) => ({
    id: p.id,
    name: p.name,
    jersey: p.jersey_number,
    team: p.team,
    mvpScore: calculateMvpScore(p.stats),
    defScore: calculateDefenderScore(p.stats),
    stats: p.stats,
  }));

  const maxMvp = scored.length > 0 ? Math.max(...scored.map((s) => s.mvpScore)) : 0;
  const maxDef = scored.length > 0 ? Math.max(...scored.map((s) => s.defScore)) : 0;
  const mvps = scored.filter((s) => s.mvpScore === maxMvp && maxMvp > 0);
  const defenders = scored.filter((s) => s.defScore === maxDef && maxDef > 0);

  const mvpIds = new Set(mvps.map((m) => m.id));
  const defIds = new Set(defenders.map((d) => d.id));

  const teamAScore = teamA.reduce((s, p) => s + p.stats.points, 0);
  const teamBScore = teamB.reduce((s, p) => s + p.stats.points, 0);

  const tournament = await supabase
    .from('tournaments')
    .select('name')
    .eq('id', game.tournament_id)
    .single();
  const tournamentName = tournament.data?.name ?? 'Basketball Tournament';

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      {/* Action bar — no print */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-3xl font-black text-white">Game Report</h1>
          <p className="text-gray-400 mt-1">Game {game.game_number} — {game.status === 'completed' ? 'Final' : 'In Progress'}</p>
        </div>
        <div className="flex gap-3">
          {game.status === 'completed' && <ReopenGameButton gameId={game.id} />}
          <PrintButton />
        </div>
      </div>

      {/* ── PRINTABLE CONTENT ── */}
      <div id="printable-report">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="text-gray-400 text-sm font-semibold mb-1">{tournamentName}</div>
          <h2 className="text-2xl font-black text-white mb-4">Game {game.game_number}</h2>

          {game.scheduled_at && (
            <p className="text-gray-400 text-sm mb-4">
              {new Date(game.scheduled_at).toLocaleString()}
            </p>
          )}

          {/* Final score */}
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-gray-400 text-sm font-semibold mb-1">{game.team_a_name}</div>
              <div className="text-orange-400 font-black text-6xl">{teamAScore}</div>
            </div>
            <div className="text-gray-600 font-bold text-2xl">–</div>
            <div className="text-center">
              <div className="text-gray-400 text-sm font-semibold mb-1">{game.team_b_name}</div>
              <div className="text-blue-400 font-black text-6xl">{teamBScore}</div>
            </div>
          </div>

          {teamAScore !== teamBScore && (
            <p className="text-center text-gray-400 text-sm mt-3 font-semibold">
              🏆 Winner: {teamAScore > teamBScore ? game.team_a_name : game.team_b_name}
            </p>
          )}
        </div>

        {/* Awards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* MVP */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
              🏅 {mvps.length > 1 ? 'Co-MVPs' : 'MVP'}
            </div>
            {mvps.length === 0 ? (
              <p className="text-gray-500 text-sm">No data</p>
            ) : (
              mvps.map((m) => (
                <div key={m.id} className="mb-2">
                  <div className="text-yellow-300 font-black text-xl">#{m.jersey} {m.name}</div>
                  <div className="text-gray-400 text-sm">
                    Team {m.team} · MVP Score: <span className="text-yellow-300 font-bold">{formatScore(m.mvpScore)}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {m.stats.points}pts · {m.stats.rebounds}reb · {m.stats.assists}ast · {m.stats.steals}stl · {m.stats.blocks}blk
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Best Defender */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
              🛡 {defenders.length > 1 ? 'Co-Best Defenders' : 'Best Defender'}
            </div>
            {defenders.length === 0 ? (
              <p className="text-gray-500 text-sm">No data</p>
            ) : (
              defenders.map((d) => (
                <div key={d.id} className="mb-2">
                  <div className="text-blue-300 font-black text-xl">#{d.jersey} {d.name}</div>
                  <div className="text-gray-400 text-sm">
                    Team {d.team} · Def Score: <span className="text-blue-300 font-bold">{formatScore(d.defScore)}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {d.stats.steals}stl · {d.stats.blocks}blk · {d.stats.rebounds}reb · {d.stats.fouls}f
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats tables */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Complete Statistics</h2>
          <StatTable players={teamA} teamName={game.team_a_name} mvpPlayerIds={mvpIds} defenderPlayerIds={defIds} />
          <StatTable players={teamB} teamName={game.team_b_name} mvpPlayerIds={mvpIds} defenderPlayerIds={defIds} />
        </div>
      </div>
    </div>
  );
}
