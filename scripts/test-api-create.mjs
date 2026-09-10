import fs from 'fs';
import path from 'path';

async function testApiCreate() {
  console.log('Testing /api/games/create endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/games/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_number: 1,
        team_a_name: 'Warriors',
        team_b_name: 'Bulls',
        players_a: [
          { name: 'Curry', jersey_number: 30 },
          { name: 'Thompson', jersey_number: 11 },
          { name: 'Green', jersey_number: 23 },
          { name: 'Wiggins', jersey_number: 22 },
          { name: 'Looney', jersey_number: 5 },
        ],
        players_b: [
          { name: 'LaVine', jersey_number: 8 },
          { name: 'DeRozan', jersey_number: 11 },
          { name: 'Vucevic', jersey_number: 9 },
          { name: 'White', jersey_number: 0 },
          { name: 'Caruso', jersey_number: 6 },
        ],
      }),
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('SUCCESS! Game created via server API!');
      process.exit(0);
    } else {
      console.error('API Error:', data.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    process.exit(1);
  }
}

testApiCreate();
