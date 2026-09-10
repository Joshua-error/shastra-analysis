import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Testing Supabase Connection to:', url);

if (!url || !key) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testGameCreation() {
  try {
    // 1. Silent auth or anonymous auth if needed
    console.log('Attempting authentication...');
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const demoEmail = 'courtside@tournament.com';
      const demoPassword = 'Password123!';

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (!signInErr && signInData?.user) {
        user = signInData.user;
        console.log('Signed in as courtside operator:', user.id);
      } else {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
        });

        if (!signUpErr && signUpData?.user) {
          const { data: retryData } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: demoPassword,
          });
          user = retryData?.user ?? signUpData.user;
          console.log('Registered and signed in as:', user?.id);
        } else {
          console.log('SignUp error (rate limit or disable):', signUpErr?.message);
        }
      }
    } else {
      console.log('Already authenticated as:', user.id);
    }

    // 2. Check for existing tournament or create one
    console.log('Checking tournament table...');
    let { data: tournament, error: tFetchErr } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tFetchErr) {
      console.error('Fetch tournament error:', tFetchErr);
    }

    if (!tournament) {
      console.log('Creating new tournament...');
      const payload = { name: 'Championship Tournament 2026' };
      if (user?.id) payload.created_by = user.id;

      const { data: newT, error: tInsErr } = await supabase
        .from('tournaments')
        .insert(payload)
        .select()
        .single();

      if (tInsErr) {
        console.error('Insert tournament error:', tInsErr);
        // Try fallback insert without created_by
        const { data: fbT, error: fbErr } = await supabase
          .from('tournaments')
          .insert({ name: 'Championship Tournament 2026' })
          .select()
          .single();
        if (fbErr) {
          console.error('Fallback tournament insert error:', fbErr);
          throw fbErr;
        }
        tournament = fbT;
      } else {
        tournament = newT;
      }
    }

    console.log('Tournament ID:', tournament.id);

    // 3. Create a sample game
    console.log('Creating Game 1 (Lakers vs Celtics)...');
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        tournament_id: tournament.id,
        game_number: 1,
        team_a_name: 'Lakers',
        team_b_name: 'Celtics',
        status: 'upcoming',
      })
      .select()
      .single();

    if (gameErr) {
      console.error('Insert game error:', gameErr);
      throw gameErr;
    }

    console.log('Game Created Successfully! Game ID:', game.id);

    // 4. Create sample rosters (5 players per team)
    console.log('Creating sample rosters...');
    const playersA = [
      { game_id: game.id, team: 'A', name: 'LeBron James', jersey_number: 23 },
      { game_id: game.id, team: 'A', name: 'Anthony Davis', jersey_number: 3 },
      { game_id: game.id, team: 'A', name: 'D\'Angelo Russell', jersey_number: 1 },
      { game_id: game.id, team: 'A', name: 'Austin Reaves', jersey_number: 15 },
      { game_id: game.id, team: 'A', name: 'Rui Hachimura', jersey_number: 28 },
    ];

    const playersB = [
      { game_id: game.id, team: 'B', name: 'Jayson Tatum', jersey_number: 0 },
      { game_id: game.id, team: 'B', name: 'Jaylen Brown', jersey_number: 7 },
      { game_id: game.id, team: 'B', name: 'Jrue Holiday', jersey_number: 4 },
      { game_id: game.id, team: 'B', name: 'Derrick White', jersey_number: 9 },
      { game_id: game.id, team: 'B', name: 'Kristaps Porzingis', jersey_number: 8 },
    ];

    const { data: insertedPlayers, error: pErr } = await supabase
      .from('players')
      .insert([...playersA, ...playersB])
      .select();

    if (pErr) {
      console.error('Insert players error:', pErr);
      throw pErr;
    }

    console.log(`Inserted ${insertedPlayers.length} players!`);

    // 5. Create player_game_stats
    const statsRows = insertedPlayers.map(p => ({
      game_id: p.game_id,
      player_id: p.id,
      points: 0,
      fouls: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
    }));

    const { error: sErr } = await supabase.from('player_game_stats').insert(statsRows);
    if (sErr) {
      console.error('Insert stats error:', sErr);
      throw sErr;
    }

    console.log('SUCCESS! Sample Game, Rosters, and Stats successfully created in database!');
    process.exit(0);
  } catch (err) {
    console.error('FAILED TEST:', err);
    process.exit(1);
  }
}

testGameCreation();
