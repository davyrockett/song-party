/* Hole in the Bottom of the Sea: the group picks what goes in the hole, one new thing per verse.

   Verse 1 is just the hole. After each verse a picture board comes up ("What's on the log?"): David clicks
   what the group chose, or presses Space for a surprise pick (the board spins and lands on something).
   The new thing drops into the sea with a plop, and the words build up from the top down, the same way
   the pile looks:   There's a duck / on the pizza / on the log / in the hole / in the bottom of the sea!
   Each verse is two screens: the long line (sing it two times), then "There's a duck, there's a duck!"
   and the long line again. "Classic" picks the old song's next thing (log, bump, frog, wart, hair, fly, flea).
   Loaded after app.js and uses its globals. Plain old JavaScript for TV browsers. */

// [word sung, picture name]. 24 fit the board (6 across, 4 down).
var HOLE_ITEMS = [
  ['log', 'log'], ['frog', 'frog'], ['fish', 'fish'], ['duck', 'duck'], ['cat', 'cat'], ['dog', 'dog'],
  ['pizza', 'pizza'], ['banana', 'banana'], ['shoe', 'shoe'], ['hat', 'hat'], ['crab', 'crab'], ['octopus', 'octopus'],
  ['turtle', 'turtle'], ['shark', 'shark'], ['whale', 'whale'], ['cake', 'cake'], ['teddy bear', 'teddy'], ['car', 'car'],
  ['cow', 'cow'], ['pig', 'pig'], ['ice cream', 'ice cream'], ['crown', 'crown'], ['guitar', 'guitar'], ['dinosaur', 'dinosaur'],
];
// The old song, as close as emoji pictures get (a bump is a rock, a wart a green dot, a flea an ant).
var HOLE_CLASSIC = [['log', 'log'], ['bump', 'rock'], ['frog', 'frog'], ['wart', 'green dot'], ['hair', 'curl'], ['fly', 'fly'], ['flea', 'ant']];
var HOLE_MAX = 10;   // after this many things, the next press ends the song

var hs = { song: null, chain: [], phase: 'verse', part: 0, justAdded: '', spinning: false, spinN: 0, spinTarget: '', timers: [] };

function holeItem(word) {
  var all = HOLE_ITEMS.concat(HOLE_CLASSIC);
  for (var i = 0; i < all.length; i++) if (all[i][0] === word) return { word: all[i][0], pic: all[i][1] };
  return { word: word, pic: word };
}
function article(word) { return /^[aeiou]/i.test(word) ? 'an' : 'a'; }
function classicNext() {
  var n = hs.chain.length;
  if (n >= HOLE_CLASSIC.length) return null;
  for (var i = 0; i < n; i++) if (hs.chain[i] !== HOLE_CLASSIC[i][0]) return null;
  return HOLE_CLASSIC[n][0];
}

function holeOpen(song) {
  ly.song = song;
  holeClear();
  hs = { song: song, chain: [], phase: 'verse', part: 0, justAdded: '', spinning: false, spinN: 0, spinTarget: '', timers: [] };
  show('hole');
  keepAwake(true);
  renderHole(0);
  wake();
}
function holeClear() {
  hs.timers.forEach(clearTimeout);
  hs.timers = [];
  hs.spinning = false;
}
function holeStop() { holeClear(); keepAwake(false); $('hole-ctrl').classList.remove('quiet'); }

