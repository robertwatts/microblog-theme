/**
 * One-off retag of existing micro.blog posts via Micropub.
 *
 *   MB_TOKEN=xxx npx tsx scripts/retag.ts plan    # writes retag-plan.json with suggestions
 *   (edit retag-plan.json: set "add" per post, or leave it empty)
 *   MB_TOKEN=xxx npx tsx scripts/retag.ts apply   # adds those categories, then re-reads each post to verify
 *
 * Get a token from micro.blog → Account → Edit Apps → App tokens.
 * Optional: MB_DESTINATION=https://yourname.micro.blog/ if the account has more than one blog.
 */
import { readFile, writeFile } from "node:fs/promises";

type Kind = "note" | "book" | "news" | "essay";
type Extra = "recommend" | "fine" | "skip" | "hunch" | "fairly sure" | "would bet on it";
type Category = Kind | Extra;

type MicropubEntry = {
  type: ["h-entry"];
  properties: {
    url: [string];
    published?: [string];
    name?: [string];
    content?: [string] | [{ html?: string; value?: string }];
    category?: string[];
  };
};

type PlanRow = {
  url: string;
  published: string;
  title: string;
  excerpt: string;
  existing: string[];
  why: string;      // why the suggestion was made
  add: Category[];  // what apply will add; edit freely, [] means leave alone
};

const ENDPOINT = "https://micro.blog/micropub";
const TOKEN = process.env.MB_TOKEN ?? die("Set MB_TOKEN");
const DEST = process.env.MB_DESTINATION;
const PLAN = "retag-plan.json";

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function micropub<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, ...(DEST ? { "mp-destination": DEST } : {}) });
  const res = await fetch(`${ENDPOINT}?${qs}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) die(`GET ${qs} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function allPosts(): Promise<MicropubEntry[]> {
  const out: MicropubEntry[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const { items } = await micropub<{ items: MicropubEntry[] }>({
      q: "source",
      limit: String(limit),
      offset: String(offset),
    });
    if (!items?.length) break;
    out.push(...items);
    if (items.length < limit) break;
  }
  return out;
}

const text = (e: MicropubEntry): string => {
  const c = e.properties.content?.[0];
  return typeof c === "string" ? c : c?.value ?? c?.html ?? "";
};

function suggest(e: MicropubEntry): Pick<PlanRow, "add" | "why"> {
  const body = text(e);
  const title = e.properties.name?.[0] ?? "";
  const existing = e.properties.category ?? [];
  const has = (k: string) => existing.includes(k);

  if (["note", "book", "news", "essay"].some(has)) return { add: [], why: "already has a kind" };
  if (/currently reading/i.test(body)) return { add: [], why: "currently-reading post, attaches to its book page by ISBN" };
  if (title && body.length > 1500) return { add: ["essay"], why: "titled and long" };
  if (/https?:\/\/(?!micro\.blog)/.test(body) && body.replace(/\[[^\]]*\]\([^)]*\)/g, "").trim().length > 60)
    return { add: ["note"], why: "external link with a take" };
  return { add: [], why: "one-liner or photo, left untagged" };
}

async function plan() {
  const posts = await allPosts();
  const rows: PlanRow[] = posts.map((e) => ({
    url: e.properties.url[0],
    published: e.properties.published?.[0] ?? "",
    title: e.properties.name?.[0] ?? "",
    excerpt: text(e).replace(/\s+/g, " ").slice(0, 140),
    existing: e.properties.category ?? [],
    ...suggest(e),
  }));
  await writeFile(PLAN, JSON.stringify(rows, null, 2));
  const tagged = rows.filter((r) => r.add.length);
  console.log(`${rows.length} posts, ${tagged.length} with suggestions. Review ${PLAN}, then run apply.`);
}

async function apply() {
  const rows: PlanRow[] = JSON.parse(await readFile(PLAN, "utf8"));
  const todo = rows.filter((r) => r.add.length);
  for (const r of todo) {
    // micro.blog returns 200 for `add` but ignores it; `replace` works, so merge with the live categories first.
    const live = await micropub<MicropubEntry>({ q: "source", url: r.url });
    const category = [...new Set([...(live.properties.category ?? []), ...r.add])];
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        url: r.url,
        replace: { category },
        ...(DEST ? { "mp-destination": DEST } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${r.url}: ${res.status} ${await res.text()}`);
      continue;
    }
    const check = await micropub<MicropubEntry>({ q: "source", url: r.url });
    const now = check.properties.category ?? [];
    const ok = r.add.every((c) => now.includes(c));
    console.log(`${ok ? "✓" : "?"} ${r.url} → [${now.join(", ")}]`);
  }
  console.log(`Done. ${todo.length} posts updated. Run a full rebuild from micro.blog → Logs if pages look stale.`);
}

const cmd = process.argv[2];
if (cmd === "plan") await plan();
else if (cmd === "apply") await apply();
else die("Usage: retag.ts plan | apply");
