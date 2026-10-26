/* Song Party: big, bright activity songs for the TV, for groups of adults with developmental delays.
   Started as a copy of Memory Lane Songbook; David plays guitar live while the TV shows the words.

   Screens: welcome → song list (picture tiles) → title card ("Get ready!") → words, one section at a time
   (or an activity such as Hole in the Bottom of the Sea, hole.js; a song with {silly} words starts with a
   picture board for each one, madlib.js) → picture question (if the song has one)
   → party (confetti) → back to the list.
   Plus a song editor and Settings.

   Songs are records in one list ("items"), each stamped with when it last changed:
     song     – title, pic (picture name from pics.js), cats (groups), how (Get ready! lines), lyrics,
                quiz (optional picture questions after the song: "Who was sleeping? = lion, cow, duck"),
                lyrics may mark {words} the group swaps for pictures before singing (madlib.js),
                slides (optional layout), activity (optional: 'hole')
     settings – categories (the order of the group buttons)
   The list lives in the public repo davyrockett/song-party-data (data.json). Any device can read
   it; saving changes needs David's access key (Settings). Written for older TV browsers too, so no
   optional chaining (?.), ?? or arrow functions. */

var DATA_REPO = 'davyrockett/song-party-data';
var DATA_FILE = 'data.json';
// Published copy of the songs, on the same site as the app.
var PAGES_COPY = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'https://www.davyrockett.com/song-party-data/'
  : location.protocol + '//' + location.host + '/song-party-data/';
var K = {
  data: 'sp.data', token: 'sp.sync-token', last: 'sp.sync-last', dirty: 'sp.dirty',
  theme: 'sp.theme', size: 'sp.size', group: 'sp.group', sung: 'sp.sung', per: 'sp.per', sound: 'sp.sound', magic: 'sp.magic',
};
var THEMES = ['light', 'dark', 'blue'];

function $(id) { return document.getElementById(id); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
// A picture from the library (pics.js). Unknown names show music notes.
function picEl(name, cls) {
  var i = el('img', cls);
  i.alt = '';
  i.draggable = false;
  i.src = picUrl(name) || picUrl('notes');
  return i;
}
function setPic(img, name) { img.src = picUrl(name) || picUrl('notes'); }
function uid(p) { return p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function lines(text) { return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
var MAGIC = /\[([^\]]+)\]\(([^)]+)\)/g;
var SWAP = /\{([^{}]+)\}/g;   // a word the group swaps for a picture they pick (madlib.js)
function plain(text) { return swapText(text, ml.blanks, livePicks()); }
var toastTimer;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 3000);
}