/* ---------- Drawing ---------- */
function renderHole(dir) {
  holeClear();
  var pick = hs.phase === 'pick';
  $('hole-verse').hidden = pick;
  $('hole-pick').hidden = !pick;
  if (pick) renderPick(); else renderVerse(dir);
  var n = hs.chain.length;
  $('h-page').textContent = pick ? 'Pick!' : 'Verse ' + (n + 1);
  $('h-back').disabled = !pick && n === 0 && hs.part === 0;
  $('h-next').textContent = pick ? '🎲 Surprise' : hs.part === 1 && n >= HOLE_MAX ? 'Finish 🎉' : 'Next ▸';
}
function holePicEl(pic, cls) {
  if (pic === 'hole') { var h = el('span', 'hole-pic ' + (cls || '')); h.appendChild(el('span')); return h; }
  return picEl(pic, cls);
}
// One row: picture, then words with the thing's name in yellow.
function holeRow(pic, before, noun, after) {
  var r = el('div', 'hrow');
  var p = el('span', 'hpic');
  p.appendChild(holePicEl(pic));
  r.appendChild(p);
  var t = el('span', 'htext');
  t.appendChild(document.createTextNode(before));
  t.appendChild(el('b', null, noun));
  if (after) t.appendChild(document.createTextNode(after));
  r.appendChild(t);
  return r;
}
function renderVerse(dir) {
  var n = hs.chain.length, words = hs.chain.slice().reverse();
  var rowsBox = $('hole-rows');
  rowsBox.textContent = '';
  $('hole-head').textContent = hs.song.title + '  ·  Verse ' + (n + 1);
  // The small line above the words: a reminder on the first screen, empty (but keeping its space) on the second.
  $('hole-banner').textContent = hs.part === 0 ? 'Sing it two times!' : '';
  var newest = n ? holeItem(words[0]) : { word: 'hole', pic: 'hole' };
  // Second screen: "There's a duck, there's a duck!" first, as big as the rest, then the long line again.
  if (hs.part === 1) {
    var a = article(newest.word);
    var lead = holeRow(newest.pic, 'There’s ' + a + ' ', newest.word, ', there’s ' + a + ' ');
    lead.querySelector('.htext').appendChild(el('b', null, newest.word));
    lead.querySelector('.htext').appendChild(document.createTextNode('!'));
    lead.classList.add('lead');
    rowsBox.appendChild(lead);
  }
  if (!n) rowsBox.appendChild(holeRow('hole', 'There’s a ', 'hole', ''));
  words.forEach(function (w, i) {
    var it = holeItem(w);
    var row = holeRow(it.pic, i === 0 ? 'There’s ' + article(w) + ' ' : 'on the ', w, '');
    row.dataset.word = w;
    if (i === 0) row.classList.add('newest');
    rowsBox.appendChild(row);
  });
  if (n) rowsBox.appendChild(holeRow('hole', 'in the ', 'hole', ''));
  rowsBox.appendChild(holeRow('wave', 'in the bottom of the ', 'sea', '!'));
  fitHole();
  if (dir) { void rowsBox.offsetWidth; rowsBox.classList.remove('in-fwd', 'in-back'); rowsBox.classList.add(dir > 0 ? 'in-fwd' : 'in-back'); }
  // The new thing drops into the sea.
  if (hs.justAdded && hs.part === 0 && n && words[0] === hs.justAdded) {
    var top = rowsBox.querySelector('.newest .hpic');
    if (top) top.classList.add('drop');
    Sfx.play('drop');
  }
  hs.justAdded = '';
}
function fitHole() {
  var rows = $('hole-rows'), stage = $('hole-stage');
  var size = window.innerWidth < 800 ? 9 : 6.4;
  rows.style.fontSize = size + 'vw';
  while (size > 1.5 && (rows.scrollHeight > stage.clientHeight || rows.scrollWidth > stage.clientWidth)) {
    size *= 0.94;
    rows.style.fontSize = size + 'vw';
  }
}
$('hole-rows').addEventListener('click', function (e) {
  var p = e.target.closest ? e.target.closest('.hpic') : null;
  if (!p) return;
  e.stopPropagation();
  p.classList.remove('drop', 'wiggle');
  void p.offsetWidth;
  p.classList.add('wiggle');
  Sfx.play('wiggle');
});
$('hole-verse').addEventListener('click', function () { holeGo(1); });

