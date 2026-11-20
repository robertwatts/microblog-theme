/**
 * One-off: move every book on the year shelves ("2021 list", "2024" …) to "Finished reading",
 * keeping each book's date.
 *
 *   MB_TOKEN=xxx npx tsx merge-shelves.ts plan    # writes shelves-plan.json: shelves, books, the date each one keeps
 *   (check it; delete any shelf you want to leave alone, or change a book's "date")
 *   MB_TOKEN=xxx npx tsx merge-shelves.ts apply   # moves each book, sets its date back, checks both
 *
 * Get a token from micro.blog → Account → Edit Apps → App tokens. MB_SHELF overrides the target name.
 *
 * What we learned about micro.blog (Nov 2026):
 * - A book's date is `finished_at`. The JSON API can't set it; the web Edit form can
 *   (POST /account/bookshelves/{shelf}/books/{book}/save), and the web routes accept the same Bearer token.
 * - The Edit form only has the field on "finished"-type shelves. Elsewhere the only date is
 *   `date_published` (when the book was added), so that's the date we keep.
 * - Moving in the web UI re-adds the book by ISBN (a new record dated now); the API's assign with
 *   book_id keeps the record. One record can sit on two shelves.
 * - Deleting a shelf in the UI deletes its books too: only delete the year shelves once they're empty.
 */
import { readFile, writeFile } from "node:fs/promises";

type Shelf = { id: number; title: string; _microblog?: { books_count?: number; type?: string } };
type FeedBook = { id: number; title: string; date_published: string; _microblog?: { isbn?: string } };
type Book = { id: number; title: string; isbn: string; date: string; dateFrom: "finished" | "added" };
type PlanShelf = { id: number; name: string; books: Book[] };
type Plan = { target: string; shelves: PlanShelf[] };
type EditForm = { title: string; author: string; isbn: string; cover_url: string; finished_at: string | null };

