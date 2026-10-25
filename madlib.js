/* Silly words (mad libs): before singing, the group swaps some of the song's words for pictures they pick.

   In the lyrics, {fire} marks a word the group gets to swap. Every {fire} in the song gets the same pick, so
   "ring of {fire}" becomes "ring of pizza" all the way through. The picture board comes up once for each marked
   word, showing the line with a gap where the word goes ("Love is a burning ____"). David clicks what the group
   chose, presses Space for a surprise pick, or K to keep the song's own word. Then the words come up as usual,
   with the picks highlighted beside their pictures, and the picture question asks what the group picked.
   Loaded after app.js and hole.js and uses their globals. Plain old JavaScript for TV browsers. */

// [word sung, picture name]. 24 fit the board (6 across, 4 down).
var SILLY_ITEMS = [
  ['pizza', 'pizza'], ['banana', 'banana'], ['cake', 'cake'], ['ice cream', 'ice cream'], ['donut', 'donut'], ['cookie', 'cookie'],
  ['hamburger', 'hamburger'], ['carrot', 'carrot'], ['egg', 'egg'], ['duck', 'duck'], ['frog', 'frog'], ['cat', 'cat'],
  ['dog', 'dog'], ['pig', 'pig'], ['cow', 'cow'], ['monkey', 'monkey'], ['chicken', 'chicken'], ['dinosaur', 'dinosaur'],
  ['unicorn', 'unicorn'], ['shoe', 'shoe'], ['hat', 'hat'], ['teddy bear', 'teddy'], ['balloon', 'balloon'], ['robot', 'robot'],
];

// blanks: the marked words (lower case, in the order they first come up); picks: what the group chose for each,
// in the same order (the blank itself when they kept the song's own word).
var ml = { song: null, blanks: [], picks: [], spinning: false, spinN: 0, spinTarget: '', timers: [] };

function sillyItem(word) {
  for (var i = 0; i < SILLY_ITEMS.length; i++) if (SILLY_ITEMS[i][0] === word) return { word: word, pic: SILLY_ITEMS[i][1] };
  return holeItem(word);
}
function songText(song) { return (song.lyrics || '') + '\n' + (customSlides(song) || []).join('\n'); }
function songBlanks(song) {
  var out = [], text = songText(song), m;
  SWAP.lastIndex = 0;
  while ((m = SWAP.exec(text))) {
    var k = m[1].trim().toLowerCase();
    if (k && out.indexOf(k) < 0) out.push(k);
  }
  return out;
}
function isMadlib(song) { return !!song && !song.activity && songBlanks(song).length > 0; }

// What a marked word turns into: { word, pic } for a pick, or null to sing the song's own word.
function swapFor(orig, blanks, picks) {
  var i = blanks.indexOf(orig.trim().toLowerCase()), p = i >= 0 ? picks[i] : null;
  if (!p || p === blanks[i]) return null;
  var it = sillyItem(p);
  // Keep a capital letter at the start of a line.
  return { word: /^[A-Z]/.test(orig.trim()) ? it.word.charAt(0).toUpperCase() + it.word.slice(1) : it.word, pic: it.pic };
}
// The picks for the song on screen (ly.song), or none.
function livePicks() { return ml.song && ly.song && ml.song.id === ly.song.id ? ml.picks : []; }
// "a" or "an" before a swapped word: "a pizza", "an egg".
function fixArticle(before, word) {
  return before.replace(/\b(a|an)(\s+)$/i, function (_, art, sp) {
    var want = /^[aeiou]/i.test(word) ? 'an' : 'a';
    return (art.charAt(0) === 'A' ? want.charAt(0).toUpperCase() + want.slice(1) : want) + sp;
  });
}
// A marked word in the lyrics (called by lineEl in app.js): the pick with its picture, or the song's own word.
function swapEl(p, orig) {
  var s = swapFor(orig, ml.blanks, livePicks());
  if (!s) { p.appendChild(document.createTextNode(orig)); return; }
  var prev = p.lastChild;
  if (prev && prev.nodeType === 3) prev.nodeValue = fixArticle(prev.nodeValue, s.word);
  var w = el('span', 'swap');
  w.appendChild(picEl(s.pic, 'sw-pic'));
  w.appendChild(document.createTextNode(s.word));
  p.appendChild(w);
}
// Plain text with the picks put in (for the "next line" hint and the picture question).
function swapText(text, blanks, picks) {
  var out = '', last = 0, m;
  text = String(text || '').replace(MAGIC, '$1');
  SWAP.lastIndex = 0;
  while ((m = SWAP.exec(text))) {
    var s = swapFor(m[1], blanks, picks);
    out += text.slice(last, m.index);
    if (s) out = fixArticle(out, s.word);
    out += s ? s.word : m[1];
    last = SWAP.lastIndex;
  }
  return out + text.slice(last);
}
// The first line where a marked word comes up.
function blankLine(song, blank) {
  var ls = lines(songText(song));
  for (var i = 0; i < ls.length; i++) {
    SWAP.lastIndex = 0;
    var m;
    while ((m = SWAP.exec(ls[i]))) if (m[1].trim().toLowerCase() === blank) return ls[i];
  }
  return '{' + blank + '}';
}
// For the picture question and party: all the picks, or null when the song on screen isn't a silly-words song.
function mlChain(song) { return ml.song && song && ml.song.id === song.id ? ml.picks.slice() : null; }