/* ---------- Data ---------- */
var items = {};
try { items = JSON.parse(lsGet(K.data) || '{}').items || {}; } catch (e) { items = {}; }
function get(id) { var r = items[id]; return r && !r.deleted ? Object.assign({ id: id }, r) : null; }
// A song's name on its tile and card. Silly-words songs get "(Silly Words)" underneath instead, so it's left off here.
function songName(song) { return String(song.title || '').replace(/\s*\(silly words\)$/i, ''); }
function sortKey(t) { return String(t || '').replace(/^[(‘'"“]+/, '').replace(/^the /i, '').toLowerCase(); }
function allSongs() {
  return Object.keys(items).map(get).filter(function (r) { return r && r.type === 'song'; })
    .sort(function (a, b) { return sortKey(a.title).localeCompare(sortKey(b.title)); });
}
function groups() {
  var s = get('settings');
  var list = (s && s.categories ? s.categories : []).slice();
  allSongs().forEach(function (song) { (song.cats || []).forEach(function (c) { if (list.indexOf(c) < 0) list.push(c); }); });
  return list;
}
function saveLocal() { lsSet(K.data, JSON.stringify({ items: items })); }
function put(id, rec) {
  var clean = Object.assign({}, rec);
  delete clean.id;
  clean.updatedAt = new Date().toISOString();
  items[id] = clean;
  saveLocal();
  if (!sync.isOn()) lsSet(K.dirty, '1');
  sync.soon();
}

// Songs sung today get a small check on the song list.
function today() { return new Date().toLocaleDateString('en-CA'); }
function sungToday() {
  try { var d = JSON.parse(lsGet(K.sung) || '{}'); return d.date === today() ? d.ids || [] : []; } catch (e) { return []; }
}
function markSung(id) {
  var ids = sungToday();
  if (ids.indexOf(id) < 0) ids.push(id);
  lsSet(K.sung, JSON.stringify({ date: today(), ids: ids }));
}

/* ---------- Screens ---------- */
var current = 'welcome';
var SCREENS = ['welcome', 'list', 'card', 'lyrics', 'hole', 'madlib', 'quiz', 'party', 'editor', 'slides'];
function show(name) {
  SCREENS.forEach(function (n) { $(n).hidden = n !== name; });
  if (current === 'lyrics' && name !== 'lyrics') stopLyrics();
  if (current === 'hole' && name !== 'hole' && typeof holeStop === 'function') holeStop();
  if (current === 'madlib' && name !== 'madlib') mlStop();
  if (current === 'party' && name !== 'party') $('confetti').textContent = '';
  current = name;
  document.body.classList.remove('hide-cursor');
}

/* ---------- Welcome ---------- */
function renderWelcome() {
  var now = new Date();
  var m = now.getMonth();
  var season = m === 11 || m < 2 ? 'Winter' : m < 5 ? 'Spring' : m < 8 ? 'Summer' : 'Fall';
  $('welcome-day').textContent = 'Today is ' + now.toLocaleDateString('en-US', { weekday: 'long' });
  $('welcome-date').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' + season;
}
// The title in bright letters, one colour after another.
(function () {
  var h = $('welcome-title'), text = h.textContent, n = 0;
  h.textContent = '';
  text.split('').forEach(function (ch) {
    var s = el('span', ch === ' ' ? null : 'c' + (n++ % 6), ch);
    h.appendChild(s);
  });
})();
function openWelcome() { renderWelcome(); show('welcome'); $('welcome-go').focus(); }
$('welcome-go').addEventListener('click', function () { openList(); });
$('welcome-full').addEventListener('click', function () {
  var d = document.documentElement;
  var req = d.requestFullscreen || d.webkitRequestFullscreen;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else if (req) req.call(d);
});
setInterval(function () { if (current === 'welcome') renderWelcome(); }, 60000);

/* ---------- Song list ---------- */
var group = lsGet(K.group) || 'all';
var lastSongId = null;
// A bright colour for each group: a dot on its button, the background of its songs' tiles, the title card.
// Groups added later get one from the spare list.
var GROUP_COLORS = {
  'Action Songs': '#FF7A1A', 'Silly Songs': '#E84E8A', 'Animal Songs': '#3BAA5C', 'Pick & Build': '#2E8BD8',
  'Dance Songs': '#00A6C8', 'Movie Songs': '#8E5CD9', 'Feel-Good Songs': '#E8A800', 'Calm Songs': '#2BA89A',
  'Hello & Goodbye': '#B05CC9', 'Holiday Songs': '#D93B3B',
};
var SPARE_COLORS = ['#5C9E2E', '#E0601F', '#C2477A', '#4C7FD9', '#9E7A1F'];
function groupColor(name) {
  if (!name) return '#FF7A1A';
  if (GROUP_COLORS[name]) return GROUP_COLORS[name];
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SPARE_COLORS[h % SPARE_COLORS.length];
}
function soft(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function tint(elm, hex) {
  if (!hex) { elm.style.removeProperty('--c'); elm.style.removeProperty('--c-soft'); return; }
  elm.style.setProperty('--c', hex);
  elm.style.setProperty('--c-soft', soft(hex, 0.18));
}
// The colour a song shows: the open group's, or else the song's first group.
function songColor(song) {
  if (group !== 'all' && group !== 'az' && (song.cats || []).indexOf(group) >= 0) return groupColor(group);
  return groupColor((song.cats || [])[0]);
}
function allGroupKeys() { return ['all', 'az'].concat(groups()); }
// The list is shown in a mixed-up order, reshuffled each time the song list opens, with today's songs
// moved to the end. "A–Z" keeps alphabetical order. The order comes from a number (the seed), so a
// linked TV can show exactly the same order.
var shuffleSeed = Math.floor(Math.random() * 1e9);
function reshuffle() { shuffleSeed = Math.floor(Math.random() * 1e9); }
function mixKey(id) {
  var h = 2166136261;
  for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= shuffleSeed;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
function listSongs() {
  var s = allSongs();
  if (group !== 'az') {
    var sung = sungToday();
    s = s.slice().sort(function (a, b) {
      return (sung.indexOf(a.id) >= 0) - (sung.indexOf(b.id) >= 0) || mixKey(a.id) - mixKey(b.id);
    });
  }
  if (group === 'all' || group === 'az') return s;
  return s.filter(function (x) { return (x.cats || []).indexOf(group) >= 0; });
}
function renderChips() {
  var box = $('chips');
  box.textContent = '';
  if (allGroupKeys().indexOf(group) < 0) group = 'all';
  function chip(key, label) {
    var b = el('button', 'chip', label);
    b.setAttribute('aria-pressed', String(key === group));
    if (key !== 'all' && key !== 'az') { b.classList.add('has-c'); tint(b, groupColor(key)); }
    b.tabIndex = -1;
    b.addEventListener('click', function () { this.blur(); setGroup(key); });
    box.appendChild(b);
  }
  chip('all', 'All songs');
  chip('az', 'A–Z');
  groups().forEach(function (g) { chip(g, g); });
}
function setGroup(g) {
  group = g; lsSet(K.group, g);
  renderList();
  var first = $('grid').querySelector('.tile');
  if (first) first.focus();
}
function renderList() {
  renderChips();
  var grid = $('grid');
  grid.textContent = '';
  var sung = sungToday();
  listSongs().forEach(function (song) {
    var t = el('button', 'tile');
    t.dataset.id = song.id;
    tint(t, songColor(song));
    var wrap = el('span', 'tile-pic-wrap');
    wrap.appendChild(picEl(song.pic, 'tile-pic'));
    t.appendChild(wrap);
    t.appendChild(el('span', 'tile-title', songName(song)));
    if (isMadlib(song)) t.appendChild(el('span', 'tile-tag', '(Silly Words)'));
    // Always there (so tiles never change size); only visible for songs sung today.
    var done = el('span', 'tile-sung', '✓ Sung today');
    if (sung.indexOf(song.id) < 0) done.classList.add('off');
    t.appendChild(done);
    t.addEventListener('click', function () { openCard(song.id); });
    grid.appendChild(t);
  });
  if (!grid.children.length) {
    grid.appendChild(el('p', 'hint', allSongs().length ? 'No songs in this group yet.' : 'Loading songs…'));
  }
}
function openList() {
  // A fresh order every time the list opens (not when a linked device is copying another one's screen).
  var copying = typeof link !== 'undefined' && link.applying;
  if (current !== 'list' && !copying) reshuffle();
  show('list');
  renderList();
  var tile = lastSongId && $('grid').querySelector('[data-id="' + lastSongId + '"]');
  (tile || $('grid').querySelector('.tile') || $('settings-open')).focus();
}
function gridColumns() {
  var cols = getComputedStyle($('grid')).gridTemplateColumns.split(' ').filter(Boolean).length;
  return cols || 1;
}
function listKeys(e) {
  var tiles = Array.prototype.slice.call($('grid').querySelectorAll('.tile'));
  var i = tiles.indexOf(document.activeElement);
  var cols = gridColumns();
  var move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
  if (move) {
    e.preventDefault();
    var next = i < 0 ? 0 : Math.max(0, Math.min(tiles.length - 1, i + move));
    if (tiles[next]) tiles[next].focus();
    if (tiles[next]) tiles[next].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Tab') {
    e.preventDefault();
    var gs = allGroupKeys();
    var j = gs.indexOf(group) + (e.shiftKey ? -1 : 1);
    setGroup(gs[(j + gs.length) % gs.length]);
  } else if (e.key === 'Home' || e.key === 'Escape') {
    e.preventDefault();
    openWelcome();
  }
}

/* ---------- Title card ("Get ready!") ---------- */
var card = { song: null, i: 0 };
function howLines(song) {
  if (song.how && song.how.length) return song.how;
  return ['Sing along with David!'];
}
function openCard(id) {
  var song = get(id);
  if (!song) return;
  lastSongId = id;
  card = { song: song, i: 0 };
  $('card-title').textContent = songName(song);
  $('card-tag').hidden = !isMadlib(song);
  setPic($('card-pic'), song.pic);
  tint($('card'), songColor(song));
  renderPanel();
  show('card');
  $('card-start').focus();
  Sfx.play('twinkle');
}
function renderPanel() {
  var list = howLines(card.song), i = card.i % list.length;
  $('panel-text').textContent = list[i];
  $('panel-count').textContent = list.length > 1 ? (i + 1) + ' of ' + list.length : '';
  $('panel-next').style.visibility = list.length > 1 ? 'visible' : 'hidden';
}
function cardNext() { card.i++; renderPanel(); }
function startSong(song) {
  song = get(song.id) || song;
  if (song.activity === 'hole') holeOpen(song);
  else if (isMadlib(song)) mlOpen(song);
  else openLyrics(song);
}
$('panel-next').addEventListener('click', cardNext);
$('card-back').addEventListener('click', openList);
$('card-start').addEventListener('click', function () { startSong(card.song); });
function cardKeys(e) {
  var k = e.key.toLowerCase();
  if (k === 'n' || e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); cardNext(); }
  else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); openList(); }
  else if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); startSong(card.song); }
}

/* ---------- Words, one section at a time ----------
   David presses a key (or a foot pedal / clicker that acts like one) to go on. */
var ly = { song: null, wake: null };
// Text as verses: [{ chorus: true/false, lines: [...] }]. A blank line starts a new verse; a "[Chorus]" line marks one.
function textBlocks(text) {
  var out = [];
  String(text || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
    var ls = lines(block);
    if (!ls.length) return;
    var chorus = /^\[chorus\]$/i.test(ls[0]);
    if (chorus) ls = ls.slice(1);
    if (ls.length) out.push({ chorus: chorus, lines: ls });
  });
  return out;
}
// Songs David has laid out in the slide editor carry their own slides (one text per screen).
function customSlides(song) { return song && Array.isArray(song.slides) && song.slides.length ? song.slides : null; }
function songBlocks(song) {
  var sl = customSlides(song);
  if (!sl) return textBlocks(song.lyrics);
  var out = [];
  sl.forEach(function (t) { out = out.concat(textBlocks(t)); });
  return out;
}

