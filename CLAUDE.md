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
  nav: "Home, then micro.blog's menu (Pages ticked 'Include in navigation', labelled by title); live: Posts, Reading, Work",
  home: {
    summary: "the Home page (/home/, a micro.blog page; a plain return = new line), else a paragraph opening the About page",
    buttons: "from the Home page: a link alone on its own line becomes a button; none in the template",
    now: "one changeable human line",
    recent: "latest 3 posts",
  },
  about: {
    page: "/work/ (titled Work), a micro.blog page Rob edits in markdown; the theme lays it out. Its URL is set once, in rw/about-page.html",
    sections: ["what I do", "where I can help", "how I got here", "outside work", "get in touch"],
    statement: "operator → advisor → occasional investor",
    helpWith: ["scaling e-com tech", "personalised/POD products", "small tech teams"],
    stance: "advise first, invest occasionally",
    contact: "{{< rw-contact >}}: one row each for Email, LinkedIn, Bluesky, Fediverse, GitHub. No address in the HTML: '@' in handles is a CSS-drawn <span class=at>, an inline script restores it and adds mailto:",
  },
  copy: "long copy lives in pages; plug-in settings only hold one-liners",
  posts: {
    kinds: ["note", "book", "news", "essay"],
    feed: "/posts/ — one feed, filter pills link to /categories/{kind}/, only for kinds with posts",
    triggers: ["sent someone a link", "finished a book", "explained it twice"],
    politics: "only through a tech/business lens",
  },
  books: {
    page: "/reading/ (micro.blog reserves /books/ for detail pages); its opening line ('Books worth reading.') is the band's lede",
    order: ["recommended", "reading now", "what I thought"], // empty sections are hidden
    writtenAbout: "a post links the book and says something after micro.blog's '… by Author 📚' line (rw/book-takes.html); the row shows that take and links the post",
    rest: "every other read book, by shelf (Finished, With the kids, Didn't finish), on a page Rob makes with {{< rw-books \"rest\" >}}; /reading/ links it by that page's title with a count",
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
| `layouts/index.html` | Homepage: name, tagline, the Home page's text and buttons (via `rw/summary.html`), Now, recent posts |
| `layouts/post/single.html` | Posts (must live here: Tiny's `post/single.html` beats any `_default/single.html`) |
| `layouts/_default/single.html` | Pages; `/posts/`, pages using `rw-books` (`/reading/` and the rest page) and the About page (`/work/`) get special bands (every band title is the page's own title; on Reading and About a paragraph opening the page becomes the band's lede, via `rw/lede.html`); `/home/` redirects to `/` |
| `layouts/shortcodes/bookgoals.html` | Empty stub so old `{{< bookgoals YEAR >}}` posts still build |
| `layouts/index.archivehtml.html`, `index.photoshtml.html` | `/archive/` → `/posts/`, `/photos/` → home, via `rw/redirect.html` (meta refresh, canonical, noindex) |
| `layouts/_default/list.html` | Category pages |
| `layouts/book/single.html` | `/books/{isbn}/` detail pages, overriding micro.blog's |
| `static/favicon.svg`, `favicon-32.png`, `favicon.ico`, `apple-touch-icon.png` | "rw." on Sunflower yellow, JetBrains Mono Bold as outlines; `rw/head.html` links them |
| `layouts/shortcodes/rw-posts.html`, `rw-books.html` | Content of the `/posts/` and `/reading/` pages; `{{< rw-books "rest" >}}` fills the page of the other read books |
| `layouts/shortcodes/rw-contact.html` | Contact block Rob places in the About page |
| `layouts/partials/rw/*` | head, nav, band, filters, footer, item, plus helpers that `return` values (kind, verdict, confidence, isbn, book-data, book-url, posts-about, book-takes, book-take-row, about-page, lede, summary, socials) |
| `plugin.json` | Version, CSS include, settings fields (one-liners only: tagline, Now, email, Bluesky, LinkedIn) |
| `scripts/retag.ts` | One-off Micropub retag: `plan` writes `retag-plan.json`, `apply` adds categories and verifies |
| `scripts/merge-shelves.ts` | One-off (run 15 Nov): moved every book from the year shelves to "Finished reading" and set each book's date back. `plan` writes `shelves-plan.json` (gitignored; the only record of which year shelf each book was on), `apply` moves, re-dates and checks each book |

## micro.blog facts we've verified

- Plug-ins are installed via **Design → Edit Custom Themes → New Plug-in** with a GitHub clone URL. There is no "install from GitHub" under Plug-ins.
- Deploying = bump `version` in `plugin.json`, push, then Rob taps **Update** on the plug-in.
- A plug-in is not a custom theme. Design correctly shows "Custom theme: None" while this plug-in renders the site; keep it None. Two leftover custom themes ("robwatts.org", "robwatts.org custom theme") sit in that dropdown unused.
- Posts have `.Type == "post"`. Pages are separate. Categories are taxonomy `categories`; a term page only exists once a post is in it.
- Shelf data: `.Site.Data.bookshelves.<shelf name lowercased, no spaces>` with `title`, `author`, `isbn`, `cover_url`. Since 15 Nov all read books sit on "Finished reading" (the year shelves "2021 list", "2022 list", "2023 list", "2024" were merged into it). Other shelves: Currently reading, Want to read, Didn't finish, Kids highlights, Non fiction - want to read. Read = every shelf except `currentlyreading` and any whose key contains `wanttoread` (since 1.2.0, so "Non fiction - want to read" no longer counts as read); a book on two read shelves shows once, under the first of Finished reading, Kids highlights, Didn't finish.
- Books API (`https://micro.blog/books/...`, Bearer app token): `GET /books/bookshelves` (`id`, `title`, `_microblog.books_count`, `_microblog.type`), `GET /books/bookshelves/{id}` (books: `id`, `title`, `image`, `authors[]`, `date_published`, `_microblog.isbn`), `POST /books/bookshelves/{id}/assign` `book_id=` keeps the record (and its id), `DELETE /books/bookshelves/{id}/remove/{book_id}`. One book record can sit on two shelves.
- A book's date is `finished_at`; `date_published` shows it on "finished"-type shelves, else the date added. The JSON API can't set it. The web routes take the same Bearer token: `GET /account/bookshelves/{shelf}/books/{book}/edit` (form fields `title`, `author`, `isbn`, `cover_url`, `finished_at` as `YYYY-MM-DD HH:MM`; the date field only exists on finished-type shelves), `POST .../save` with all of them sets it. Moving a book in the web UI re-adds it by ISBN as a new record dated now. Deleting a shelf in the UI deletes its books too.
- Book detail pages: Bookshelves → Settings → "Link books to detail pages on your blog". Template is `layouts/book/single.html` with params `isbn`, `title`, `author`, `cover_url`, `background_color`, `description`, `shelves[]{name,type}`, `finished_at`. Pages only exist for books linked from posts, so links use `rw/book-url.html` to fall back to micro.blog's page. Book posts also carry micro.blog's own `img.microblog_book` cover in the body; `rw.css` hides it wherever our book row already shows one.
- Design → Edit CSS (`custom.css`) loads before `rw.css` on every page. Rob cleared it on 1 Nov; its Tiny leftovers (`body { max-width: 55em }`, a boxed `footer`) had squeezed desktop to 935px. Keep it empty; `rw.css` still sets `body { max-width: none }` as a guard.
- micro.blog's `microblog_head.html` links `micro.blog/{username}/favicon.png`, which for Rob is an old black-and-white photo, not his current avatar. `rw/head.html` strips that link with `replaceRE` (so the rest of micro.blog's head stays current) and adds ours.
- Missing URLs get micro.blog's own bare "Not Found"; a theme `layouts/404.html` is published at `/404.html` but never served for 404s, so we don't ship one.
- Enabling detail pages auto-installs the "Book reading goals" plug-in, which has its own `book/single.html`; uninstall it.
- Uninstalling a plug-in removes its shortcodes, and one post still using one fails every build (red "Theme error" on the Design page; the live site silently stays on the last good build). "Year in books for 2023" uses `{{< bookgoals 2023 >}}`, hence the empty `layouts/shortcodes/bookgoals.html`.
- The blog's Hugo version is set to 0.91 on the Design page.
- The base theme (Tiny Theme) is a theme plug-in with no Uninstall. A blog always has exactly one; installing another theme from Plug-ins replaces it, and Blank is no longer selectable. Any type- or output-specific template in the base theme beats our `_default/*`, so the plug-in must override those too. `/archive/` and `/photos/` are the home page's ArchiveHTML/PhotosHTML outputs; ours (`index.archivehtml.html`, `index.photoshtml.html`) beat the base theme's and redirect.
- Micropub: `https://micro.blog/micropub`, Bearer app token. `q=source` lists posts; `q=category` lists categories; categories can be created via `mp-channel=categories`. Updates: `action: update` with `add: {category}` returns 200 but does nothing; `replace: {category: [...]}` works and leaves other properties alone, so send the full merged list. Paging with `limit`/`offset` on `q=source` is not confirmed.
- No API for blog settings; those are manual.
- Changing a page's URL leaves the old URL serving its last build: after Rob moved About to `/work/`, `/about/` still returned 200 with stale markup (2 Nov), and by 20 Nov it was a 404. Nothing redirects it.
- Pages ticked "Include in navigation" get `menu: main` and land in `site.Menus.main` (Tiny's header loops over it; Blank's sitemap lists them, which is how to see the menu from outside). On 2 Nov it held micro.blog's defaults: Work, Articles, Archive, Photos, Replies, Home; Posts and Reading weren't ticked. Without a weight Hugo sorts the menu alphabetically, but on 20 Nov it rendered Work before Posts, so micro.blog does pass an order through.

## Testing

Build locally against a stand-in before pushing: Hugo 0.91 (what the blog is set to), a site with `theme: ["<this repo>", "tiny", "theme-blank"]` (clone `github.com/MattSLangford/Tiny-Theme-for-Micro.blog` and `github.com/microdotblog/theme-blank`; without Tiny you won't see its templates winning), a few posts with `type: post` and categories (not under `content/posts/`, or Hugo's section list takes over `/posts/`), `content/books/<isbn>.md` with `type: book`, and JSON files in `data/bookshelves/`. Screenshot at 390px wide in light and dark mode.

## Status (as of 1 Nov 2026)

- [x] Homepage live and correct, with avatar and Now line
- [x] `/posts/` live, 55 posts
- [x] Categories created: note, book, news, essay, recommend
- [x] v1.0.2 pushed
- [x] v1.0.3 live (1 Nov): nav links `/reading/`, `bookgoals.css` gone, "Also read" filled
- [x] v1.0.4 live (1 Nov): posts use `post/single.html`, `rw.css` linked once
- [x] Books page URL changed to `/reading/`
- [x] `/reading/` bookshelf option set to None
- [x] "Link books to detail pages" on, "Book reading goals" uninstalled
- [x] `/books/{isbn}/` pages render with `layouts/book/single.html`
- [x] v1.0.5 live (1 Nov): `/archive/` → `/posts/`, `/photos/` → home
- [x] v1.0.7 live (1 Nov): home's recent 3 include news; filter pills hide empty kinds
- [x] v1.0.8 live (1 Nov): tightened `rw.css` (9-step type scale, 44px tap targets, full-width desktop, one cover per book post, dark focus ring); Recommended and "no note" hidden when empty
- [x] v1.0.9 live (1 Nov): "rw." favicon replaces micro.blog's photo; unused `404.html` removed; Design → Edit CSS cleared
- [x] v1.1.0 live (1 Nov): About page structure, About in nav, contact block, socials default to Rob's handles (LinkedIn robertjoelwatts, Bluesky robwatts.org, GitHub robertwatts). Rob rewrote the About copy
- [x] v1.1.1 live (2 Nov): homepage summary from its own Home page (`/home/`), line breaks kept; loose lists on About tightened. Rob made Pages → Home (`/home/`)
- [x] v1.1.2 live (2 Nov): About lede only taken from a paragraph before the first heading (Rob's About now opens with "Day job", which had lost its paragraph to the band)
- [x] v1.1.3 live (2 Nov): "More about me" removed from the template; a link alone on its own line in the Home page renders as a button (Rob adds `[More about me](/about/)` there)
- [x] v1.1.4 live (2 Nov): Rob moved About to `/work/` and titled it Work, which broke the nav and the page's layout (both matched `/about/`). The URL now lives only in `rw/about-page.html`; the nav label is the page title. Rob: point the Home page button at `/work/`
- [x] v1.1.5 live (2 Nov): nav reads micro.blog's menu (`rw/nav.html`); Home and the current-section highlight stay in the theme, which also skips `/` and `/home/` if they're ticked. After Rob's Pages pass the menu held Home, Work, Posts; Reading wasn't ticked yet. Check the live order
- [x] v1.1.6 live (2 Nov): contact block's email button becomes a plain first row, and addresses are hidden from crawlers (the Fediverse handle `@rw@robwatts.org` contained the email, so it's hidden too)
- [x] v1.1.7 live (2 Nov): About's bullet lists match its numbered ones: same marker column, warm mono em dash instead of 01, 02…
- [x] Rob (20 Nov): Reading ticked for navigation, Pages ordered Posts, Reading, Work; live nav checked on every page type
- [x] v1.1.8 live (20 Nov): `/posts/` and `/reading/` bands take the page title (the nav said Reading, the band said Books). Rob may still add `[More about me](/work/)` to the Home page
- [x] v1.1.9 live (20 Nov): Reading's band lede comes from the page's opening paragraph, like Work's (hardcoded "Ones I'd press on you…" removed); the split lives in `rw/lede.html`
- [ ] v1.2.0 (22 Nov): `/reading/` shows Recommended, Reading now and "What I thought" (read books with a take, newest first); the rest move to a page with `{{< rw-books "rest" >}}`, grouped by shelf. Rob: create that page (e.g. "Also read" at `/also-read/`, opening line then the shortcode); leave it out of navigation
- [ ] Rob: fill the Now setting; revoke the Micropub token used for the retag
- [x] Retag old posts: DeepSeek → news (then note, at Rob's call); Buffett, Acorn/ARM, boring tech → note (1 Nov)
- [x] Rest of the retag (1 Nov): old "Books" → `book` (13 posts); 5 more → note, 5 long 2021 posts → essay; two photo posts left untagged. "Books" is now empty; "Articles" (5) stays alongside `essay`
- [ ] First `book` + `recommend` post so "Recommended" isn't empty
- [x] Year shelves merged into "Finished reading" (15 Nov): 47 books moved, dates kept and verified; "Finished reading" has 54
- [ ] Rob: delete the four empty year shelves; revoke the app token used for the merge; check `/reading/` "Also read"
- [ ] Dates to fix: 7 books Rob moved by hand on 15 Nov (Termush, Bonfire of the Vanities, Mayflies, Time Shelter, Lessons, Tokyo Express, Clear Thinking) and Nero and The Iliad (reset 1 Nov) show 2026 dates
- [ ] Rob to refine the About page copy himself (micro.blog → Pages → About)
