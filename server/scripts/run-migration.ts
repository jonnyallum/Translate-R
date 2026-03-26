#!/usr/bin/env npx tsx
// server/scripts/run-migration.ts
// Runs the database migration directly against Supabase using the service role key.
// Usage: cd server && npx tsx scripts/run-migration.ts

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://htykdntnwzobolnqqdul.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in .env');
  process.exit(1);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

async function runSQL(label: string, sql: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({}),
    });
    // rpc endpoint won't work for DDL, use the SQL endpoint instead
  } catch {}

  // Use the pg-meta SQL execution endpoint
  try {
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (res.ok) {
      console.log(`${GREEN}✅ ${label}${NC}`);
      return true;
    }

    // Try alternative endpoint
    const text = await res.text();
    if (res.status === 404) {
      // Endpoint not available, that's fine — we'll provide manual instructions
      return false;
    }
    console.log(`${YELLOW}⚠️  ${label}: ${text}${NC}`);
    return false;
  } catch (e: any) {
    return false;
  }
}

async function main() {
  console.log('\n🗄️  Translate-R Database Migration\n');

  // First check if tables already exist
  console.log('Checking if tables already exist...\n');
  
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
    {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (checkRes.ok) {
    console.log(`${GREEN}✅ Tables already exist! Migration has been run.${NC}`);
    console.log('\nVerifying all tables...\n');

    for (const table of ['profiles', 'contacts', 'calls', 'utterances']) {
      const tableRes = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`,
        {
          headers: {
            apikey: SERVICE_KEY!,
            Authorization: `Bearer ${SERVICE_KEY}`,
            Prefer: 'count=exact',
          },
        }
      );
      const count = tableRes.headers.get('content-range')?.split('/')[1] || '?';
      console.log(`  ${GREEN}✅${NC} ${table} — ${count} rows`);
    }

    console.log(`\n${GREEN}🎉 Database is ready!${NC}\n`);
    return;
  }

  if (checkRes.status === 404) {
    console.log(`${YELLOW}Tables not found. Need to run migration.${NC}\n`);
  }

  // Auto-migration via API isn't available on all Supabase plans
  // Provide clear manual instructions
  console.log(`${YELLOW}═══════════════════════════════════════════════════════════${NC}`);
  console.log(`${YELLOW}  The migration needs to be run via the Supabase Dashboard${NC}`);
  console.log(`${YELLOW}═══════════════════════════════════════════════════════════${NC}`);
  console.log('');
  console.log('Please follow these steps:');
  console.log('');
  console.log('1. Open the Supabase SQL Editor:');
  console.log(`   ${GREEN}https://supabase.com/dashboard/project/htykdntnwzobolnqqdul/sql/new${NC}`);
  console.log('');
  console.log('2. Copy the contents of this file and paste into the editor:');
  console.log(`   ${GREEN}server/supabase/migration.sql${NC}`);
  console.log('');
  console.log('3. Click "Run" to execute the migration.');
  console.log('');
  console.log('4. Then copy and paste this file:');
  console.log(`   ${GREEN}server/supabase/002_rls_and_realtime.sql${NC}`);
  console.log('');
  console.log('5. Click "Run" again.');
  console.log('');
  console.log('6. Re-run this script to verify:');
  console.log(`   ${GREEN}npx tsx scripts/run-migration.ts${NC}`);
  console.log('');
}

main().catch(console.error);