/* Long verses are split into even pages of up to 5 lines. Songs open with two sections per screen (pages 1+2,
   3+4, …: smaller words, fewer presses; David's default); the Size button switches to one section per screen. */
var st = { pages: [], screens: [], i: 0, custom: null, fired: [], timers: [] };
var STEP_SIZE = { smaller: 5.4, normal: 6.6, bigger: 8 };   // starting text size (vw); shrinks to fit
function narrow() { return window.innerWidth < 800; }
function perScreen() { return lsGet(K.per) === '1' ? 1 : 2; }   // two sections per screen unless Bigger was pressed
function songPages(song) {
  var pages = [];
  songBlocks(song).forEach(function (b) {
    var n = b.lines.length, parts = Math.ceil(n / 5), per = Math.ceil(n / parts);
    for (var i = 0; i < n; i += per) pages.push({ chorus: b.chorus, lines: b.lines.slice(i, i + per) });
  });
  return pages.length ? pages : [{ chorus: false, lines: ['(No words for this song yet)'] }];
}
// Screens are lists of page numbers: [[0], [1], …] or, two per screen, [[0, 1], [2, 3], …].
// A song with its own slides: one screen per slide, whatever the Size button says (it only changes text size).
function buildScreens() {
  if (st.custom) { st.screens = st.custom.slice(); return; }
  var per = perScreen(), out = [];
  for (var i = 0; i < st.pages.length; i += per) out.push(st.pages.slice(i, i + per).map(function (_, j) { return i + j; }));
  st.screens = out;
}
function openStep(song) {
  lsSet(K.per, '2');   // every song starts with two sections per screen (smaller words; David, 2026-10-19)
  st = { pages: songPages(song), screens: [], i: 0, custom: null, fired: [], timers: [] };
  var sl = customSlides(song);
  if (sl) {
    st.pages = []; st.custom = [];
    sl.forEach(function (t) {
      var idx = [];
      textBlocks(t).forEach(function (b) { idx.push(st.pages.length); st.pages.push(b); });
      if (!idx.length) { idx.push(st.pages.length); st.pages.push({ chorus: false, lines: [' '] }); }
      st.custom.push(idx);
    });
  }
  buildScreens();
  setPic($('step-pic'), song.pic);
  show('lyrics');
  keepAwake(true);
  $('lyrics-badge').hidden = true;
  renderStep(0);
  wake();
}
function togglePerScreen() {
  var firstPage = st.screens[st.i][0];
  lsSet(K.per, perScreen() === 2 ? '1' : '2');
  buildScreens();
  // Stay on the same words.
  st.i = 0;
  for (var j = 0; j < st.screens.length; j++) if (st.screens[j].indexOf(firstPage) >= 0) { st.i = j; break; }
  renderStep(0);
  badge(st.custom ? (perScreen() === 2 ? 'Smaller words' : 'Bigger words') : perScreen() === 2 ? 'Two sections per screen' : 'One section per screen');
}
function fitStep() {
  var page = $('step-page'), stage = $('step-stage');
  var size = (STEP_SIZE[document.documentElement.getAttribute('data-size')] || STEP_SIZE.normal) * (narrow() ? 1.4 : 1)
    * (st.custom && perScreen() === 1 ? 1.35 : 1);   // a laid-out song: "Bigger" just means bigger words
  page.style.fontSize = size + 'vw';
  while (size > 2 && (page.scrollHeight > stage.clientHeight || page.scrollWidth > stage.clientWidth)) {
    size *= 0.94;
    page.style.fontSize = size + 'vw';
  }
  // Rather than break a line in the middle of a phrase, shrink a little (down to about 3/4 size).
  var floor = narrow() ? size : size * 0.75;
  while (size > floor && wrapped(page)) {
    size *= 0.95;
    page.style.fontSize = size + 'vw';
  }
}
function wrapped(page) {
  var lh = parseFloat(getComputedStyle(page).fontSize) * 1.25;
  return Array.prototype.some.call(page.querySelectorAll('p:not(.chorus-label)'), function (p) { return p.offsetHeight > lh * 1.5; });
}
// One line of words. Magic words, [frog](frog), become a highlighted word with a picture that pops up.
// Silly words, {fire}, become what the group picked (madlib.js).
var TOKENS = /\[([^\]]+)\]\(([^)]+)\)|\{([^{}]+)\}/g;
function lineEl(text, counter) {
  var p = el('p'), last = 0, m;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(text))) {
    if (m.index > last) p.appendChild(document.createTextNode(text.slice(last, m.index)));
    last = TOKENS.lastIndex;
    if (m[3] != null) { swapEl(p, m[3]); continue; }
    var w = el('span', 'magic');
    w.dataset.k = counter.n++;
    w.dataset.pic = m[2].trim();
    w.appendChild(picEl(m[2].trim(), 'mg-pic'));   // takes its space from the start, so nothing shifts when it shows
    w.appendChild(document.createTextNode(m[1]));
    p.appendChild(w);
  }
  if (last < text.length) p.appendChild(document.createTextNode(text.slice(last)));
  return p;
}
function renderStep(dir) {
  var n = st.screens.length, screen = st.screens[st.i];
  var page = $('step-page');
  clearMagic();
  page.textContent = '';
  page.className = 'step-page';
  var counter = { n: 0 };
  screen.forEach(function (pi) {
    var p = st.pages[pi];
    var block = el('div', 'step-block' + (p.chorus ? ' chorus' : ''));
    if (p.chorus) block.appendChild(el('p', 'chorus-label', 'Chorus'));
    p.lines.forEach(function (l) { block.appendChild(lineEl(l, counter)); });
    page.appendChild(block);
  });
  fitStep();
  if (dir) { void page.offsetWidth; page.classList.add(dir > 0 ? 'in-fwd' : 'in-back'); }
  $('step-head').textContent = ly.song.title + '  ·  ' + (st.i + 1) + ' of ' + n;
  var next = $('step-next');
  next.textContent = '';
  next.appendChild(el('span', 'arrow', '▼'));
  next.appendChild(document.createTextNode(st.i < n - 1 ? plain(st.pages[st.screens[st.i + 1][0]].lines[0]) : 'The end! 🎉'));
  $('progress-fill').style.width = ((st.i + 1) / n * 100) + '%';
  $('c-page').textContent = (st.i + 1) + ' / ' + n;
  $('c-back').disabled = st.i === 0;
  $('c-next').textContent = st.i < n - 1 ? 'Next ▸' : 'Finish 🎉';
  $('c-size').textContent = perScreen() === 2 ? 'Aa Bigger' : 'Aa Smaller';
  $('c-size').title = st.custom ? (perScreen() === 2 ? 'Bigger words' : 'Smaller words')
    : perScreen() === 2 ? 'One section per screen, bigger words' : 'Two sections per screen, smaller words';
  // Magic pictures wait for a click on the word (or a number key), unless Settings says to pop them up by themselves.
  if (magicAuto() && counter.n) {
    for (var k = 0; k < counter.n; k++) {
      (function (k) { st.timers.push(setTimeout(function () { fire(k); }, 900 + k * 1300)); })(k);
    }
  }
}

