# robwatts.org — context for Claude Code

Rob's personal site, robwatts.org, hosted on micro.blog. This repo is a micro.blog **plug-in** that renders the whole site on top of the blog's base theme, **Tiny Theme** (micro.blog layers Blank underneath). Rob writes TypeScript, likes ideas expressed as clear data structures, and prefers short, direct answers.

## What the site is for

```ts
const robwatts = {
  purpose: "be findable by founders; digest what I read, for future me",
  primaryReader: "founders sizing Rob up as an advisor or angel",
  voice: {
    selfDeprecate: "about me, never about the work",
    register: "talking at the pub, not on a panel",
    avoid: ["passionate about", "leveraging", "journey", "thought leader"],
  },
  nav: ["Home", "Posts", "Books"],
  home: {
    statement: "operator → advisor → occasional investor",
    helpWith: ["scaling e-com tech", "personalised/POD products", "small tech teams"],
    stance: "advise first, invest occasionally",
    cta: "email only",
    now: "one changeable human line",
    recent: "latest 3 posts, excluding news",
  },
  posts: {
    kinds: ["note", "book", "news", "essay"],
    feed: "/posts/ — one feed, filter pills link to /categories/{kind}/",
    triggers: ["sent someone a link", "finished a book", "explained it twice"],
    politics: "only through a tech/business lens",
  },
  books: {
    page: "/reading/ (micro.blog reserves /books/ for detail pages)",
    order: ["recommended", "reading now", "also read"],
    joinKey: "isbn",
  },
  distribution: { canonical: "robwatts.org", crossPost: ["bluesky", "fediverse"], substack: false },
  later: ["Micropub MCP so Rob can post from Claude", "own stack only after 3 months of steady posting"],
} as const;
```

## Design (decided, don't relitigate without asking)

Sunflower palette, the "band" layout: a solid yellow block holds the nav and intro, the rest sits on warm paper. Source Serif 4 for text, JetBrains Mono for small details. Light and dark modes; the band stays yellow in dark mode. Tokens live at the top of `static/css/rw.css`.

## Categories in use

```ts
type Kind = "note" | "book" | "news" | "essay"; // created
type Verdict = "recommend";                      // created; drives /reading/ "Recommended"
// The theme also understands fine | skip | hunch | fairly sure | would bet on it,
// but Rob chose not to create them yet (posting friction). Don't add them unprompted.
```

All lowercase; templates match names exactly.

## Files

