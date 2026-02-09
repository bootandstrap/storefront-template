// Quick database connection test — run from apps/medusa:
//   node ../../test-db.mjs

import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://postgres.fopjqjoxwelmrrfowbmv:UvYBSnvfeWbWKaGc@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

console.log('Testing connection to:', url.replace(/:[^@]+@/, ':***@'));

// Test 1: With SSL (rejectUnauthorized: false)
console.log('\n--- Test 1: SSL { rejectUnauthorized: false } ---');
try {
    const c1 = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
    });
    await c1.connect();
    const res = await c1.query('SELECT 1 as test');
    console.log('✅ SUCCESS:', res.rows);
    await c1.end();
} catch (e) {
    console.log('❌ FAILED:', e.message);
}

// Test 2: Without SSL
console.log('\n--- Test 2: No SSL ---');
try {
    const c2 = new Client({
        connectionString: url,
        ssl: false,
        connectionTimeoutMillis: 10000,
    });
    await c2.connect();
    const res = await c2.query('SELECT 1 as test');
    console.log('✅ SUCCESS:', res.rows);
    await c2.end();
} catch (e) {
    console.log('❌ FAILED:', e.message);
}

// Test 3: SSL with sslmode in URL
console.log('\n--- Test 3: sslmode=require in URL ---');
try {
    const c3 = new Client({
        connectionString: url + '?sslmode=require',
        connectionTimeoutMillis: 10000,
    });
    await c3.connect();
    const res = await c3.query('SELECT 1 as test');
    console.log('✅ SUCCESS:', res.rows);
    await c3.end();
} catch (e) {
    console.log('❌ FAILED:', e.message);
}

// Test 4: Port 6543 (transaction mode) with SSL
console.log('\n--- Test 4: Port 6543 + SSL ---');
try {
    const url6543 = url.replace(':5432/', ':6543/');
    const c4 = new Client({
        connectionString: url6543,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
    });
    await c4.connect();
    const res = await c4.query('SELECT 1 as test');
    console.log('✅ SUCCESS:', res.rows);
    await c4.end();
} catch (e) {
    console.log('❌ FAILED:', e.message);
}

console.log('\nDone.');
process.exit(0);