/* Magic words: the picture grows big in the middle of the screen, then flies into its place by the word. */
function magicAuto() { return lsGet(K.magic) === 'auto'; }   // default: wait for a click (David, 2026-10-19)
function clearMagic() {
  st.timers.forEach(clearTimeout);
  st.timers = [];
  st.fired = [];
  $('pop-layer').textContent = '';
}
function fire(k, fromLink) {
  var w = $('step-page').querySelector('.magic[data-k="' + k + '"]');
  if (!w) return;
  if (st.fired.indexOf(k) < 0) st.fired.push(k);
  var slot = w.querySelector('.mg-pic'), r = slot.getBoundingClientRect();
  if (!r.height) { w.classList.add('shown'); return; }
  var big = Math.min(window.innerHeight * 0.5, window.innerWidth * 0.4);
  var dx = window.innerWidth / 2 - (r.left + r.width / 2), dy = window.innerHeight * 0.45 - (r.top + r.height / 2);
  var s = big / r.height;
  var pop = picEl(w.dataset.pic, 'pop');
  pop.style.left = r.left + 'px'; pop.style.top = r.top + 'px';
  pop.style.width = r.width + 'px'; pop.style.height = r.height + 'px';
  pop.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (s * 0.2) + ')';
  pop.style.opacity = '0';
  $('pop-layer').appendChild(pop);
  w.classList.remove('shown');
  void pop.offsetWidth;
  pop.className = 'pop grow';
  pop.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
  pop.style.opacity = '1';
  Sfx.play('pop');
  setTimeout(function () {
    pop.className = 'pop home';
    pop.style.transform = 'translate(0,0) scale(1)';
  }, 1000);
  setTimeout(function () {
    if (pop.parentNode) pop.parentNode.removeChild(pop);
    w.classList.add('shown');
  }, 1520);
  if (!fromLink && typeof stateChanged === 'function') stateChanged();
}
$('step-page').addEventListener('click', function (e) {
  var w = e.target.closest ? e.target.closest('.magic') : null;
  if (!w) return;
  e.stopPropagation();
  fire(Number(w.dataset.k));
});

function stepGo(d) {
  var n = st.screens.length;
  if (d > 0 && st.i >= n - 1) { openQuiz(ly.song, mlChain(ly.song)); return; }
  if (d < 0 && st.i === 0) return;
  st.i += d;
  renderStep(d);
}
function stepKeys(e) {
  if (e.repeat) { e.preventDefault(); return; }   // a held key or pedal shouldn't skip ahead
  var k = e.key;
  if (k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); stepGo(1); }
  else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); stepGo(-1); }
  else if (k === 'Escape') { e.preventDefault(); openList(); }
  else if (/^[1-9]$/.test(k)) { e.preventDefault(); fire(Number(k) - 1); }
}
$('step').addEventListener('click', function () { stepGo(1); });
// iPad / iPhone: swipe left for the next section, right to go back (a plain tap also goes on).
var swipe = null;
$('step').addEventListener('touchstart', function (e) { var t = e.touches[0]; swipe = { x: t.clientX, y: t.clientY }; }, { passive: true });
$('step').addEventListener('touchend', function (e) {
  if (!swipe) return;
  var t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); stepGo(dx < 0 ? 1 : -1); }
});
// The control bar fades back while singing, and comes back on any mouse move or key.
var quietTimer;
function wake() {
  var bars = [$('ctrl'), $('hole-ctrl')];
  bars.forEach(function (b) { b.classList.remove('quiet'); });
  clearTimeout(quietTimer);
  quietTimer = setTimeout(function () {
    if (current === 'lyrics' || current === 'hole') bars.forEach(function (b) { b.classList.add('quiet'); });
  }, 3500);
}
function badge(text) {
  var b = $('lyrics-badge');
  b.textContent = text; b.hidden = false;
  clearTimeout(badge.timer);
  badge.timer = setTimeout(function () { b.hidden = true; }, 2200);
}
function openLyrics(song) {
  ly.song = song;
  openStep(song);
}
function stopLyrics() {
  clearMagic();
  $('ctrl').classList.remove('quiet');
  keepAwake(false);
}
function cycleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  lsSet(K.theme, next); applyTheme(next);
}
function lyricsKeys(e) { wake(); stepKeys(e); }
// Control bar buttons (blur after a click, so a later Space or Enter goes to the song, not the button).
function ctrl(id, fn) { $(id).addEventListener('click', function (e) { e.stopPropagation(); this.blur(); wake(); fn(); }); }
ctrl('c-close', function () { openList(); });
ctrl('c-restart', function () { st.i = 0; renderStep(-1); });
ctrl('c-back', function () { stepGo(-1); });
ctrl('c-next', function () { stepGo(1); });
ctrl('c-size', togglePerScreen);
ctrl('c-colors', cycleTheme);
ctrl('c-done', function () { openQuiz(ly.song, mlChain(ly.song)); });
$('list-colors').addEventListener('click', function () { this.blur(); cycleTheme(); });
$('list-home').addEventListener('click', function () { this.blur(); openWelcome(); });
window.addEventListener('resize', function () { if (current === 'lyrics') { clearMagic(); fitStep(); markFired(); } });
// After a resize, pictures that already popped stay showing.
function markFired() {
  Array.prototype.forEach.call($('step-page').querySelectorAll('.magic.shown'), function (w) {
    var k = Number(w.dataset.k); if (st.fired.indexOf(k) < 0) st.fired.push(k);
  });
}
var cursorTimer;
document.addEventListener('mousemove', function () {
  document.body.classList.remove('hide-cursor');
  var singing = current === 'lyrics' || current === 'hole';
  if (singing) wake();
  clearTimeout(cursorTimer);
  if (singing) cursorTimer = setTimeout(function () { if (current === 'lyrics' || current === 'hole') document.body.classList.add('hide-cursor'); }, 2000);
});
// Stop the screen from going to sleep in the middle of a song.
function keepAwake(on) {
  if (!('wakeLock' in navigator)) return;
  if (on && !ly.wake) navigator.wakeLock.request('screen').then(function (w) { ly.wake = w; }).catch(function () {});
  if (!on && ly.wake) { ly.wake.release().catch(function () {}); ly.wake = null; }
}

/* ---------- Picture question: after the song ----------
   "Who was sleeping?" with three big pictures. The group points or shouts, David presses 1, 2 or 3 (or clicks).
   A wrong one wiggles and fades; the right one grows and sparkles. Enter goes on to the party.
   Questions are lines in the song's quiz list, "question = right answer, wrong answer, wrong answer".
   Each answer is a picture name; "quack (duck)" shows the word "quack" with the duck picture.
   A song with several questions asks the next one each time it's sung. N = another question: the song's own
   ones first, then bonus questions about everyday things (BONUS_QUIZ), so the group can keep going while it's fun.
   The hole song asks about what the group put in the hole, a silly-words song about the words they picked. */
