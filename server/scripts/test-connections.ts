#!/usr/bin/env npx tsx
// server/scripts/test-connections.ts
// Run with: npx tsx scripts/test-connections.ts
// Tests all API connections before deployment

import 'dotenv/config';

const results: { service: string; status: string; detail: string }[] = [];

async function testSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
    });
    if (res.ok) {
      results.push({ service: 'Supabase', status: '✅', detail: 'Connected' });
    } else {
      results.push({ service: 'Supabase', status: '❌', detail: `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'Supabase', status: '❌', detail: e.message });
  }
}

async function testSupabaseAuth() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key! },
    });
    const data = await res.json();
    if (data.external) {
      results.push({ service: 'Supabase Auth', status: '✅', detail: 'Auth service running' });
    } else {
      results.push({ service: 'Supabase Auth', status: '⚠️', detail: 'Auth responded but unexpected format' });
    }
  } catch (e: any) {
    results.push({ service: 'Supabase Auth', status: '❌', detail: e.message });
  }
}

async function testDeepgram() {
  const key = process.env.DEEPGRAM_API_KEY;
  
  try {
    const res = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      results.push({ 
        service: 'Deepgram', 
        status: '✅', 
        detail: `Connected — ${data.projects?.length || 0} project(s)` 
      });
    } else {
      results.push({ service: 'Deepgram', status: '❌', detail: `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'Deepgram', status: '❌', detail: e.message });
  }
}

async function testOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  
  try {
    const res = await fetch('https://api.openai.com/v1/models/gpt-4o-mini', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      results.push({ service: 'OpenAI', status: '✅', detail: 'GPT-4o-mini accessible' });
    } else {
      const err = await res.json();
      results.push({ service: 'OpenAI', status: '❌', detail: err.error?.message || `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'OpenAI', status: '❌', detail: e.message });
  }
}

async function testDaily() {
  const key = process.env.DAILY_API_KEY;
  
  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      results.push({ 
        service: 'Daily.co', 
        status: '✅', 
        detail: `Connected — ${data.data?.length || 0} room(s)` 
      });
    } else {
      results.push({ service: 'Daily.co', status: '❌', detail: `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'Daily.co', status: '❌', detail: e.message });
  }
}

async function testTranslation() {
  const key = process.env.OPENAI_API_KEY;
  
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a translator. Respond ONLY with valid JSON. No markdown.\n\nTranslate the following Thai text to English in two ways:\n1. literal - preserve Thai word order and structure\n2. natural - fluent idiomatic English\n\nResponse format: {"literal":"...","natural":"..."}',
          },
          { role: 'user', content: 'สวัสดีครับ คุณสบายดีไหม' },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      results.push({
        service: 'Translation Pipeline',
        status: '✅',
        detail: `Literal: "${content.literal}" | Natural: "${content.natural}"`,
      });
    } else {
      results.push({ service: 'Translation Pipeline', status: '❌', detail: `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'Translation Pipeline', status: '❌', detail: e.message });
  }
}

async function testStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  
  try {
    const res = await fetch('https://api.stripe.com/v1/products?limit=5', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      const productNames = data.data?.map((p: any) => p.name).join(', ') || 'none';
      results.push({ 
        service: 'Stripe', 
        status: '✅', 
        detail: `Connected — Products: ${productNames}` 
      });
    } else {
      results.push({ service: 'Stripe', status: '❌', detail: `HTTP ${res.status}` });
    }
  } catch (e: any) {
    results.push({ service: 'Stripe', status: '❌', detail: e.message });
  }
}

async function checkTables() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  const tables = ['profiles', 'contacts', 'calls', 'utterances'];
  
  for (const table of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          apikey: key!,
          Authorization: `Bearer ${key}`,
          Prefer: 'count=exact',
        },
      });
      if (res.ok) {
        results.push({ service: `Table: ${table}`, status: '✅', detail: 'Exists' });
      } else if (res.status === 404) {
        results.push({ service: `Table: ${table}`, status: '❌', detail: 'NOT FOUND — run migration' });
      } else {
        results.push({ service: `Table: ${table}`, status: '⚠️', detail: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ service: `Table: ${table}`, status: '❌', detail: e.message });
    }
  }
}

async function main() {
  console.log('\n🔌 Translate-R Connection Test\n');
  console.log('Testing all services...\n');

  await testSupabase();
  await testSupabaseAuth();
  await checkTables();
  await testDeepgram();
  await testOpenAI();
  await testDaily();
  await testStripe();
  await testTranslation();

  console.log('─'.repeat(70));
  console.log('Results:\n');
  
  for (const r of results) {
    console.log(`  ${r.status}  ${r.service.padEnd(25)} ${r.detail}`);
  }
  
  console.log('\n' + '─'.repeat(70));
  
  const failures = results.filter((r) => r.status === '❌');
  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length} service(s) failed. Fix before deploying.\n`);
  } else {
    console.log('\n🚀 All services connected. Ready to deploy!\n');
  }
}

main().catch(console.error);
