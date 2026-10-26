<!-- shared-preferences:start -->
## David's preferences (shared across all of David's apps)

This section is the same in every one of David's app repos. If David states a new general preference
(not specific to this app), add it here, in this file, and commit it. David's Mac copies it to the other repos.

**Who David is.** A guitar teacher and gigging guitarist (he/him) who builds personal and teaching apps with Claude.
Comfortable with tech but not a programmer: explain in plain words, skip jargon, keep replies short and
concrete. Likes to see things working: verify before saying "done".

**How the apps are built and hosted**
- Public web apps on GitHub Pages under the **davyrockett** GitHub account (never an Artifact or a hosted
  service). Live at `https://www.davyrockett.com/<repo>/` (since 2026-10-18; old
  `davyrockett.github.io` links redirect there). The website itself is the `davyrockett.github.io` repo.
- Each app: `index.html` (+ `app.js` / `styles.css` when bigger), `sw.js` service worker for offline use
  with an update banner, `manifest.webmanifest`, `icons/` drawn by `tools/make-icons.py`, a
  `Start <App>.command` for local testing on the Mac, and a README written for David.
- **`move.js`** (since 2026-10-17): every app loads `move.js` as its first script and lists it in `sw.js`
  `ASSETS`. It carries the app's settings over when the apps move from davyrockett.github.io to
  davyrockett.com (plan: `Claude Apps/move-to-davyrockett-com.md`; master copy `Claude Apps/tools/move.js`).
  Keep it; a new app gets a copy with `data-keep` set to its own localStorage key prefix.
- **`suite.js`** (since 2026-10-18): every app also loads `<script src="suite.js" defer></script>` (in `ASSETS` too).
  It shows an "All apps" button when the app was opened from David's app suite (www.davyrockett.com/apps, one Home
  Screen icon for everything; master copy `Claude Apps/tools/suite.js`). New apps get it too. If a new app syncs,
  add it to `SYNCED` in the website's `apps/launcher.js` so the suite's one access key reaches it.
- **`share.js`** (since 2026-10-19): Settings in every app has a **Share** section (the app's link, "Copy link",
  and "Share…" where the device can). Load `<script src="share.js" defer></script>` (in `ASSETS` too) and add a
  `data-share` block using the app's own classes (see `Claude Apps/tools/share.js`). First Frets has its own
  share section with a QR code instead.
- **Every change must bump the version** (`tools/bump.sh` where it exists, otherwise `VERSION` in `sw.js`
  and the matching app version). Without it, installed copies on phones never update.
- Settings (gear icon) always has **Appearance: Light / Dark / Auto** and **Check for updates**.
  Apps open in **Light** unless changed in Settings.
- Design follows David's First Frets app: warm off-white / dark-brown palette, bright orange accent (#F57C14; dark mode #FF9433; David tried his logo orange #E27039, too red) and
  davyrockett grey secondary text (#676767; dark mode #A3A3A3),
  Big Shoulders Display headings, Atkinson Hyperlegible body text, works well on a phone.
- Data lives on the device (localStorage / IndexedDB). Apps whose data must sync between phone and Mac
  use a separate `davyrockett/<app>-data` repo (`data.json`) and an access key pasted into Settings.
  Never commit keys, tokens or anything in `private/`.
- **Publish when done:** commit, push to `main`, and confirm the live site shows the new version.
  End with a brief summary of what changed. David's Mac pulls GitHub changes into its Dropbox copy
  automatically, so pushing is all that's needed.

**Taste**
- Labels and descriptions plain and descriptive. Jokes belong in names (e.g. "Page Fright"), not taglines.
- Keep screens uncluttered: show extra controls only when they're relevant.
- Nothing should jump around: when a control doesn't apply, grey it out in place rather than hiding it, and
  reserve space for things that appear, so other controls never shift.
- **No AI voices, ever:** no text-to-speech or synthesised singing in any app. Use written instructions on
  screen, and instrument or synth sounds for audio.
- Commit messages: a short, plain description of the change.
- When renaming or moving an app, keep the old address working with a redirect repo.

**New apps:** create the repo under davyrockett and turn on GitHub Pages; David's Mac downloads new
davyrockett repos into `~/Dropbox/Local/Claude Apps/` automatically. Give each new app its own CLAUDE.md
with this section (copy it from any other app) plus an "## This app" section.
Also add every new app to David's unlinked app list, **www.davyrockett.com/apps** (`apps/index.html` in the
website repo, `Claude Apps/website`): icon, name and one-line description, in the right group.
<!-- shared-preferences:end -->

## This app