var quiz = { song: null, chain: null, qs: [], own: 0, start: 0, bonus: [], qi: 0, picked: [], built: '' };
var quizTurn = {};    // song id → which of its questions to ask first next time
var bonusAsked = {};  // bonus questions already shown this visit go to the back of the line
var BONUS_QUIZ = [
  'Which one can fly? = bird, cow, pig',
  'Which one swims? = fish, horse, cat',
  'Which one is a fruit? = banana, shoe, car',
  'Which one can we eat? = pizza, rock, hat',
  'Which one is cold? = snowman, sun, pizza',
  'Which one shines at night? = moon, shoe, pig',
  'Which one says woof? = dog, cat, duck',
  'Which one says meow? = cat, dog, cow',
  'Which one says baa? = sheep, pig, lion',
  'Which one says roar? = lion, mouse, chick',
  'Which one says quack? = duck, cow, horse',
  'Which one goes on your head? = hat, shoe, banana',
  'Which one goes on your foot? = shoe, hat, crown',
  'Which one has wheels? = car, fish, tree',
  'Which one goes on the water? = boat, train, house',
  'Which one goes to space? = rocket, bus, cow',
  'Which one plays music? = guitar, banana, shoe',
  'Which one do we bang like this? = drum, cake, cat',
  'Which one rings? = bell, apple, sheep',
  'Which face is happy? = happy, sad, angry',
  'Which face is sad? = sad, happy, silly',
  'Which face is sleepy? = sleepy, surprised, happy',
  'Which face is silly? = silly, sad, sleepy',
  'Which one is for a birthday? = cake, rock, log',
  'Which one is really big? = elephant, mouse, ant',
  'Which one is really tiny? = ant, elephant, whale',
  'Which one is really slow? = snail, rabbit, horse',
  'Which one hops? = frog, snail, fish',
  'Which one makes honey? = bee, cow, dog',
  'Which one lays eggs? = chicken, cow, dog',
  'Which one has a long nose? = elephant, dog, fish',
  'Which one is yellow? = banana, apple, frog',
  'Which one is red? = strawberry, banana, frog',
  'Which one is orange? = carrot, frog, banana',
  'Which one is green? = frog, pig, banana',
  'Which one grows in a garden? = flower, car, shoe',
  'Which one do we use in the rain? = umbrella, ball, cake',
  'Which one do we kick? = ball, cake, teddy bear (teddy)',
  'Which one do we hug at bedtime? = teddy bear (teddy), rock, crab',
  'Which one does a king wear? = crown, shoe, banana',
  'Which one is spooky? = ghost, rainbow, flower',
  'Which one is for Halloween? = pumpkin, snowman, Christmas tree (christmas tree)',
  'Which one is for Christmas? = Christmas tree (christmas tree), pumpkin, sun',
  'Which one comes out after the rain? = rainbow, car, fish',
  'Which one lives in a shell? = turtle, dog, bird',
  'Which one has stripes? = bee, frog, pig',
];
function parseQuiz(line) {
  var at = line.indexOf('=');
  if (at < 0) return null;
  var answers = line.slice(at + 1).split(',').map(function (a) {
    a = a.trim();
    var m = a.match(/^(.*?)\s*\(([^)]+)\)$/);
    return m ? { w: m[1].trim() || m[2].trim(), p: m[2].trim().toLowerCase() } : { w: a, p: a.toLowerCase() };
  }).filter(function (a) { return a.w; }).slice(0, 4);
  var q = line.slice(0, at).trim();
  return q && answers.length >= 2 ? { q: q, a: answers } : null;
}
function holeQuiz(chain) {
  if (!chain || !chain.length) return [];
  function ask(q, right) {
    var a = [holeItem(right)];
    chain.concat(HOLE_ITEMS.map(function (x) { return x[0]; })).forEach(function (w) {
      if (a.length < 3 && !a.some(function (x) { return x.word === w; })) a.push(holeItem(w));
    });
    return { q: q, a: a.map(function (x) { return { w: x.word, p: x.pic }; }) };
  }
  var out = [ask('What did we put in the hole first?', chain[0])];
  if (chain.length > 1) out.push(ask('What did we put in last?', chain[chain.length - 1]));
  return out;
}
function quizList(song, chain) {
  if (song.activity === 'hole') return holeQuiz(chain);
  var own = (song.quiz || []).map(parseQuiz).filter(Boolean);
  return chain && isMadlib(song) ? mlQuiz(song, chain).concat(own) : own;
}
// The pictures' mixed-up order, worked out from the question so every linked device shows the same order.
function quizOrder(q) {
  var h = 0, i;
  for (i = 0; i < q.q.length; i++) h = (h * 31 + q.q.charCodeAt(i)) % 9973;
  var order = q.a.map(function (_, j) { return j; });
  for (i = order.length - 1; i > 0; i--) { h = (h * 7 + 3) % 9973; var j = h % (i + 1), t = order[i]; order[i] = order[j]; order[j] = t; }
  return order;
}
// Bonus questions in a mixed-up order, ones not shown yet this visit first, skipping any the song already asks.
function bonusOrder(own) {
  var asked = own.map(function (q) { return q.q; }), fresh = [], old = [];
  BONUS_QUIZ.forEach(function (line, b) {
    var q = parseQuiz(line);
    if (q && asked.indexOf(q.q) < 0) (bonusAsked[b] ? old : fresh).push(b);
  });
  function mix(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  return mix(fresh).concat(mix(old));
}
// from: { start, bonus, qi } when copying another linked device's screen.
function openQuiz(song, chain, from) {
  var own = quizList(song, chain);
  if (!own.length) { openParty(song, chain); return; }
  var start, bonus;
  if (from) { start = (from.start || 0) % own.length; bonus = from.bonus || []; }
  else { start = (quizTurn[song.id] || 0) % own.length; quizTurn[song.id] = start + 1; bonus = bonusOrder(own); }
  var qs = own.slice(start).concat(own.slice(0, start));
  bonus.forEach(function (b) {
    var q = BONUS_QUIZ[b] && parseQuiz(BONUS_QUIZ[b]);
    if (q) { q.bonus = b; qs.push(q); }
  });
  quiz = { song: song, chain: chain || null, qs: qs, own: own.length, start: start, bonus: bonus,
           qi: from ? Math.min(from.qi || 0, qs.length - 1) : 0, picked: [], built: '' };
  tint($('quiz'), songColor(song));
  show('quiz');
  renderQuiz();
  $('quiz-done').focus();
  Sfx.play('pop');
}
function quizRight() { return quiz.picked.indexOf(0) >= 0; }
function renderQuiz() {
  var q = quiz.qs[quiz.qi], box = $('quiz-pics');
  var key = quiz.song.id + '/' + quiz.qi + '/' + q.q;
  if (quiz.built !== key) {
    quiz.built = key;
    if (q.bonus != null) bonusAsked[q.bonus] = true;
    $('quiz-label').textContent = q.bonus != null ? 'Bonus question!' : 'Question time!';
    $('quiz-q').textContent = q.q;
    box.textContent = '';
    box.className = 'quiz-pics n' + q.a.length;
    quizOrder(q).forEach(function (ai, d) {
      var b = el('button', 'qcard');
      b.dataset.a = ai;
      b.appendChild(el('span', 'qcard-num', String(d + 1)));
      b.appendChild(picEl(q.a[ai].p));
      b.appendChild(el('span', 'qcard-word', q.a[ai].w));
      b.addEventListener('click', function () { this.blur(); quizPick(ai); });
      box.appendChild(b);
    });
  }
  var right = quizRight();
  Array.prototype.forEach.call(box.children, function (b) {
    var ai = Number(b.dataset.a);
    b.classList.toggle('yes', ai === 0 && right);
    b.classList.toggle('no', ai !== 0 && quiz.picked.indexOf(ai) >= 0);
    b.classList.toggle('dim', ai !== 0 && right);
  });
  var w = q.a[0].w;
  $('quiz-yes').textContent = right ? 'Yes! ' + w.charAt(0).toUpperCase() + w.slice(1) + '!' : '';
  $('quiz-more').style.visibility = quiz.qs.length > 1 ? 'visible' : 'hidden';
}
// ai = which answer (0 is the right one).
function quizPick(ai, fromLink) {
  if (quizRight() || quiz.picked.indexOf(ai) >= 0 || !quiz.qs[quiz.qi].a[ai]) return;
  quiz.picked.push(ai);
  Sfx.play(ai === 0 ? 'land' : 'wiggle');
  renderQuiz();
}
function quizMore() {
  if (quiz.qs.length < 2) return;
  var qi = (quiz.qi + 1) % quiz.qs.length;
  if (qi < quiz.own) quizTurn[quiz.song.id] = quiz.start + qi + 1;   // next time, start after the last one asked
  quiz.qi = qi; quiz.picked = [];
  renderQuiz();
  Sfx.play('pop');
}
$('quiz-more').addEventListener('click', function () { this.blur(); quizMore(); });
$('quiz-done').addEventListener('click', function () { openParty(quiz.song, quiz.chain); });
function quizKeys(e) {
  if (e.repeat) { e.preventDefault(); return; }
  var k = e.key;
  if (/^[1-4]$/.test(k)) {
    e.preventDefault();
    var b = $('quiz-pics').children[Number(k) - 1];
    if (b) quizPick(Number(b.dataset.a));
  }
  else if (k === 'n' || k === 'N') { e.preventDefault(); quizMore(); }
  else if (k === 'Enter' || k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); openParty(quiz.song, quiz.chain); }
  else if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); openList(); }
}

