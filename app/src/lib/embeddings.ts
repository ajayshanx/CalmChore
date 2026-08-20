import "server-only";

// Thin wrapper around OpenAI's embeddings endpoint — used to power semantic
// search over the cross-family Chore Ideas library (see match_chores RPC in
// the DB). Plain fetch rather than the openai SDK, since this is the only
// call we need and it keeps the dependency footprint down.
//
// text-embedding-3-small: 1536 dimensions, cheap (a few hundredths of a
// cent for this app's entire chore library), good enough quality for short
// chore name/description text. Must match the `vector(1536)` columns in the
// add_chore_embeddings migration if this ever changes.
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set — skipping embedding.");
    return null;
  }

  const input = text.trim();
  if (!input) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    });

    if (!res.ok) {
      console.error("OpenAI embeddings request failed:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const embedding = json?.data?.[0]?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch (err) {
    console.error("OpenAI embeddings request errored:", err);
    return null;
  }
}

// Same text a chore's embedding is built from — keep create/update/backfill
// in sync so a search query embedded the same way actually lines up.
export function choreEmbeddingText(name: string, info: string | null): string {
  return info ? `${name}. ${info}` : name;
}
