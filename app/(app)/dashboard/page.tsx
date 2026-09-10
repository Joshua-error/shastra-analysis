import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Game, Tournament } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Load tournament directly (no authentication required)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Tournament | null };

  let games: Game[] = [];
  let inProgress: Game[] = [];
  let nextGame: Game | null = null;
  let recentCompleted: Game[] = [];

  if (tournament) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('game_number', { ascending: true });

    games = (data as Game[]) ?? [];
    inProgress = games.filter((g) => g.status === 'in_progress');
    nextGame = games.find((g) => g.status === 'upcoming') ?? null;
    recentCompleted = games.filter((g) => g.status === 'completed').slice(-3).reverse();
  }

  const completed = games.filter((g) => g.status === 'completed').length;
  const upcoming = games.filter((g) => g.status === 'upcoming').length;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          {tournament ? tournament.name : 'Basketball Tournament'}
        </h1>
        <p className="text-gray-400 mt-1">Live stat tracking dashboard</p>
      </div>

      {/* No tournament yet */}
      {!tournament && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center mb-8">
          <div className="text-5xl mb-4">🏀</div>
          <h2 className="text-xl font-bold text-white mb-2">No Tournament Yet</h2>
          <p className="text-gray-400 mb-6">Create your first game to get started.</p>
          <Link
            href="/games/new"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            + Create First Game
          </Link>
        </div>
      )}

      {/* Stats row */}
      {tournament && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Games', value: games.length, suffix: '/20', color: 'text-white' },
              { label: 'Completed', value: completed, color: 'text-green-400' },
              { label: 'In Progress', value: inProgress.length, color: 'text-orange-400' },
              { label: 'Upcoming', value: upcoming, color: 'text-blue-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className={`text-3xl font-black ${stat.color}`}>
                  {stat.value}{stat.suffix ?? ''}
                </div>
                <div className="text-gray-400 text-sm font-semibold mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Active game alert */}
          {inProgress.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Live Now</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    Game {inProgress[0].game_number}: {inProgress[0].team_a_name} vs {inProgress[0].team_b_name}
                  </h2>
                </div>
                <Link
                  href={`/live/${inProgress[0].id}`}
                  className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
                >
                  📡 Open Live Game
                </Link>
              </div>
            </div>
          )}

          {/* Next game */}
          {nextGame && inProgress.length === 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Next Game</div>
                  <h2 className="text-lg font-bold text-white">
                    Game {nextGame.game_number}: {nextGame.team_a_name} vs {nextGame.team_b_name}
                  </h2>
                  {nextGame.scheduled_at && (
                    <p className="text-gray-400 text-sm mt-0.5">
                      {new Date(nextGame.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Link
                  href={`/games/${nextGame.id}/start`}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
                >
                  ▶ Start Game
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link
              href="/games/new"
              className={`flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors group ${games.length >= 20 ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span className="text-2xl">➕</span>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">Add Game</div>
                <div className="text-gray-500 text-xs">{games.length}/20 games</div>
              </div>
            </Link>
            <Link
              href={inProgress[0] ? `/live/${inProgress[0].id}` : '/games'}
              className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors group"
            >
              <span className="text-2xl">📡</span>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">Live Game</div>
                <div className="text-gray-500 text-xs">{inProgress[0] ? 'In progress' : 'No active game'}</div>
              </div>
            </Link>
            <Link
              href="/history"
              className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors group"
            >
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">View History</div>
                <div className="text-gray-500 text-xs">{completed} completed games</div>
              </div>
            </Link>
          </div>

          {/* Recent results */}
          {recentCompleted.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Recent Results</h2>
              <div className="space-y-3">
                {recentCompleted.map((game) => (
                  <Link
                    key={game.id}
                    href={`/report/${game.id}`}
                    className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-5 py-4 transition-colors"
                  >
                    <div>
                      <div className="text-xs text-gray-500 font-semibold mb-0.5">Game {game.game_number}</div>
                      <div className="font-bold text-white text-sm">
                        {game.team_a_name} vs {game.team_b_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-white">
                        {game.team_a_score} – {game.team_b_score}
                      </div>
                      <div className="text-xs text-gray-500">
                        {game.finished_at ? new Date(game.finished_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