/* ---------- Party: after the song ---------- */
var party = { song: null, chain: null };
var PARTY_TITLES = ['Yay! Great singing!', 'Hooray! You did it!', 'Woo-hoo! Great job!', 'Awesome singing!'];
function openParty(song, chain) {
  markSung(song.id);
  party = { song: song, chain: chain || null, t: party.song && party.song.id === song.id ? party.t : Math.floor(Math.random() * PARTY_TITLES.length) };
  show('party');
  renderParty();
  confetti();
  Sfx.play('cheer');
  $('party-done').focus();
}
function renderParty() {
  $('party-title').textContent = PARTY_TITLES[party.t || 0];
  var showBox = $('party-show');
  showBox.textContent = '';
  var hole = party.song.activity === 'hole';
  var things = !party.chain ? [] : hole ? party.chain.slice().reverse().map(holeItem) : mlShown(party.song, party.chain);
  if (things.length) {
    $('party-sub').textContent = hole ? 'Look what we put in the hole!' : 'Our silly words!';
    things.forEach(function (it) {
      var c = el('span', 'party-thing');
      c.appendChild(picEl(it.pic));
      c.appendChild(el('span', null, it.word));
      showBox.appendChild(c);
    });
  } else {
    $('party-sub').textContent = party.song.title;
    showBox.appendChild(picEl(party.song.pic, 'party-pic'));
  }
}
var CONFETTI = ['party', 'confetti', 'star', 'heart', 'notes', 'balloon', 'sparkles'];
function confetti() {
  var box = $('confetti');
  box.textContent = '';
  for (var i = 0; i < 26; i++) {
    var c = picEl(CONFETTI[i % CONFETTI.length], 'bit');
    c.style.left = (Math.random() * 96) + 'vw';
    c.style.animationDuration = (2.6 + Math.random() * 2.4) + 's';
    c.style.animationDelay = (Math.random() * 1.2) + 's';
    var size = 2.5 + Math.random() * 3;
    c.style.width = c.style.height = size + 'vw';
    box.appendChild(c);
  }
  clearTimeout(confetti.timer);
  confetti.timer = setTimeout(function () { box.textContent = ''; }, 7000);
}
$('party-again').addEventListener('click', function () { startSong(party.song); });
$('party-done').addEventListener('click', openList);
function partyKeys(e) {
  if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Enter') { e.preventDefault(); openList(); }
  else if (e.key === ' ') { e.preventDefault(); confetti(); Sfx.play('cheer'); }
}

/* ---------- Keyboard ---------- */
function typing() {
  var a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
}
document.addEventListener('keydown', function (e) {
  if ($('settings').open || current === 'editor' || current === 'slides' || typing() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'c' || e.key === 'C') { cycleTheme(); return; }
  if (current === 'welcome' && e.key === 'Enter' && document.activeElement === document.body) { e.preventDefault(); openList(); }
  else if (current === 'list') listKeys(e);
  else if (current === 'card') cardKeys(e);
  else if (current === 'lyrics') lyricsKeys(e);
  else if (current === 'hole') holeKeys(e);
  else if (current === 'madlib') mlKeys(e);
  else if (current === 'quiz') quizKeys(e);
  else if (current === 'party') partyKeys(e);
});