| Path | Renders |
| --- | --- |
| `layouts/index.html` | Homepage. Copy comes from plug-in settings fields (`params.rw_*`), with defaults inline |
| `layouts/post/single.html` | Posts (must live here: Tiny's `post/single.html` beats any `_default/single.html`) |
| `layouts/_default/single.html` | Pages; `/posts/` and `/reading/` get special bands |
| `layouts/shortcodes/bookgoals.html` | Empty stub so old `{{< bookgoals YEAR >}}` posts still build |
| `layouts/_default/list.html` | Category pages |
| `layouts/book/single.html` | `/books/{isbn}/` detail pages, overriding micro.blog's |
| `layouts/shortcodes/rw-posts.html`, `rw-books.html` | Content of the `/posts/` and `/reading/` pages |
| `layouts/partials/rw/*` | head, nav, band, filters, footer, item, plus helpers that `return` values (kind, verdict, confidence, isbn, book-data, book-url, posts-about) |
| `plugin.json` | Version, CSS include, settings fields |
| `scripts/retag.ts` | One-off Micropub retag: `plan` writes `retag-plan.json`, `apply` adds categories and verifies |

## micro.blog facts we've verified

- Plug-ins are installed via **Design → Edit Custom Themes → New Plug-in** with a GitHub clone URL. There is no "install from GitHub" under Plug-ins.
- Deploying = bump `version` in `plugin.json`, push, then Rob taps **Update** on the plug-in.
- Posts have `.Type == "post"`. Pages are separate. Categories are taxonomy `categories`; a term page only exists once a post is in it.
- Shelf data: `.Site.Data.bookshelves.<shelf name lowercased, no spaces>` with `title`, `author`, `isbn`, `cover_url`. Rob has "Currently reading" plus year shelves like "2024 highlights"; the theme treats every shelf except `currentlyreading` and `wanttoread` as read.
- Book detail pages: Bookshelves → Settings → "Link books to detail pages on your blog". Template is `layouts/book/single.html` with params `isbn`, `title`, `author`, `cover_url`, `background_color`, `description`, `shelves[]{name,type}`, `finished_at`. Pages only exist for books linked from posts, so links use `rw/book-url.html` to fall back to micro.blog's page.
- Enabling detail pages auto-installs the "Book reading goals" plug-in, which has its own `book/single.html`; uninstall it.
- Uninstalling a plug-in removes its shortcodes, and one post still using one fails every build (red "Theme error" on the Design page; the live site silently stays on the last good build). "Year in books for 2023" uses `{{< bookgoals 2023 >}}`, hence the empty `layouts/shortcodes/bookgoals.html`.
- The blog's Hugo version is set to 0.91 on the Design page.
- The base theme (Tiny Theme) is a theme plug-in with no Uninstall. A blog always has exactly one; installing another theme from Plug-ins replaces it, and Blank is no longer selectable. Any type- or output-specific template in the base theme beats our `_default/*`, so the plug-in must override those too. Still on Tiny: `/archive/` and `/photos/` (`list.archivehtml.html`, `list.photoshtml.html`).
- Micropub: `https://micro.blog/micropub`, Bearer app token. `q=source` lists posts; `q=category` lists categories; categories can be created via `mp-channel=categories`. Updates: `action: update` with `add: {category}` returns 200 but does nothing; `replace: {category: [...]}` works and leaves other properties alone, so send the full merged list. Paging with `limit`/`offset` on `q=source` is not confirmed.
- No API for blog settings; those are manual.

## Testing

Build locally against a stand-in before pushing: Hugo 0.91 (what the blog is set to), a site with `theme: ["<this repo>", "tiny", "theme-blank"]` (clone `github.com/MattSLangford/Tiny-Theme-for-Micro.blog` and `github.com/microdotblog/theme-blank`; without Tiny you won't see its templates winning), a few posts with `type: post` and categories, `content/books/<isbn>.md` with `type: book`, and JSON files in `data/bookshelves/`. Screenshot at 390px wide in light and dark mode.

## Status (as of 1 Nov 2026)

- [x] Homepage live and correct, with avatar and Now line
- [x] `/posts/` live, 55 posts
- [x] Categories created: note, book, news, essay, recommend
- [x] v1.0.2 pushed
- [x] v1.0.3 live (1 Nov): nav links `/reading/`, `bookgoals.css` gone, "Also read" filled
- [ ] **v1.0.4 to Update**: posts were all rendering with Tiny's template; also fixes every stylesheet being linked twice
- [x] Books page URL changed to `/reading/`
- [ ] `/reading/` bookshelf option still on (micro.blog's shelf HTML appended under "Also read"); set it to None
- [x] "Link books to detail pages" on, "Book reading goals" uninstalled
- [x] `/books/{isbn}/` pages render with `layouts/book/single.html`
- [ ] Decide what `/archive/` and `/photos/` should be (Tiny-styled today; redirect to `/posts/`, or hide)
- [x] Retag old posts: DeepSeek → news; Buffett, Acorn/ARM, boring tech → note (1 Nov)
- [ ] Decide on the other retag suggestions (Orion, Heroku, AI glasses, ahastack → note; 5 long 2021 posts → essay); 13 posts are still in old "Books", 5 in "Articles"
- [ ] First `book` + `recommend` post so "Recommended" isn't empty
- [ ] Rob to refine homepage copy himself (in plug-in settings)