function renderPick() {
  var n = hs.chain.length;
  var q = $('pick-q');
  q.textContent = '';
  var last = n ? holeItem(hs.chain[n - 1]) : { word: 'hole', pic: 'hole' };
  q.appendChild(document.createTextNode(n ? 'What’s on the ' + last.word + '?' : 'What’s in the hole?'));
  q.appendChild(holePicEl(last.pic, 'qpic'));
  var grid = $('pick-grid');
  grid.textContent = '';
  HOLE_ITEMS.forEach(function (it) {
    var b = el('button', 'ptile');
    b.dataset.word = it[0];
    b.appendChild(picEl(it[1]));
    b.appendChild(el('span', null, it[0]));
    b.disabled = hs.chain.indexOf(it[0]) >= 0;   // greyed out in place once it's in the hole
    b.addEventListener('click', function () { if (!hs.spinning) holeChoose(it[0]); });
    grid.appendChild(b);
  });
  var c = classicNext(), cb = $('pick-classic');
  cb.textContent = '';
  cb.appendChild(picEl(c ? holeItem(c).pic : 'log', 'btn-pic'));
  cb.appendChild(document.createTextNode(c ? ' Old song: ' + c : ' Old song'));
  cb.disabled = !c;
  var focus = grid.querySelector('.ptile:not([disabled])');
  if (focus) focus.focus();
}
function enabledTiles() { return Array.prototype.slice.call($('pick-grid').querySelectorAll('.ptile:not([disabled])')); }

/* ---------- Choosing ---------- */
function holeChoose(word) {
  if (!word || hs.chain.indexOf(word) >= 0 || hs.chain.length >= HOLE_MAX) return;
  hs.chain.push(word);
  hs.phase = 'verse'; hs.part = 0; hs.justAdded = word;
  renderHole(1);
}
// Surprise! The board lights up one picture after another, slowing down, and lands on one.
function holeSpin(target, fromLink) {
  if (hs.spinning || hs.phase !== 'pick') return;
  var tiles = enabledTiles();
  if (!tiles.length) return;
  if (!target) target = tiles[Math.floor(Math.random() * tiles.length)].dataset.word;
  var land = $('pick-grid').querySelector('.ptile[data-word="' + target + '"]');
  if (!land) return;
  hs.spinning = true;
  if (!fromLink) { hs.spinN = Date.now(); hs.spinTarget = target; if (typeof stateChanged === 'function') stateChanged(); }
  var steps = 16, t = 0, prev = null, path = [];
  for (var i = 0; i < steps - 1; i++) {
    // A random picture each time, never the same one twice in a row (and not the winner just before it lands).
    var pickOne, tries = 0;
    do { pickOne = tiles[Math.floor(Math.random() * tiles.length)]; tries++; }
    while (tries < 12 && (pickOne === path[path.length - 1] || (i === steps - 2 && pickOne === land)));
    path.push(pickOne);
  }
  path.push(land);
  path.forEach(function (tile, i) {
    t += 50 + i * i * 1.2;
    hs.timers.push(setTimeout(function () {
      if (prev) prev.classList.remove('lit');
      tile.classList.add('lit');
      prev = tile;
      if (i === path.length - 1) { tile.classList.add('landed'); Sfx.play('land'); }
      else Sfx.play('tick');
    }, t));
  });
  hs.timers.push(setTimeout(function () {
    hs.spinning = false;
    if (!fromLink) holeChoose(target);
  }, t + 1100));
}
function holeFinish() { openQuiz(hs.song, hs.chain.slice()); }