/* ---------- Song editor ---------- */
var edId = null, edTimer = null;
(function () {
  var dl = $('pic-names');
  Object.keys(PICS).sort().forEach(function (n) { var o = el('option'); o.value = n; dl.appendChild(o); });
})();
function openEditor() {
  $('settings').close();
  show('editor');
  renderEdList();
  edPick(edId && get(edId) ? edId : null);
  renderEdSync();
}
function renderEdList() {
  var ul = $('ed-list');
  ul.textContent = '';
  allSongs().forEach(function (s) {
    var li = el('li');
    var b = el('button');
    b.appendChild(picEl(s.pic, 'ed-pic'));
    b.appendChild(document.createTextNode(s.title));
    b.setAttribute('aria-current', String(s.id === edId));
    b.addEventListener('click', function () { edSaveNow(); edPick(s.id); });
    li.appendChild(b);
    ul.appendChild(li);
  });
}
function edPick(id) {
  edId = id;
  var s = id ? get(id) : null;
  $('ed-empty').hidden = !!s;
  $('ed-fields').hidden = !s;
  var songs = allSongs();
  Array.prototype.forEach.call($('ed-list').querySelectorAll('button'), function (b, i) {
    b.setAttribute('aria-current', String(songs[i] && songs[i].id === id));
  });
  if (!s) return;
  $('f-title').value = s.title || '';
  $('f-pic').value = s.pic || '';
  setPic($('f-pic-show'), s.pic);
  $('f-how').value = (s.how || []).join('\n');
  $('f-quiz').value = (s.quiz || []).join('\n');
  $('f-quiz-label').hidden = !!s.activity;
  $('f-lyrics').value = s.lyrics || '';
  $('f-activity').hidden = !s.activity;
  $('f-lyrics-label').hidden = !!s.activity;
  $('f-slides-note').hidden = !customSlides(s);
  renderEdCats(s.cats || []);
  $('f-saved').textContent = '';
  resetDelete();
}
function renderEdCats(checked) {
  var box = $('f-cats');
  box.textContent = '';
  groups().forEach(function (g) {
    var l = el('label');
    var c = el('input'); c.type = 'checkbox'; c.value = g; c.checked = checked.indexOf(g) >= 0;
    c.addEventListener('change', edChanged);
    l.appendChild(c); l.appendChild(document.createTextNode(g));
    box.appendChild(l);
  });
}
function edChanged() {
  $('f-saved').textContent = 'Saving…';
  setPic($('f-pic-show'), $('f-pic').value.trim().toLowerCase());
  clearTimeout(edTimer);
  edTimer = setTimeout(edSaveNow, 700);
}
function edSaveNow() {
  clearTimeout(edTimer);
  if (!edId || $('ed-fields').hidden) return;
  var old = get(edId);
  if (!old) return;
  var cats = Array.prototype.filter.call($('f-cats').querySelectorAll('input'), function (c) { return c.checked; })
    .map(function (c) { return c.value; });
  var rec = Object.assign({}, old, {
    title: $('f-title').value.trim() || 'Untitled song',
    pic: $('f-pic').value.trim().toLowerCase(),
    cats: cats,
    how: lines($('f-how').value),
    lyrics: $('f-lyrics').value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(),
  });
  var qz = lines($('f-quiz').value);
  if (qz.length) rec.quiz = qz; else delete rec.quiz;
  var same = JSON.stringify(Object.assign({}, rec, { updatedAt: 0 })) === JSON.stringify(Object.assign({}, old, { updatedAt: 0 }));
  if (!same) put(edId, rec);
  $('f-saved').textContent = sync.isOn() ? 'Saved' : 'Saved on this device only';
  if (rec.title !== old.title || rec.pic !== old.pic) renderEdList();
}
['f-title', 'f-pic', 'f-how', 'f-quiz', 'f-lyrics'].forEach(function (id) {
  $(id).addEventListener('input', edChanged);
  $(id).addEventListener('blur', edSaveNow);
});
$('ed-form').addEventListener('submit', function (e) { e.preventDefault(); edSaveNow(); });
$('f-addcat').addEventListener('click', function () {
  var name = $('f-newcat').value.trim();
  if (!name) return;
  var s = get('settings') || { type: 'settings', categories: [] };
  var cats = (s.categories || []).slice();
  if (cats.indexOf(name) < 0) { cats.push(name); put('settings', Object.assign({}, s, { type: 'settings', categories: cats })); }
  var checked = Array.prototype.filter.call($('f-cats').querySelectorAll('input'), function (c) { return c.checked; }).map(function (c) { return c.value; });
  checked.push(name);
  renderEdCats(checked);
  $('f-newcat').value = '';
  edSaveNow();
});
$('ed-new').addEventListener('click', function () {
  edSaveNow();
  var id = uid('song');
  put(id, { type: 'song', title: 'New song', pic: 'notes', cats: [], how: [], lyrics: '' });
  renderEdList();
  edPick(id);
  $('f-title').select();
  $('f-title').focus();
});
function resetDelete() { var b = $('f-delete'); b.textContent = 'Delete song'; b.classList.remove('armed'); }
$('f-delete').addEventListener('click', function () {
  var b = $('f-delete');
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Click again to delete'; setTimeout(resetDelete, 4000); return; }
  put(edId, { deleted: true });
  edId = null;
  renderEdList();
  edPick(null);
  toast('Song deleted.');
});
$('ed-close').addEventListener('click', function () { edSaveNow(); openList(); });
function renderEdSync() {
  var s = $('ed-sync');
  s.className = 'ed-sync';
  if (!sync.isOn()) { s.textContent = 'Changes stay on this device. Add your access key in Settings to save them for every device.'; s.classList.add('problem'); }
  else if (sync.status === 'syncing') s.textContent = 'Syncing…';
  else if (['auth', 'other', 'conflict', 'offline'].indexOf(sync.status) >= 0) { s.textContent = sync.message; s.classList.add('problem'); }
  else s.textContent = '✓ Saved for every device';
}

/* ---------- Sync with GitHub (same approach as Memory Lane) ----------
   On open, every few minutes, and shortly after each edit: download data.json, merge record
   by record (newest change wins), and upload the result when a key is set. Without a key,
   this device simply shows the published songs. */
