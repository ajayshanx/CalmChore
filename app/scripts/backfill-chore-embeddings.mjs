// One-off backfill: generates OpenAI embeddings for any `chores` rows
// created before semantic search existed (see add_chore_embeddings
// migration + src/lib/embeddings.ts). New chores get their embedding
// automatically on create/edit — this only needs to run once, for
// whatever already existed at that point.
//
// Zero npm dependencies on purpose (just built-in fetch) — talks to
// Supabase's PostgREST API directly with the service-role key, so it
// doesn't matter whether node_modules is installed/up to date.
//
// Run locally (not from the sandbox, which has no outbound internet):
//   cd app
//   node scripts/backfill-chore-embeddings.mjs
//
// Needs OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local — both
// already required for local dev, so nothing new to set up beyond the
// OPENAI_API_KEY you just added.

import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wiexbxiywecrtqxjcjff.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

function embeddingText(name, info) {
  return info ? `${name}. ${info}` : name;
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

const restHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchRowsMissingEmbedding(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id,name,info&embedding=is.null`;
  const res = await fetch(url, { headers: restHeaders });
  if (!res.ok) {
    throw new Error(`Supabase GET ${table} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function updateEmbedding(table, id, embedding) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: restHeaders,
    body: JSON.stringify({ embedding }),
  });
  if (!res.ok) {
    throw new Error(`Supabase PATCH ${table} ${id} ${res.status}: ${await res.text()}`);
  }
}

async function backfillTable(table) {
  const rows = await fetchRowsMissingEmbedding(table);
  if (!rows || rows.length === 0) {
    console.log(`${table}: nothing to backfill.`);
    return;
  }
  console.log(`${table}: embedding ${rows.length} row(s)...`);
  for (const row of rows) {
    try {
      const embedding = await embed(embeddingText(row.name, row.info));
      await updateEmbedding(table, row.id, embedding);
      console.log(`  done: ${row.name}`);
    } catch (err) {
      console.error(`  ${row.id} (${row.name}) — failed:`, err.message);
    }
  }
}

await backfillTable("chores");
await backfillTable("example_chores");

console.log("Backfill complete.");