function mlOpen(song) {
  mlClear();
  ly.song = song;
  ml = { song: song, blanks: songBlanks(song), picks: [], spinning: false, spinN: 0, spinTarget: '', timers: [] };
  show('madlib');
  keepAwake(true);
  renderMl();
}
function mlClear() {
  ml.timers.forEach(clearTimeout);
  ml.timers = [];
  ml.spinning = false;
}
function mlStop() { mlClear(); keepAwake(false); }

/* ---------- Drawing ---------- */
function renderMl() {
  mlClear();
  var i = ml.picks.length, n = ml.blanks.length, blank = ml.blanks[i];
  if (!blank) return;
  $('ml-head').textContent = ml.song.title + '  ·  ' + (n > 1 ? 'Word ' + (i + 1) + ' of ' + n : 'Pick a word');
  // The line, with the words picked so far put in and a gap where this word goes.
  var q = $('ml-q'), line = blankLine(ml.song, blank).replace(MAGIC, '$1'), last = 0, m, gap = false;
  q.textContent = '';
  SWAP.lastIndex = 0;
  while ((m = SWAP.exec(line))) {
    if (m.index > last) q.appendChild(document.createTextNode(line.slice(last, m.index)));
    last = SWAP.lastIndex;
    if (!gap && m[1].trim().toLowerCase() === blank) { q.appendChild(el('span', 'ml-gap')); gap = true; }
    else swapEl(q, m[1]);
  }
  if (last < line.length) q.appendChild(document.createTextNode(line.slice(last)));
  var grid = $('ml-grid');
  grid.textContent = '';
  SILLY_ITEMS.forEach(function (it) {
    var b = el('button', 'ptile');
    b.dataset.word = it[0];
    b.appendChild(picEl(it[1]));
    b.appendChild(el('span', null, it[0]));
    b.disabled = ml.picks.indexOf(it[0]) >= 0;   // greyed out in place once it's been picked
    b.addEventListener('click', function () { if (!ml.spinning) mlChoose(it[0]); });
    grid.appendChild(b);
  });
  $('ml-real').textContent = 'Real word: ' + blank;
  var focus = grid.querySelector('.ptile:not([disabled])');
  if (focus) focus.focus();
}