function SyncError(kind, message) { this.kind = kind; this.message = message; }
function toBase64(text) {
  var bytes = new TextEncoder().encode(text), bin = '';
  for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromBase64(b64) {
  var bin = atob(b64.replace(/\s/g, ''));
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function github(path, options, token) {
  options = options || {};
  if (token === undefined) token = lsGet(K.token);
  var headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (options.body) headers['Content-Type'] = 'application/json';
  return fetch('https://api.github.com/repos/' + DATA_REPO + path, Object.assign({}, options, { cache: 'no-store', headers: headers }))
    .catch(function () { throw new SyncError('offline', 'No connection. Will try again shortly.'); })
    .then(function (res) {
      if (token && res.status === 401) throw new SyncError('auth', 'The access key isn’t working (expired or mistyped).');
      if (token && res.status === 403) throw new SyncError('auth', 'Your access key can read but not save. On GitHub, give it song-party-data with Contents set to “Read and write”.');
      if (!token && (res.status === 403 || res.status === 429)) throw new SyncError('offline', 'GitHub is busy. Will try again shortly.');
      return res;
    });
}
function download(token) {
  if (!token) {
    return fetch('https://api.github.com/repos/' + DATA_REPO + '/contents/' + DATA_FILE,
      { cache: 'no-cache', headers: { Accept: 'application/vnd.github.raw+json' } })
      .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
      .catch(function () {
        // Backup: the published copy, which can lag a few minutes behind.
        return fetch(PAGES_COPY + DATA_FILE + '?t=' + Date.now(), { cache: 'no-store' })
          .catch(function () { throw new SyncError('offline', 'No connection.'); })
          .then(function (res) { if (!res.ok) throw new SyncError('offline', 'Couldn’t load the songs.'); return res.json(); });
      })
      .then(function (data) { return { data: data, sha: null }; });
  }
  return github('/contents/' + DATA_FILE, {}, token).then(function (res) {
    if (res.status === 404) return { data: null, sha: null };
    if (!res.ok) throw new SyncError('other', 'GitHub said ' + res.status + ' when downloading.');
    return res.json().then(function (body) { return { data: JSON.parse(fromBase64(body.content)), sha: body.sha }; });
  });
}
function upload(data, sha) {
  var body = { message: 'Song changes', content: toBase64(JSON.stringify(data, null, 2) + '\n') };
  if (sha) body.sha = sha;
  return github('/contents/' + DATA_FILE, { method: 'PUT', body: JSON.stringify(body) }).then(function (res) {
    if (res.status === 409 || res.status === 422) throw new SyncError('conflict', 'Changed on another device at the same moment.');
    if (!res.ok) throw new SyncError('other', 'GitHub said ' + res.status + ' when saving.');
  });
}
function merge(local, remote) {
  var out = Object.assign({}, local);
  Object.keys(remote).forEach(function (id) {
    var l = out[id], r = remote[id];
    if (!l || (r.updatedAt || '') >= (l.updatedAt || '')) out[id] = r;
  });
  return out;
}
function canon(s) { return JSON.stringify(Object.keys(s || {}).sort().map(function (k) { return [k, s[k]]; })); }
function replaceLocal(next) {
  items = next; saveLocal();
  if (current === 'list') renderList();
  if (current === 'editor') { renderEdList(); }
}

var sync = {
  status: 'idle', message: '', running: false, again: false, timer: 0,
  isOn: function () { return Boolean(lsGet(K.token)); },
  set: function (status, message) {
    this.status = status; this.message = message || '';
    renderSyncSettings();
    if (current === 'editor') renderEdSync();
  },
  run: function () {
    var self = this;
    if (self.running) { self.again = true; return Promise.resolve(); }
    self.running = true;
    var on = self.isOn();
    if (on) self.set('syncing');
    function attempt(n) {
      return download(on ? lsGet(K.token) : null).then(function (r) {
        var remote = r.data && r.data.items ? r.data.items : null;
        if (!on) {
          // No key: show the published songs, unless this device has edits that haven't been saved anywhere.
          if (remote && (!lsGet(K.dirty) || !Object.keys(items).length) && canon(remote) !== canon(items)) replaceLocal(remote);
          return;
        }
        var merged = merge(items, remote || {});
        if (canon(merged) !== canon(items)) replaceLocal(merged);
        if (remote && canon(merged) === canon(remote)) return;
        return upload({ app: 'song-party', format: 1, items: merged }, r.sha).catch(function (e) {
          if (e.kind !== 'conflict' || n >= 3) throw e;
          return attempt(n + 1);
        });
      });
    }
    return attempt(1).then(function () {
      if (on) { lsSet(K.last, new Date().toISOString()); lsSet(K.dirty, null); self.set('ok'); } else self.set('view');
    }).catch(function (e) {
      self.set(e.kind || 'other', e.message || 'Something went wrong.');
    }).then(function () {
      self.running = false;
      if (self.again) { self.again = false; self.run(); }
    });
  },
  soon: function () {
    if (!this.isOn()) return;
    var self = this;
    clearTimeout(self.timer);
    self.timer = setTimeout(function () { self.run(); }, 1500);
  },
  connect: function (token) {
    var self = this;
    return download(token).then(function () { return github('', {}, token); }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (repo) {
      if (repo && repo.permissions && !repo.permissions.push) throw new SyncError('auth', 'That key can read but not change song-party-data.');
      lsSet(K.token, token);
      lsSet(K.last, null);
      return self.run();
    });
  },
  disconnect: function () { lsSet(K.token, null); lsSet(K.last, null); renderSyncSettings(); },
};
function timeAgo(iso) {
  var mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  if (mins < 1440) return Math.floor(mins / 60) + ' h ago';
  var days = Math.floor(mins / 1440);
  return days === 1 ? 'yesterday' : days + ' days ago';
}
function renderSyncSettings() {
  var on = sync.isOn();
  $('sync-on').hidden = !on;
  $('sync-form').hidden = on;
  $('settings-open').classList.toggle('alert', on && ['auth', 'other', 'conflict'].indexOf(sync.status) >= 0);
  if (!on) return;
  var s = $('sync-status'), last = lsGet(K.last);
  s.className = 'cap';
  if (sync.status === 'syncing') s.textContent = 'Syncing…';
  else if (sync.status === 'ok') { s.textContent = '✓ Editing on · synced ' + timeAgo(last); s.classList.add('ok'); }
  else if (['auth', 'other', 'conflict', 'offline'].indexOf(sync.status) >= 0) { s.textContent = sync.message; s.classList.add('problem'); }
  else s.textContent = last ? 'Last synced ' + timeAgo(last) : 'Not synced yet';
}
$('sync-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var err = $('sync-error'), btn = $('sync-connect'), token = $('sync-token').value.trim();
  err.hidden = true;
  if (!token) { err.textContent = 'Paste the access key.'; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'Checking…';
  sync.connect(token).then(function () {
    $('sync-token').value = '';
    toast(sync.status === 'ok' ? 'Connected. Song changes now save for every device.' : sync.message);
  }).catch(function (ex) {
    err.textContent = ex.message || 'Couldn’t connect.'; err.hidden = false;
  }).then(function () { btn.disabled = false; btn.textContent = 'Connect'; });
});
$('sync-now').addEventListener('click', function () { sync.run(); });
$('sync-disconnect').addEventListener('click', function () {
  var b = $('sync-disconnect');
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Click again to turn off'; return; }
  b.classList.remove('armed'); b.textContent = 'Turn off editing here';
  sync.disconnect();
});
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sync.run(); });
window.addEventListener('online', function () { sync.run(); });
// Check for song changes every few minutes, but never in the middle of a song.
setInterval(function () {
  if (document.visibilityState === 'visible' && navigator.onLine && current !== 'lyrics' && current !== 'hole') sync.run();
}, 3 * 60 * 1000);

/* ---------- Settings ---------- */
function applyTheme(t) {
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  markSettings();
}
var SEGS = [['theme', K.theme, 'light'], ['size', K.size, 'normal'], ['sound', K.sound, 'on'], ['magic', K.magic, 'click']];
function markSettings() {
  SEGS.forEach(function (s) {
    var val = lsGet(s[1]) || s[2];
    Array.prototype.forEach.call(document.querySelectorAll('[data-' + s[0] + '-v]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-' + s[0] + '-v') === val));
    });
  });
}
SEGS.forEach(function (s) {
  Array.prototype.forEach.call(document.querySelectorAll('[data-' + s[0] + '-v]'), function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-' + s[0] + '-v');
      lsSet(s[1], v);
      if (s[0] === 'theme') applyTheme(v);
      if (s[0] === 'size') document.documentElement.setAttribute('data-size', v);
      if (s[0] === 'sound' && v === 'on') Sfx.play('pop');
      markSettings();
    });
  });
});
matchMedia('(prefers-color-scheme: dark)').addListener(function () { if (lsGet(K.theme) === 'auto') applyTheme('auto'); });
$('settings-open').addEventListener('click', function () {
  markSettings();
  renderSyncSettings();
  $('ver-line').textContent = 'You’re on ' + window.APP_VERSION + '.';
  $('set-update').disabled = false;
  $('settings').showModal();
});
$('settings-close').addEventListener('click', function () { $('settings').close(); });
$('open-editor').addEventListener('click', openEditor);
$('set-update').addEventListener('click', function () {
  var ver = $('ver-line'), ub = $('set-update'), reg = window.SW_REG;
  if (!reg || !navigator.onLine) { ver.textContent = 'Connect to the internet, then try again.'; return; }
  ub.disabled = true; ver.textContent = 'Checking…';
  reg.update().catch(function () {}).then(function () {
    var w = reg.waiting || reg.installing;
    if (w) {
      ver.textContent = 'Updating now…';
      var go = function () { w.postMessage('skipWaiting'); };
      if (w.state === 'installed') go();
      else w.addEventListener('statechange', function () { if (w.state === 'installed') go(); });
    } else {
      ver.textContent = 'You’re on the latest version (' + window.APP_VERSION + ').';
      ub.disabled = false;
    }
  });
});

/* ---------- Offline + updates ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    window.SW_REG = reg;
    function offer(w) {
      if (!w || !navigator.serviceWorker.controller) return;
      $('update-banner').hidden = false;
      $('update-go').onclick = function () { w.postMessage('skipWaiting'); };
    }
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing;
      w.addEventListener('statechange', function () { if (w.state === 'installed') offer(w); });
    });
  }).catch(function () {});
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloaded || current === 'lyrics' || current === 'hole') return;   // never reload in the middle of a song
    reloaded = true; location.reload();
  });
}

markSettings();
openWelcome();
sync.run();
