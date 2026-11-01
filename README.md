# robwatts.org theme

A micro.blog plug-in that gives robwatts.org its Sunflower design: a homepage for founders, one filterable Posts feed, and a Books section built from bookshelves and book posts.

It is built to sit on top of micro.blog’s **Blank** theme, which has no page templates of its own, so nothing competes with this plug-in.

## What it renders

| URL | Template | Content |
| --- | --- | --- |
| `/` | `layouts/index.html` | Intro, three things you help with, email, Now line, latest 3 posts (not news) |
| `/posts/` | page + `{{< rw-posts >}}` | Every post, newest first, with kind filters |
| `/categories/{kind}/` | `layouts/_default/list.html` | Same feed filtered to note, book, news or essay, each with its own RSS |
| `/books/` | page + `{{< rw-books >}}` | Recommended, Reading now, Also read |
| `/books/{isbn}/` | `layouts/book/single.html` | Cover, verdict, shelf, every post that links that ISBN |
| a post | `layouts/_default/single.html` | Kind, verdict or confidence, the post |

## One-off setup (by hand, about 15 minutes)

1. **Push this repo to a public GitHub repository**, for example `robwatts/robwatts-theme`.
2. **Design:** set the theme to **Blank**.
3. **Plug-ins → Find Plug-ins → Install from GitHub URL:** paste the repo URL.
4. **Plug-in settings:** fill in tagline, intro, the three help lines, email, stance line, Now, Bluesky handle and LinkedIn URL. Empty fields fall back to the defaults in `layouts/index.html`.
5. **Bookshelves → Settings:** turn on “Link books to detail pages on your blog”. This auto-installs the “Book reading goals” plug-in, which ships its own `book/single.html`. Uninstall it afterwards so this theme’s book page is the one used. If micro.blog reinstalls it, check which template wins and tell me.
6. **Bookshelves:** make sure your shelves are named “Currently reading” and “Finished reading”. The theme reads them as `currentlyreading` and `finishedreading`.
7. **Categories:** create these, all lowercase: `note`, `book`, `news`, `essay`, `recommend`, `fine`, `skip`, `hunch`, `fairly sure`, `would bet on it`.
8. **Pages:** create two pages.
   - Title `Posts`, URL `/posts/`, content `{{< rw-posts >}}`
   - Title `Books`, URL `/books/`, content `{{< rw-books >}}`
   Untick “Include in navigation” for every page; the theme draws its own nav.
9. **Pages:** delete or unlist the old About page. Its content now lives on the homepage.
10. **Cross-posting:** check Bluesky and Mastodon are on under **Sources / Cross-posting**.
11. **Account → Edit profile:** set a real photo as your avatar. The homepage uses it.
12. **Logs → Rebuild** once everything is in place, so book pages for older posts get generated.

## Deploying changes

1. Edit the repo (or have Claude do it).
2. Bump `version` in `plugin.json`.
3. Push.
4. In micro.blog, **Plug-ins → robwatts.org theme → Update**.

## Posting conventions

Each post gets one kind category, plus at most one extra.

```ts
type Post =
  | { kind: "note" }                                         // link + 2–5 lines of take
  | { kind: "book"; verdict: "recommend" | "fine" | "skip" } // must link micro.blog/books/{isbn}
  | { kind: "news"; confidence: "hunch" | "fairly sure" | "would bet on it" } // title = your stance
  | { kind: "essay" };                                       // titled, rare
```

- A **book post** should link the book. Posting from Bookshelves or Epilogue does this for you. The link is what joins the post to its book page and to `/books/`.
- **Currently reading** posts need no category. They still show up on the book’s page timeline.
- Posts with no kind still appear in the full feed, just not in a filter.

## Retagging old posts

```sh
cd scripts
npm install
MB_TOKEN=your-app-token npm run plan    # writes retag-plan.json with suggestions
# edit retag-plan.json: change "add" for any post, [] to leave alone
MB_TOKEN=your-app-token npm run apply   # adds categories, then re-reads each post to confirm
```

Get the token from micro.blog → Account → Edit Apps. If you have more than one blog, set `MB_DESTINATION=https://yourname.micro.blog/`.

The script uses Micropub `q=source` with `limit` and `offset` to page through posts. If micro.blog returns fewer posts than you expect, that paging is the first thing to check.

## Notes

- Colours are CSS custom properties at the top of `static/css/rw.css`, with dark values under `prefers-color-scheme: dark`.
- Fonts: Source Serif 4 and JetBrains Mono from Google Fonts, with system fallbacks.
- Tested against Hugo 0.140 with a stand-in for micro.blog’s data. Micro.blog lets you pick the Hugo version under Design; use 0.140 or newer.