/* ---------- Choosing ---------- */
function mlChoose(word) {
  if (!word || ml.picks.length >= ml.blanks.length) return;
  ml.picks.push(word);
  Sfx.play('pop');
  if (ml.picks.length < ml.blanks.length) renderMl();
  else openLyrics(ml.song);   // all picked: sing it!
}
function mlSpin(target, fromLink) {
  if (ml.spinning || current !== 'madlib') return;
  var tiles = Array.prototype.slice.call($('ml-grid').querySelectorAll('.ptile:not([disabled])'));
  if (!tiles.length) return;
  if (!target) target = tiles[Math.floor(Math.random() * tiles.length)].dataset.word;
  var land = $('ml-grid').querySelector('.ptile[data-word="' + target + '"]');
  if (!land) return;
  ml.spinning = true;
  if (!fromLink) { ml.spinN = Date.now(); ml.spinTarget = target; if (typeof stateChanged === 'function') stateChanged(); }
  spinTiles(tiles, land, ml.timers, function () {
    ml.spinning = false;
    if (!fromLink) mlChoose(target);
  });
}
function mlBack() {
  if (ml.spinning) return;
  if (!ml.picks.length) { openCard(ml.song.id); return; }
  ml.picks.pop();
  renderMl();
}
function mlKeys(e) {
  if (e.repeat) { e.preventDefault(); return; }
  var k = e.key;
  if (k === 'Escape') { e.preventDefault(); openList(); return; }
  if (ml.spinning) { e.preventDefault(); return; }
  if (k === 'ArrowRight') { e.preventDefault(); gridMove(1, 0, $('ml-grid')); }
  else if (k === 'ArrowLeft') { e.preventDefault(); gridMove(-1, 0, $('ml-grid')); }
  else if (k === 'ArrowDown') { e.preventDefault(); gridMove(0, 1, $('ml-grid')); }
  else if (k === 'ArrowUp') { e.preventDefault(); gridMove(0, -1, $('ml-grid')); }
  else if (k === 'Enter') {
    e.preventDefault();
    var a = document.activeElement;
    if (a && a.classList.contains('ptile')) mlChoose(a.dataset.word); else if (a && a.tagName === 'BUTTON') a.click(); else mlSpin();
  }
  else if (k === ' ' || k === 'PageDown') { e.preventDefault(); mlSpin(); }
  else if (k === 'Backspace' || k === 'PageUp') { e.preventDefault(); mlBack(); }
  else if (k === 'k' || k === 'K') { e.preventDefault(); mlChoose(ml.blanks[ml.picks.length]); }
}
$('ml-close').addEventListener('click', function () { this.blur(); openList(); });
$('ml-back').addEventListener('click', function () { this.blur(); mlBack(); });
$('ml-real').addEventListener('click', function () { this.blur(); if (!ml.spinning) mlChoose(ml.blanks[ml.picks.length]); });
$('ml-spin').addEventListener('click', function () { this.blur(); mlSpin(); });

/* ---------- After the song ---------- */
// Picture questions about the picks: "Love is a burning …?" with the group's pick and two others.
function mlQuiz(song, picks) {
  var blanks = songBlanks(song), swapped = [];
  blanks.forEach(function (b, i) { if (picks[i] && picks[i] !== b) swapped.push(i); });
  if (!swapped.length) return [];
  function ask(i) {
    var line = blankLine(song, blanks[i]), at = line.toLowerCase().indexOf('{' + blanks[i]);
    var before = swapText(line.slice(0, at), blanks, picks).replace(/[\s,]+$/, '');
    var a = [sillyItem(picks[i])];
    picks.concat(SILLY_ITEMS.map(function (x) { return x[0]; })).forEach(function (w) {
      if (a.length < 3 && blanks.indexOf(w) < 0 && !a.some(function (x) { return x.word === w; })) a.push(sillyItem(w));
    });
    return { q: before ? before + ' …?' : 'What did we pick instead of “' + blanks[i] + '”?', a: a.map(function (x) { return { w: x.word, p: x.pic }; }) };
  }
  var out = [ask(swapped[0])];
  if (swapped.length > 1) out.push(ask(swapped[swapped.length - 1]));
  return out;
}
// The picks to show on the party screen (not the words the group kept).
function mlShown(song, picks) {
  var blanks = songBlanks(song);
  return picks.filter(function (p, i) { return p && p !== blanks[i]; }).map(sillyItem);
}

/* ---------- TV link ---------- */
function mlState() { return { p: ml.picks.slice(), sn: ml.spinN, sw: ml.spinTarget }; }
// Copy the other device's picks (true when they changed).
function mlSet(song, picks) {
  if (ml.song && ml.song.id === song.id && ml.picks.join('|') === picks.join('|')) return false;
  if (!ml.song || ml.song.id !== song.id) ml = { song: song, blanks: songBlanks(song), picks: [], spinning: false, spinN: 0, spinTarget: '', timers: [] };
  ml.picks = picks.slice();
  return true;
}
function mlApply(s, song) {
  if (current !== 'madlib' || !ml.song || ml.song.id !== song.id) mlOpen(song);
  if (mlSet(song, s.p || [])) renderMl();
  if (s.sn && s.sn !== ml.spinN) {
    // The other device pressed Surprise!: spin here too and land on the same thing (that device does the choosing).
    ml.spinN = s.sn; ml.spinTarget = s.sw;
    mlSpin(s.sw, true);
  }
}