/* ---------- Moving through the song ---------- */
function holeGo(d) {
  if (hs.spinning) return;
  var n = hs.chain.length;
  if (hs.phase === 'verse') {
    if (d > 0) {
      if (hs.part === 0) hs.part = 1;
      else if (n >= HOLE_MAX) { holeFinish(); return; }
      else hs.phase = 'pick';
    } else {
      if (hs.part === 1) hs.part = 0;
      else if (n) { hs.chain.pop(); hs.phase = 'pick'; }
      else return;
    }
  } else {
    if (d > 0) { holeSpin(); return; }
    hs.phase = 'verse'; hs.part = 1;
  }
  renderHole(d);
}
function gridMove(dx, dy) {
  var all = Array.prototype.slice.call($('pick-grid').querySelectorAll('.ptile'));
  var i = all.indexOf(document.activeElement), cols = getComputedStyle($('pick-grid')).gridTemplateColumns.split(' ').filter(Boolean).length || 6;
  if (i < 0) i = 0;
  var j = i;
  do { j += dx + dy * cols; } while (j >= 0 && j < all.length && all[j].disabled);
  if (j >= 0 && j < all.length) all[j].focus();
}
function holeKeys(e) {
  wake();
  if (e.repeat) { e.preventDefault(); return; }
  var k = e.key;
  if (k === 'Escape') { e.preventDefault(); openList(); return; }
  if (k === 'f' || k === 'F') { e.preventDefault(); holeFinish(); return; }
  if (hs.phase === 'pick') {
    if (hs.spinning) { e.preventDefault(); return; }
    if (k === 'ArrowRight') { e.preventDefault(); gridMove(1, 0); }
    else if (k === 'ArrowLeft') { e.preventDefault(); gridMove(-1, 0); }
    else if (k === 'ArrowDown') { e.preventDefault(); gridMove(0, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); gridMove(0, -1); }
    else if (k === 'Enter') {
      e.preventDefault();
      var a = document.activeElement;
      if (a && a.classList.contains('ptile')) holeChoose(a.dataset.word); else if (a && a.tagName === 'BUTTON') a.click(); else holeSpin();
    }
    else if (k === ' ' || k === 'PageDown') { e.preventDefault(); holeSpin(); }
    else if (k === 'Backspace' || k === 'PageUp') { e.preventDefault(); holeGo(-1); }
    else if (k === 'k' || k === 'K') { e.preventDefault(); holeChoose(classicNext()); }
    return;
  }
  if (k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); holeGo(1); }
  else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); holeGo(-1); }
}
$('pick-back').addEventListener('click', function () { this.blur(); holeGo(-1); });
$('pick-spin').addEventListener('click', function () { this.blur(); holeSpin(); });
$('pick-classic').addEventListener('click', function () { this.blur(); holeChoose(classicNext()); });
$('pick-finish').addEventListener('click', function () { this.blur(); holeFinish(); });
ctrl('h-close', function () { openList(); });
ctrl('h-restart', function () { holeOpen(hs.song); });
ctrl('h-back', function () { holeGo(-1); });
ctrl('h-next', function () { holeGo(1); });
ctrl('h-done', holeFinish);
window.addEventListener('resize', function () { if (current === 'hole' && hs.phase === 'verse') fitHole(); });

/* ---------- TV link ---------- */
function holeState() {
  return { chain: hs.chain.slice(), ph: hs.phase, pt: hs.part, sn: hs.spinN, sw: hs.spinTarget };
}
function holeApply(s, song) {
  if (current !== 'hole' || !hs.song || hs.song.id !== song.id) holeOpen(song);
  var chain = s.chain || [], before = hs.chain;
  var changed = chain.join('|') !== before.join('|') || s.ph !== hs.phase || s.pt !== hs.part;
  if (changed) {
    var grew = chain.length === before.length + 1 && chain.slice(0, -1).join('|') === before.join('|');
    var dir = chain.length > before.length || (chain.length === before.length && (s.ph === 'pick' || (s.pt || 0) > hs.part)) ? 1 : -1;
    hs.chain = chain.slice(); hs.phase = s.ph || 'verse'; hs.part = s.pt || 0;
    hs.justAdded = grew && hs.phase === 'verse' && hs.part === 0 ? chain[chain.length - 1] : '';
    renderHole(dir);
  }
  if (s.ph === 'pick' && s.sn && s.sn !== hs.spinN) {
    // The other device pressed Surprise!: spin here too and land on the same thing (that device does the choosing).
    hs.spinN = s.sn; hs.spinTarget = s.sw;
    holeSpin(s.sw, true);
  }
}