**Song Party** (built 2026-10-19): activity songs on the TV for groups of developmentally delayed adults who function
around a 6–12-year-old level (If You're Happy and You Know It, Hole in the Bottom of the Sea, …). Started as a copy of
Memory Lane Songbook (same data/sync, TV link `remote.js`, slide editor `slides.js`, step-by-step words), plus
Jam Session-style interactive bits. Live: https://www.davyrockett.com/song-party/  Local test: port 8776
(`song-party` in daily-practice's launch.json, or `Start Song Party.command`; test on 127.0.0.1 to skip the service worker).

- **David's choices (2026-10-19):** TV, driven by David (laptop/pedal, or the TV link), group members don't touch it.
  First features: picture song menu, magic words, and Hole in the Bottom of the Sea where the group picks what goes in
  the hole **each verse** from a picture board. **Bundled emoji pictures** (Twemoji SVGs in `pics/`, list in `pics.js`,
  CC-BY 4.0 credit in Settings and README) because old TV browsers show blank boxes for real emoji.
  David will send more lyrics later. Never retype copyrighted lyrics by hand: read them from David's files with a
  script (see Memory Lane). The two starting songs (Hole in the Bottom of the Sea, Old MacDonald) are traditional.
- **Look:** David asked for a look suited to the age group, so this app departs from the First Frets palette on purpose:
  Fredoka (round letters) for everything on screen, Atkinson Hyperlegible only in the editor/settings; warm cream
  background, bright group colours (`GROUP_COLORS` in app.js), rainbow-letter welcome title, gently bobbing pictures.
  Nothing flashes; `prefers-reduced-motion` stops the bobbing. Themes: Light / Dark / Yellow on blue / Auto, **C** cycles.
- **Sound:** `sound.js`, synth only (no voices, ever): pop (magic word), drop (thing lands in the hole), tick/land (spin),
  wiggle, twinkle (card), cheer (party). Short and mostly unpitched so they don't clash with David's key.
  Settings → Sound effects On/Off. With the TV link only the TV plays sounds (the remote is silent).
- **Silly words / mad libs (2026-10-25, `madlib.js`):** David asked for a mad libs activity ("and maybe Jam Session"),
  starting with Ring of Fire (verse 1 + chorus, as he pasted). `{word|kind}` in lyrics marks a word to swap; every
  `{word}` in the song gets the same pick. Kinds (`SILLY_KINDS`, 24 pictures each): `thing` (default, fits after "a"),
  `things` (lots of something, fits after "of"), `describe` (describing words). Any song with `{…}` (and no `activity`)
  opens screen `madlib` after the card: one board per marked word. **Like real Mad Libs, the pick screen never shows the
  lyric line** (v12, David: "Don't show where in the lyrics the words will go… It's supposed to be a surprise when you
  sing it"): just "Pick a describing word!" and only words that fit that spot. Space = Surprise spin (`spinTiles`,
  shared with hole.js), K = keep the real word (button says just "Real word"), Backspace = undo. Then the normal words
  screen with picks as `.swap` (picture always shown, a/an fixed incl. "a unicorn", capital kept). Picture question asks
  about the first and last pick ("Love is a …?", wrong answers from the same board); party shows the picks. Picks travel
  over the TV link (`ml` state on the pick screen, `mp` on the words screen; quiz/party use `chain` = picks).
  Ring of Fire: burning = describe, thing and ring = thing, fire = things (4 picks).
  `tools/silly-song.py` copies a song's words from Memory Lane's data and marks the swap words with kinds (never retype
  lyrics). Jam Session has it too (Silly Songs, `silly.js`, reading this repo's song list; same `SILLY_KINDS` copied
  there, so change both together; new pictures need copying to jam-session's `pics/` + `pics.js`).
- **Picture questions (2026-10-21):** David wanted something after each song like Memory Lane's questions, but
  interactive. He picked "picture question" from a list (also offered: copy-the-moves, guess-the-song, wake-up stretch
  before; freeze dance, sing-it-a-silly-way spin, calm-down breath after). Song field `quiz`: lines
  `question = right, wrong, wrong` (picture names; `word (pic)` for a different word). Screen `quiz` between the song and
  the party: 1–3 pick, wrong wiggles/fades, right grows + "Yes! Lion!"; N = next question, Enter = party, Esc = list.
  Each sing asks the next question in turn (`quizTurn`, in memory). Picture order comes from a hash of the question so
  linked devices match; state `qi`/`qp` over the TV link. Hole song asks what went in first/last (`holeQuiz`). A song
  without questions skips straight to the party. 12 songs got 1–3 questions each (in song-party-data).
  **Bonus questions (v9, David: "if they are having fun with the questions I'd like to keep going"):** after the song's
  own questions, N goes on through `BONUS_QUIZ` in app.js (46 everyday picture questions, same line format; label
  "Bonus question!"), mixed up, ones not yet shown this visit first (`bonusAsked`). The bonus order travels over the link
  (`qt` start, `qb` bonus order, `qi` position).
- **Flow:** welcome → picture tiles → "Get ready!" card (`how` lines, N = next) → words or activity → picture question → party screen
  (confetti, cheer, "Sing it again" / Next song). Memory Lane's talk questions were dropped; picture questions (above) took their place.
  No autoscroll mode. Songs open **two sections per screen** (smaller words, fewer presses; David 2026-10-19: "Always default to smaller text", re-added on its own after the v5 rollback); "Aa Bigger" switches to one.
- **Magic words:** `[word](pic)` in lyrics. The picture's space is saved next to the word from the start (no shifting);
  on firing it grows big in the middle of the screen, then flies into its place (CSS transitions, `fire()` in app.js).
  Settings → Magic words: **wait for a click on the word / number keys 1–9 (default since v2, David's request:
  "the emoji animals don't appear until the word is clicked")** or pop up by themselves (0.9 s after the verse, 1.3 s apart). Fired pictures travel over the TV link (`fx` in the state).
- **Hole in the Bottom of the Sea** (`hole.js`, song record `activity: 'hole'`, no lyrics): verse 1 = the hole; each verse
  is two screens (long line, with a small "Sing it two times!" above; then "There's a X, there's a X!" + the long line).
  The "There's a X, there's a X!" line is a row as big as the rest (v2, David: so it's obvious what to sing), not a banner. The words are rows
  top-down, newest thing first, each with its picture, ending "in the hole / in the bottom of the sea!" (so the rows
  look like the pile). Board: 24 things (`HOLE_ITEMS`), used ones greyed out; Space = Surprise! spin (lights up random
  pictures, slows, lands; synced over the link: the device that spun does the choosing); "Old song" = classic chain
  (`HOLE_CLASSIC`: bump = rock, wart = green dot, hair = curl, flea = ant, as near as emoji get); F = finish;
  max 10 things. Party screen shows everything that went in.
- **Data:** public repo davyrockett/song-party-data (`data.json`, same format as Memory Lane: `song` records with
  title, pic, cats, how, lyrics, optional slides/activity, plus one `settings` record). Edit in the app with David's
  access key (song-party-data, Contents read+write). Storage keys all start `sp.`.
- Written for older smart-TV browsers: plain `var`/functions, no `?.`, `??` or arrow functions (sw.js excepted).
- `sw.js` loads `pics.js` and precaches every picture; adding a picture = line in `pics.js`, `tools/get-pics.sh`, bump.
- Tested 2026-10-19 in the preview browser (TV size and phone size) and the TV link with two tabs (hole picks, spin,
  party, magic words, both directions). Not yet tried on a real smart TV.
- **ARC Adults songs (2026-10-19):** David's lyrics folder is `~/Dropbox/Local/Resounding Joy/ARC Adults` (chord-chart
  PDFs). `tools/import-arc.py` added 11 songs: from the charts (chord lines dropped, choruses written out in sung order,
  small typo fixes) for Happy and You Know It, Lion Sleeps Tonight, Under the Sea, Here Comes the Sun, Happy Trails,
  La Bamba; from Memory Lane's data for Fly Me to the Moon and Over the Rainbow (their ARC sheets are notated band
  parts) and Hound Dog, Lean On Me, Bare Necessities (scanned sheets). It never overwrites songs already in data.json.
  **Don't Worry Be Happy** is not in yet: the ARC PDF is scanned sheet music (OCR gives scrambled fragments) and the
  only other copies are a scanned guitar tab and a Wikifonia lead sheet with verse 1 only. Waiting for a text copy.
  No interactive bits on these songs yet (David: "we don't need interactive stuff for every song yet").
  Groups: Action, Silly, Animal, Dance, Movie, Feel-Good, Calm, Pick & Build (colours in `GROUP_COLORS`).
- **Rolled back (2026-10-19):** v5 added big verse pictures (`{clap}` lines), moving scenes, new sounds, and made songs
  open two sections per screen. David: "please go back to before this latest change. it broke too much stuff." It was
  reverted (app published as v6 = v4's code; songs restored to their pre-picture lyrics with fresh timestamps). The
  old work is in commit f2e8f9d (app) and f69177c (songs) if any of it is wanted again; ask David what broke first,
  and add things a little at a time.