const API = "https://micro.blog";
const TOKEN = process.env.MB_TOKEN ?? die("Set MB_TOKEN");
const TARGET = process.env.MB_SHELF ?? "Finished reading";
const PLAN = "shelves-plan.json";
const YEAR = /\b(19|20)\d{2}\b/;

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function call(method: "GET" | "POST" | "DELETE", path: string, form?: Record<string, string>): Promise<string> {
  const res = await fetch(API + path, {
    method,
    redirect: "manual", // the web save answers with a redirect; following it would hide a bounce to sign-in
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const body = await res.text();
  if (res.status >= 400) die(`${method} ${path} failed: ${res.status} ${body.slice(0, 300)}`);
  return body;
}

const shelves = async () => (JSON.parse(await call("GET", "/books/bookshelves")).items ?? []) as Shelf[];
const feed = async (shelfId: number) => (JSON.parse(await call("GET", `/books/bookshelves/${shelfId}`)).items ?? []) as FeedBook[];
const isbnOf = (b: FeedBook) => String(b._microblog?.isbn ?? "");
const minute = (iso: string) => iso.slice(0, 16).replace("T", " "); // "2021-12-26T18:27:00+00:00" → "2021-12-26 18:27"

const unescape = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

async function editForm(shelfId: number, bookId: number): Promise<EditForm> {
  const html = await call("GET", `/account/bookshelves/${shelfId}/books/${bookId}/edit`);
  const field = (name: string) => {
    const m = html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`));
    return m ? unescape(m[1]) : null;
  };
  const title = field("title");
  if (title === null) die(`No edit form for book ${bookId} on shelf ${shelfId}: is the token signed in?`);
  return { title, author: field("author") ?? "", isbn: field("isbn") ?? "", cover_url: field("cover_url") ?? "", finished_at: field("finished_at") };
}

const findShelf = (all: Shelf[], name: string) => all.find((s) => s.title.trim().toLowerCase() === name.toLowerCase());
const year = (s: Shelf) => Number(s.title.match(YEAR)?.[0]);

async function plan() {
  const all = await shelves();
  const target = findShelf(all, TARGET) ?? die(`No shelf called "${TARGET}". Shelves: ${all.map((s) => s.title).join(", ")}`);
  const years = all.filter((s) => YEAR.test(s.title) && s.id !== target.id).sort((a, b) => year(a) - year(b));
  if (!years.length) die(`No shelves with a year in the name. Shelves: ${all.map((s) => s.title).join(", ")}`);

  const out: Plan = { target: target.title, shelves: [] };
  for (const s of years) {
    const list = await feed(s.id);
    const expected = s._microblog?.books_count;
    if (expected !== undefined && expected !== list.length)
      die(`"${s.title}" says ${expected} books but the API listed ${list.length}. Stopping: the list may be paged.`);
    const books: Book[] = [];
    for (const b of list) {
      const { finished_at } = await editForm(s.id, b.id);
      books.push(
        finished_at
          ? { id: b.id, title: b.title, isbn: isbnOf(b), date: finished_at, dateFrom: "finished" }
          : { id: b.id, title: b.title, isbn: isbnOf(b), date: minute(b.date_published), dateFrom: "added" },
      );
    }
    out.shelves.push({ id: s.id, name: s.title, books });
  }
  await writeFile(PLAN, JSON.stringify(out, null, 2) + "\n");

  console.log(`→ "${target.title}" (${target._microblog?.books_count ?? "?"} books now)`);
  for (const s of out.shelves) {
    const y = s.name.match(YEAR)?.[0];
    console.log(`  ${s.name}: ${s.books.length} books`);
    for (const b of s.books)
      if (b.dateFrom === "added" || !b.date.startsWith(y ?? ""))
        console.log(`    ${b.date} (${b.dateFrom === "added" ? "date added, no finished date" : "finished, not " + y})  ${b.title}`);
  }
  console.log(`${out.shelves.reduce((n, s) => n + s.books.length, 0)} books. Check ${PLAN}, then run apply.`);
}

async function apply() {
  const p = JSON.parse(await readFile(PLAN, "utf8")) as Plan;
  const target = findShelf(await shelves(), p.target) ?? die(`No shelf called "${p.target}".`);
  const before = new Set((await feed(target.id)).map(isbnOf).filter(Boolean));
  const placed = new Map<string, string>(); // isbn → shelf it came from in this run

  for (const s of p.shelves) {
    for (const b of s.books) {
      const label = `${s.name} → ${p.target}: ${b.title}`;
      const onTarget = async () => (await feed(target.id)).find((x) => (b.isbn ? isbnOf(x) === b.isbn : x.id === b.id));

      const already = before.has(b.isbn) || placed.has(b.isbn);
      if (!(await onTarget())) await call("POST", `/books/bookshelves/${target.id}/assign`, { book_id: String(b.id) });
      const moved = (await onTarget()) ?? die(`✗ ${label}: not on "${p.target}" after assign. Nothing removed.`);

      // The docs say assign can "copy or move": if it copied, take it off the year shelf.
      if ((await feed(s.id)).some((x) => x.id === b.id)) {
        await call("DELETE", `/books/bookshelves/${s.id}/remove/${b.id}`);
        if (!(await onTarget())) die(`✗ ${label}: removing it from "${s.name}" also took it off "${p.target}". Re-add it by hand.`);
      }

      if (already) {
        console.log(`= ${label}: was already there (from ${placed.get(b.isbn) ?? p.target}), date left alone`);
        continue;
      }
      placed.set(b.isbn, s.name);

      const form = await editForm(target.id, moved.id);
      if (form.finished_at !== b.date) {
        await call("POST", `/account/bookshelves/${target.id}/books/${moved.id}/save`, { ...form, finished_at: b.date });
        const now = (await editForm(target.id, moved.id)).finished_at;
        if (now !== b.date) die(`✗ ${label}: date is ${now}, wanted ${b.date}. Stopping.`);
        console.log(`✓ ${label} (date ${form.finished_at || "empty"} → ${b.date})`);
      } else console.log(`✓ ${label} (date kept, ${b.date})`);
    }
    const left = await feed(s.id);
    console.log(left.length ? `? ${s.name} still has ${left.length} books` : `  ${s.name} is empty`);
  }
  console.log(`Done. "${p.target}" has ${(await feed(target.id)).length} books.`);
}

const cmd = process.argv[2];
if (cmd === "plan") await plan();
else if (cmd === "apply") await apply();
else die("Usage: merge-shelves.ts plan | apply");
