/* TV link: the TV's browser shows the app, and David's laptop (or phone / iPad) shows the same thing and
   drives it, with no cable between them.

   Every linked device sends its whole screen state ("song 12, section 3, colors cream…") whenever it
   changes, and copies the state it receives from the others. Last press wins.

   The messages travel through free public relays (no account), over the internet:
     1. MQTT (EMQX, then HiveMQ if that fails): no daily limit; keeps the latest state so a device that
        joins late catches up at once; tells the remote whether the TV is connected.
     2. ntfy.sh, only when MQTT can't connect (it uses the normal web port, so it gets through strict
        Wi-Fi, but allows just 250 messages a day per internet connection).
   Messages hold only which screen, song and section is showing (and, for the hole song, what's in the hole;
   for a picture question, which answers were picked).
   Loaded after app.js and hole.js and uses their globals. */

var LINK_K = { role: 'sp.link-role' };
var LINK_CODE = 'sp';   // David's fixed link name: nothing to type, every device uses it
var BROKERS = [
  { host: 'broker.emqx.io', port: 8084, path: '/mqtt' },
  { host: 'broker.hivemq.com', port: 8884, path: '/mqtt' },
];
var link = {
  role: lsGet(LINK_K.role) || '',          // '' (off), 'tv' or 'remote'
  me: Math.random().toString(36).slice(2, 10),
  seq: 0,
  seen: {},                                // newest message number applied from each other device
  applying: false,
  mqtt: null, mqttOn: false, broker: 0, retryTimer: 0,
  ntfy: null, ntfyOn: false,
  tvOnline: null,                          // remote only: is the TV connected?
  tvId: '',                                // remote only: which TV connection said it's on
  offTimer: 0,                             // remote only: waiting for a TV that may still be starting up
  cid: '', conns: 0,                       // TV only: this connection's name (me.1, me.2…), see tvSayOn
  beat: 0,
  sendTimer: 0,
};
function linkCode() { return LINK_CODE; }
function linkBase() { return 'davyrockett-song-party/' + linkCode(); }
function ntfyTopic() { return 'davyrockett-song-party-' + linkCode(); }
function linked() { return link.role === 'tv' || link.role === 'remote'; }

/* ---------- What's on screen, as a small object ---------- */
function screenState() {
  var s = { screen: current, theme: document.documentElement.getAttribute('data-theme'),
            size: document.documentElement.getAttribute('data-size'), per: perScreen() };
  if (current === 'list') { s.group = group; s.seed = shuffleSeed; listAnchor(s); }
  if (current === 'card' && card.song) { s.song = card.song.id; s.ci = card.i; }
  if (current === 'lyrics' && ly.song) { s.song = ly.song.id; s.i = st.i; s.u = ly.song.updatedAt || ''; s.fx = st.fired.slice(); s.mp = mlChain(ly.song); }
  if (current === 'hole' && hs.song) { s.song = hs.song.id; s.hole = holeState(); }
  if (current === 'madlib' && ml.song) { s.song = ml.song.id; s.ml = mlState(); }
  if (current === 'quiz' && quiz.song) { s.song = quiz.song.id; s.chain = quiz.chain; s.qt = quiz.start; s.qb = quiz.bonus; s.qi = quiz.qi; s.qp = quiz.picked.slice(); }
  if (current === 'party' && party.song) { s.song = party.song.id; s.chain = party.chain; s.pt = party.t; }
  return s;
}
function applyState(s) {
  link.applying = true;
  try {
    if (s.theme && s.theme !== document.documentElement.getAttribute('data-theme')) { lsSet(K.theme, s.theme); applyTheme(s.theme); }
    if (s.size && s.size !== document.documentElement.getAttribute('data-size')) { lsSet(K.size, s.size); document.documentElement.setAttribute('data-size', s.size); }
    var perChanged = s.per && s.per !== perScreen();
    if (perChanged) lsSet(K.per, String(s.per));
    var song = s.song ? get(s.song) : null;
    if (s.screen === 'welcome' && current !== 'welcome') openWelcome();
    else if (s.screen === 'list') {
      // Only rebuild the tiles when the list itself changed (rebuilding jumps back to the top).
      var fresh = current !== 'list' || (s.group && s.group !== group) || (s.seed != null && s.seed !== shuffleSeed);
      if (s.group && s.group !== group) { group = s.group; lsSet(K.group, group); }
      if (s.seed != null) shuffleSeed = s.seed;   // same mixed-up order as the other device
      if (current !== 'list') openList(); else if (fresh) renderList();
      listScrollTo(s, fresh);
    } else if (s.screen === 'card' && song) {
      if (current !== 'card' || !card.song || card.song.id !== song.id) openCard(song.id);
      card.i = s.ci || 0;
      renderPanel();
    } else if (s.screen === 'lyrics' && song) {
      // The other device has a newer version of this song (e.g. David just laid out its slides): fetch it first.
      if (s.u && (song.updatedAt || '') < s.u && !link.refreshing) {
        link.refreshing = true;
        sync.run().then(function () { link.refreshing = false; applyState(s); });
        return;
      }
      var picksChanged = s.mp ? mlSet(song, s.mp) : false;   // the silly words picked on the other device
      var same = current === 'lyrics' && ly.song && ly.song.id === song.id && ly.song.updatedAt === song.updatedAt;
      if (!same) {
        openLyrics(song);   // opens with one section per screen; match the other device if it has two
        if (s.per && s.per !== perScreen()) { lsSet(K.per, String(s.per)); buildScreens(); perChanged = true; }
      } else if (perChanged) buildScreens();
      var prev = st.i, to = Math.max(0, Math.min(st.screens.length - 1, s.i || 0));
      if (to !== prev || perChanged || picksChanged) { st.i = to; renderStep(to > prev ? 1 : to < prev ? -1 : 0); }
      // Magic pictures the other device popped up (by a click or a number key).
      (s.fx || []).forEach(function (k) { if (st.fired.indexOf(k) < 0) fire(k, true); });
    } else if (s.screen === 'hole' && song && s.hole) {
      holeApply(s.hole, song);
    } else if (s.screen === 'madlib' && song && s.ml) {
      mlApply(s.ml, song);
    } else if (s.screen === 'quiz' && song) {
      var sameQuiz = current === 'quiz' && quiz.song && quiz.song.id === song.id && quiz.start === (s.qt || 0) &&
        String(quiz.bonus) === String(s.qb || []);
      if (!sameQuiz) openQuiz(song, s.chain, { start: s.qt, bonus: s.qb, qi: s.qi });
      else if (quiz.qi !== (s.qi || 0)) { quiz.qi = s.qi || 0; quiz.picked = []; renderQuiz(); }
      // Answers picked on the other device (the TV plays the sounds).
      (s.qp || []).forEach(function (ai) { if (quiz.picked.indexOf(ai) < 0) quizPick(ai, true); });
    } else if (s.screen === 'party' && song) {
      if (current !== 'party' || !party.song || party.song.id !== song.id) openParty(song, s.chain);
      party.t = s.pt || 0;
      renderParty();
    }
  } finally {
    link.applying = false;
  }
}

/* ---------- Scrolling the song list (same as Memory Lane's, 2026-10-30) ----------
   The other screen may be a different size, so the place is sent as "this song is at the top, this far in"
   (or simply top / bottom), not in pixels. */
var listScroll = { user: 0, follow: 0, timer: 0 };
function tileY(t) { var g = $('grid'); return t.getBoundingClientRect().top - g.getBoundingClientRect().top + g.scrollTop; }
function listAnchor(s) {
  var g = $('grid');
  if (g.scrollTop <= 2) { s.top = ''; return; }
  if (g.scrollTop >= g.scrollHeight - g.clientHeight - 2) { s.end = 1; return; }
  var tiles = g.querySelectorAll('.tile');
  for (var i = 0; i < tiles.length; i++) {
    var y = tileY(tiles[i]), h = tiles[i].offsetHeight;
    if (y + h > g.scrollTop) { s.top = tiles[i].dataset.id; s.off = Math.round((g.scrollTop - y) / h * 100) / 100; return; }
  }
}
function listScrollTo(s, instant) {
  var g = $('grid'), y;
  if (s.end) y = g.scrollHeight;
  else if (s.top === '') y = 0;
  else if (s.top) {
    var t = g.querySelector('[data-id="' + s.top + '"]');
    if (!t) return;
    y = tileY(t) + (s.off || 0) * t.offsetHeight;
  } else return;   // from an older version of the app: leave the scroll alone
  if (Math.abs(g.scrollTop - y) < 2) return;
  listScroll.follow = Date.now() + 1500;   // this scroll came from the other screen: don't send it back
  if (instant) { g.style.scrollBehavior = 'auto'; g.scrollTop = y; g.style.scrollBehavior = ''; }
  else g.scrollTop = y;                    // glides there (the grid scrolls smoothly)
}
// Only scrolls the person did here count (mouse wheel, trackpad, touch, scroll bar, keys), not ones copied from the other screen.
function scrollByHand() { listScroll.user = Date.now(); }
['wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach(function (ev) {
  $('grid').addEventListener(ev, scrollByHand, { passive: true });
});
document.addEventListener('keydown', function () { if (current === 'list') scrollByHand(); });
$('grid').addEventListener('scroll', function () {
  var now = Date.now();
  if (!linked() || current !== 'list' || link.applying || now < listScroll.follow || now - listScroll.user > 1200) return;
  if (listScroll.timer) return;
  // A few updates a second while scrolling; fewer on the backup relay, which has a daily limit.
  listScroll.timer = setTimeout(function () { listScroll.timer = 0; stateChanged(); }, link.mqttOn ? 150 : 600);
}, { passive: true });

/* ---------- Sending ---------- */
function stateChanged() {
  if (!linked() || link.applying || current === 'editor' || current === 'slides') return;
  clearTimeout(link.sendTimer);
  link.sendTimer = setTimeout(sendState, 60);
}
function sendState() {
  var body = JSON.stringify({ k: 'sp1', id: link.me, n: ++link.seq, t: Date.now(), s: screenState() });
  if (link.mqttOn) {
    try {
      var m = new Paho.Message(body);
      m.destinationName = linkBase() + '/state';
      m.retained = true;   // so a device that joins later starts on the same screen
      link.mqtt.send(m);
      // If the TV isn't on the main relay (stricter Wi-Fi on its side), also send through the backup.
      if (!(link.role === 'remote' && link.tvOnline === false && link.ntfyOn)) return;
    } catch (e) {}
  }
  if (link.ntfyOn) {
    fetch('https://ntfy.sh/' + ntfyTopic(), { method: 'POST', body: body }).then(function (res) {
      if (res.status === 429) logNote('limit', 'The backup relay’s daily limit ran out: taps aren’t getting through it');
    }, function () { logNote('sendfail', 'Couldn’t send through the backup relay'); });
  }
}
// Hook into the app: whenever one of these runs, the screen changed, so tell the other devices.
['show', 'renderPanel', 'renderStep', 'renderHole', 'renderMl', 'renderQuiz', 'renderParty', 'renderList', 'applyTheme', 'buildScreens'].forEach(function (name) {
  var orig = window[name];
  window[name] = function () { var r = orig.apply(this, arguments); stateChanged(); return r; };
});

/* ---------- Receiving ---------- */
function receive(text, retained) {
  var msg;
  try { msg = JSON.parse(text); } catch (e) { return; }
  if (!msg || msg.k !== 'sp1' || msg.id === link.me || !msg.s) return;
  if (link.seen[msg.id] && msg.n <= link.seen[msg.id]) return;   // old or repeated
  link.seen[msg.id] = msg.n;
  // A saved state from a long time ago (e.g. last week's visit) shouldn't move this screen.
  if (retained && Math.abs(Date.now() - msg.t) > 30 * 60 * 1000) return;
  if (current === 'editor' || current === 'slides' || $('settings').open) return;
  applyState(msg.s);
}

/* ---------- Connection log (2026-11-17) ----------
   David's TV link kept dropping (that session: iPad on his phone's hotspot, TV on the facility's Wi-Fi), so every
   linked device keeps notes on its own connection: relay up / lost / unreachable, backup relay, internet gone,
   screen locked, app paused, TV seen or gone. Kept on the device (last 400 notes). The TV sends its own notes over
   the link (topic /tvlog, kept by the relay), so Settings → TV link → Connection log on the iPad shows both sides. */
var LOG_K = { me: 'sp.link-log', tv: 'sp.link-log-tv' };
var linkLog = {
  list: logLoad(LOG_K.me, []), tv: logLoad(LOG_K.tv, { t: 0, log: [] }),
  upAt: 0, downAt: 0, quiet: false, saveTimer: 0, sendTimer: 0, tick: Date.now(), visAt: 0, hiddenAt: 0,
};
var LOG_BAD = { lost: 1, fail: 1, 'tv-off': 1, 'net-off': 1, limit: 1, sendfail: 1, 'backup-lost': 1, paused: 1 };
var LOG_GOOD = { up: 1, 'tv-on': 1, 'net-on': 1, backup: 1 };
var LOG_REPEAT = { fail: 1, limit: 1, sendfail: 1, 'backup-lost': 1 };   // the same note again soon after just counts up
function logLoad(k, empty) {
  try { var v = JSON.parse(lsGet(k) || 'null'); return v && (Array.isArray(v) || Array.isArray(v.log)) ? v : empty; }
  catch (e) { return empty; }
}
function logSave() {
  clearTimeout(linkLog.saveTimer);
  linkLog.saveTimer = setTimeout(function () { lsSet(LOG_K.me, JSON.stringify(linkLog.list)); }, 800);
}
function logNote(e, text, d, why) {
  var now = Date.now(), last = linkLog.list[linkLog.list.length - 1];
  if (last && LOG_REPEAT[e] && last.e === e && now - (last.l || last.t) < 10 * 60 * 1000) {
    last.c = (last.c || 1) + 1; last.l = now;
  } else {
    var n = { t: now, r: link.role || 'off', e: e, x: text };
    if (d) n.d = d;
    if (why) n.y = why;
    linkLog.list.push(n);
    if (linkLog.list.length > 400) linkLog.list.splice(0, linkLog.list.length - 400);
  }
  logSave();
  if (link.role === 'tv') logSend();
  logRender();
}
function relayName(b) { return /hivemq/.test(b.host) ? 'HiveMQ' : 'EMQX'; }
function whyText(why) { return why && why.errorCode ? String(why.errorMessage || why.errorCode) : ''; }
function logUp(b) {
  var now = Date.now(), d = linkLog.downAt ? now - linkLog.downAt : 0;
  logNote('up', 'Connected to the main relay (' + relayName(b) + ')' + (d ? ' after ' + fmtDur(d) + ' without it' : ''), d);
  linkLog.upAt = now; linkLog.downAt = 0;
}
function logLost(b, why) {
  var now = Date.now();
  logNote('lost', 'Lost the main relay (' + relayName(b) + ')' + (linkLog.upAt ? ' after ' + fmtDur(now - linkLog.upAt) + ' connected' : ''),
    linkLog.upAt ? now - linkLog.upAt : 0, whyText(why));
  linkLog.upAt = 0; linkLog.downAt = now;
}
function logFail(b, why) {
  if (!linkLog.downAt) linkLog.downAt = Date.now();
  logNote('fail', 'Couldn’t reach the main relay', 0, whyText(why));
}
function fmtDur(ms) {
  var s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  var m = Math.floor(s / 60);
  if (m < 60) return m + ' min' + (m < 10 && s % 60 ? ' ' + (s % 60) + ' s' : '');
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}
function deviceName() {
  var u = navigator.userAgent || '';
  if (/iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(u)) return 'iPhone';
  if (/Tizen|SMART-TV|SmartTV/i.test(u)) return 'Samsung TV';
  if (/Web0S|webOS/i.test(u)) return 'LG TV';
  if (/CrKey|GoogleTV|Android TV|AFT/i.test(u)) return 'Android / Fire TV';
  if (/Android/.test(u)) return 'Android';
  if (/Macintosh/.test(u)) return 'Mac';
  if (/Windows/.test(u)) return 'Windows';
  return 'browser';
}
// The TV shares its notes with the remote (kept by the relay, so the remote gets them whenever it connects).
function logSend() {
  clearTimeout(linkLog.sendTimer);
  linkLog.sendTimer = setTimeout(function () {
    if (link.role !== 'tv' || !link.mqttOn || !link.mqtt) return;
    try {
      var m = new Paho.Message(JSON.stringify({ k: 'sp1log', id: link.me, t: Date.now(), log: linkLog.list.slice(-80) }));
      m.destinationName = linkBase() + '/tvlog'; m.retained = true;
      link.mqtt.send(m);
    } catch (e) {}
  }, 2000);
}
function logFromTv(text) {
  var d;
  try { d = JSON.parse(text); } catch (e) { return; }
  if (!d || d.k !== 'sp1log' || d.id === link.me || !Array.isArray(d.log)) return;
  linkLog.tv = { t: d.t || Date.now(), log: d.log };
  lsSet(LOG_K.tv, JSON.stringify(linkLog.tv));
  logRender();
}
// Things around the connection: internet gone, screen locked, the app frozen for a while (timers stop when paused).
window.addEventListener('offline', function () { if (linked()) logNote('net-off', 'This device says it has no internet'); });
window.addEventListener('online', function () { if (linked()) logNote('net-on', 'Internet back on this device'); });
document.addEventListener('visibilitychange', function () {
  var now = Date.now();
  linkLog.visAt = now;
  if (!linked()) return;
  if (document.visibilityState === 'hidden') { linkLog.hiddenAt = now; logNote('hidden', 'Screen locked, or another app in front'); }
  else logNote('visible', 'Back on screen' + (linkLog.hiddenAt ? ' after ' + fmtDur(now - linkLog.hiddenAt) : ''));
});
window.addEventListener('pagehide', function () {
  if (linked()) logNote('close', 'Page closed or reloaded');
  lsSet(LOG_K.me, JSON.stringify(linkLog.list));
});
setInterval(function () {
  var now = Date.now(), gap = now - linkLog.tick;
  linkLog.tick = now;
  if (linked() && gap > 20000 && !document.hidden && linkLog.visAt < now - gap) logNote('paused', 'The app was frozen for ' + fmtDur(gap), gap);
}, 5000);

/* The log in Settings: both devices' notes, newest first, with a short summary of the last 12 hours. */
function logEntries() {
  var all = [];
  linkLog.list.forEach(function (n) { all.push({ n: n, who: n.r === 'tv' ? 'TV' : n.r === 'remote' ? 'Remote' : '' }); });
  if (link.role !== 'tv') (linkLog.tv.log || []).forEach(function (n) { all.push({ n: n, who: 'TV' }); });
  all.sort(function (a, b) { return a.n.t - b.n.t; });
  return all;
}
function logEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function logTime(t) { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }); }
function logDay(t) { return new Date(t).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); }
function logLine(a) {
  var n = a.n;
  return n.x + (n.c > 1 ? ' (' + n.c + ' times, last at ' + logTime(n.l) + ')' : '');
}
function logSummary() {
  var since = Date.now() - 12 * 60 * 60 * 1000;
  function sum(list) {
    var s = { lost: 0, longest: 0, net: 0, locked: 0, frozen: 0, limit: 0 };
    (list || []).forEach(function (n) {
      if (n.t < since) return;
      if (n.e === 'lost') s.lost++;
      if (n.e === 'up' && n.d > s.longest) s.longest = n.d;
      if (n.e === 'net-off') s.net++;
      if (n.e === 'hidden') s.locked++;
      if (n.e === 'paused') s.frozen++;
      if (n.e === 'limit') s.limit++;
    });
    return s;
  }
  function say(s, who) {
    var bits = [];
    bits.push(s.lost ? 'lost the main relay ' + s.lost + (s.lost === 1 ? ' time' : ' times')
      + (s.longest ? ' (longest ' + fmtDur(s.longest) + ' without it)' : '') : 'never lost the main relay');
    if (s.net) bits.push('had no internet ' + s.net + (s.net === 1 ? ' time' : ' times'));
    if (s.locked) bits.push('screen locked or in the background ' + s.locked + (s.locked === 1 ? ' time' : ' times'));
    if (s.frozen) bits.push('app frozen ' + s.frozen + (s.frozen === 1 ? ' time' : ' times'));
    if (s.limit) bits.push('the backup relay ran out');
    return who + ': ' + bits.join('; ') + '.';
  }
  var me = say(sum(linkLog.list), link.role === 'tv' ? 'This TV' : 'This device');
  if (link.role === 'tv') return 'Last 12 hours. ' + me;
  var tv = linkLog.tv.t ? say(sum(linkLog.tv.log), 'The TV') + ' (Its notes last came in at ' + logTime(linkLog.tv.t) + '.)'
    : 'No notes from the TV yet (they come in once both are connected).';
  return 'Last 12 hours. ' + me + ' ' + tv;
}
function logRender() {
  var box = $('link-log-list');
  if (!box || !$('link-log').open) return;
  $('link-log-sum').textContent = logSummary();
  var all = logEntries().reverse().slice(0, 250), html = '', day = '';
  all.forEach(function (a) {
    var d = logDay(a.n.t);
    if (d !== day) { day = d; html += '<div class="log-day">' + logEsc(d) + '</div>'; }
    html += '<div class="log-row' + (LOG_BAD[a.n.e] ? ' bad' : LOG_GOOD[a.n.e] ? ' good' : '') + '">'
      + '<span class="log-t">' + logEsc(logTime(a.n.t)) + '</span>'
      + (a.who ? '<span class="log-who' + (a.who === 'TV' ? ' tv' : '') + '">' + a.who + '</span>' : '')
      + '<span class="log-x">' + logEsc(logLine(a)) + (a.n.y ? ' <span class="log-y">' + logEsc(a.n.y) + '</span>' : '') + '</span></div>';
  });
  box.innerHTML = html || '<p class="cap">Nothing yet. Notes start when the TV link is on.</p>';
}
function logText() {
  var lines = [logSummary(), ''], day = '';
  logEntries().forEach(function (a) {
    var d = logDay(a.n.t);
    if (d !== day) { day = d; lines.push('— ' + d + ' —'); }
    lines.push(logTime(a.n.t) + '  ' + (a.who || '-') + '  ' + logLine(a) + (a.n.y ? '  [' + a.n.y + ']' : ''));
  });
  return lines.join('\n');
}
$('link-log').addEventListener('toggle', logRender);
$('link-log-copy').addEventListener('click', function () {
  var text = logText(), btn = this;
  function done() { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = 'Copy log'; }, 1800); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
  function fallback() {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(t);
  }
});
$('link-log-clear').addEventListener('click', function () {
  if (!confirm('Clear the connection log on this device?')) return;
  linkLog.list = []; linkLog.tv = { t: 0, log: [] };
  lsSet(LOG_K.me, null); lsSet(LOG_K.tv, null);
  logRender();
});

/* ---------- MQTT ---------- */
function mqttConnect() {
  clearTimeout(link.retryTimer);
  if (!linked() || typeof Paho === 'undefined') { ntfyStart(); return; }
  var b = BROKERS[link.broker % BROKERS.length];
  var cid = link.me + '.' + (++link.conns);
  var client = new Paho.Client(b.host, b.port, b.path, 'sp-' + link.me + '-' + Date.now().toString(36));
  link.mqtt = client; link.cid = cid;
  client.onMessageArrived = function (m) {
    if (m.destinationName === linkBase() + '/tvlog') { logFromTv(m.payloadString); return; }
    if (m.destinationName === linkBase() + '/tv') {
      if (link.role !== 'tv') tvPresence(m.payloadString);
      else if (/^off:/.test(m.payloadString) && m.payloadString.slice(4) !== link.cid) tvSayOn();   // see tvSayOn
      return;
    }
    receive(m.payloadString, m.retained);
  };
  client.onConnectionLost = function (why) {
    if (link.mqtt !== client) return;
    link.mqttOn = false; renderLink();
    logLost(b, why);
    retry();
  };
  var opts = {
    useSSL: true, timeout: 6, keepAliveInterval: 20, cleanSession: true,
    onSuccess: function () {
      if (link.mqtt !== client) return;
      link.mqttOn = true; link.fails = 0;
      logUp(b);
      client.subscribe(linkBase() + '/state');
      client.subscribe(linkBase() + '/tv');
      if (link.role === 'remote') client.subscribe(linkBase() + '/tvlog');
      if (link.role === 'tv') {
        tvSayOn();   // now and every 20 seconds
        clearInterval(link.beat);
        link.beat = setInterval(tvSayOn, 20000);
      }
      renderLink();
    },
    onFailure: function (why) {
      if (link.mqtt !== client) return;
      link.mqttOn = false; renderLink();
      logFail(b, why);
      retry();
    },
  };
  if (link.role === 'tv') {
    // If the TV drops off, the relay tells the remote.
    var off = new Paho.Message('off:' + cid); off.destinationName = linkBase() + '/tv'; off.retained = true;
    opts.willMessage = off;
  }
  try { client.connect(opts); } catch (e) { logFail(b, { errorMessage: String(e && e.message || e) }); retry(); }
}
function retry() {
  link.broker++;                 // try the other relay next time
  link.fails = (link.fails || 0) + 1;
  ntfyStart();                   // meanwhile, listen on the backup
  clearTimeout(link.retryTimer);
  link.retryTimer = setTimeout(mqttConnect, Math.min(30000, 4000 * link.fails));   // try less often if it keeps failing
}
// The TV says "on:<name>" (kept by the relay, again every 20 s); the relay says "off:<name>" for it if it drops off.
// Each connection has its own name, because the relay can notice a dropped connection late, after the TV has
// already reconnected. Any other "off" (that old connection, or a TV screen that closed, like the one inside
// www.davyrockett.com/tv when David switches apps) would be kept by the relay and make the remote say "TV not
// connected" while the TV works, so the TV says "on" again straight away.
function tvSayOn() {
  if (link.role !== 'tv' || !link.mqttOn || !link.mqtt) return;
  var on = new Paho.Message('on:' + link.cid); on.destinationName = linkBase() + '/tv'; on.retained = true;
  try { link.mqtt.send(on); } catch (e) {}
}
// On the remote: an "off" only counts if it's from the TV connection that last said "on".
function tvPresence(text) {
  var parts = String(text).split(':'), state = parts[0], id = parts[1] || '';
  clearTimeout(link.offTimer);
  if (state === 'on') { if (link.tvOnline !== true) logNote('tv-on', 'The TV is connected'); link.tvId = id; link.tvOnline = true; }
  else if (state === 'off' && id === link.tvId) { if (link.tvOnline !== false) logNote('tv-off', 'The relay says the TV dropped off'); link.tvOnline = false; }
  else if (state === 'off' && !link.tvId && link.tvOnline !== false) {
    // No TV seen yet: it may still be starting (www.davyrockett.com/tv opens this app's TV screen only once this
    // device opens the app), so give it a moment before saying it isn't connected.
    link.offTimer = setTimeout(function () {
      if (link.tvId || link.role !== 'remote') return;
      logNote('tv-off', 'No TV on the main relay');
      link.tvOnline = false; ntfyStart(); renderLink();
    }, 8000);
    return;
  }
  if (link.tvOnline === false) ntfyStart();   // the TV may be on the backup relay
  renderLink();
}
function mqttStop() {
  clearTimeout(link.retryTimer);
  clearInterval(link.beat);
  var c = link.mqtt;
  link.mqtt = null; link.mqttOn = false;
  if (c) {
    try {
      if (link.role === 'tv' && c.isConnected()) {
        var off = new Paho.Message('off:' + link.cid); off.destinationName = linkBase() + '/tv'; off.retained = true; c.send(off);
      }
      c.disconnect();
    } catch (e) {}
  }
}

/* ---------- ntfy.sh backup ---------- */
function ntfyStart() {
  if (!linked() || link.ntfy || typeof EventSource === 'undefined') return;
  var es = new EventSource('https://ntfy.sh/' + ntfyTopic() + '/sse');
  link.ntfy = es;
  es.onopen = function () { if (!link.ntfyOn) logNote('backup', 'Backup relay (ntfy) connected'); link.ntfyOn = true; renderLink(); };
  es.onerror = function () {   // EventSource retries by itself
    if (link.ntfyOn && link.ntfy === es) logNote('backup-lost', 'Lost the backup relay (ntfy)');
    link.ntfyOn = false; renderLink();
  };
  es.onmessage = function (e) {
    var d;
    try { d = JSON.parse(e.data); } catch (x) { return; }
    if (d && d.event === 'message' && d.message) receive(d.message, false);
  };
}
function ntfyStop() { if (link.ntfy) { link.ntfy.close(); link.ntfy = null; } link.ntfyOn = false; }

/* ---------- Turning it on and off ---------- */
function linkStart(role) {
  linkLog.quiet = true; linkStop(); linkLog.quiet = false;
  link.role = role;
  linkLog.upAt = 0; linkLog.downAt = 0;
  logNote('start', 'Link on: ' + (role === 'tv' ? 'TV screen' : 'remote') + ' · ' + deviceName()
    + (window.top !== window ? ' · inside the one TV page' : '') + ' · ' + (window.APP_VERSION || ''));
  lsSet(LINK_K.role, role);
  link.tvOnline = null; link.tvId = ''; clearTimeout(link.offTimer);
  document.body.classList.toggle('tv', role === 'tv');
  renderLink();
  mqttConnect();
  // The remote waits a moment for the TV's latest screen; if none comes, it sends its own.
  setTimeout(function () { if (linked()) sendState(); }, role === 'tv' ? 2500 : 1500);
}
function linkStop() {
  if (link.role && !linkLog.quiet) logNote('stop', 'Link turned off');
  mqttStop(); ntfyStop();
  link.role = '';
  lsSet(LINK_K.role, null);
  document.body.classList.remove('tv');
  renderLink();
}

/* ---------- On screen ---------- */
function renderLink() {
  var pill = $('link-pill');
  var on = link.mqttOn || link.ntfyOn;
  pill.className = 'link-pill';
  if (!linked()) { pill.hidden = true; }
  else if (link.role === 'tv') {
    // The TV stays clean: only a small red dot when it has lost the connection.
    pill.hidden = on;
    pill.textContent = '';
    pill.classList.add('dot');
  } else {
    pill.hidden = false;
    if (!on) { pill.textContent = '● Connecting…'; pill.classList.add('wait'); }
    else if (!link.mqttOn) { pill.textContent = '● Linked (backup)'; pill.classList.add('ok'); }   // the backup can't tell if the TV is there
    else if (link.tvOnline === false) { pill.textContent = '● TV not connected'; pill.classList.add('warn'); }
    else if (link.tvOnline === true) { pill.textContent = '● TV linked'; pill.classList.add('ok'); }
    else { pill.textContent = '● Linked'; pill.classList.add('ok'); }
  }
  var w = $('welcome-tv'), r = $('welcome-remote');
  w.textContent = link.role === 'tv' ? '📺 TV screen ✓' : '📺 Use as TV screen';
  r.textContent = link.role === 'remote' ? '🎛 Remote ✓' : '🎛 Control a TV';
  w.setAttribute('aria-pressed', String(link.role === 'tv'));
  r.setAttribute('aria-pressed', String(link.role === 'remote'));
  $('link-status').textContent = !linked() ? 'Off. This device works on its own.'
    : (link.role === 'tv' ? 'This device is the TV screen. ' : 'This device is a remote. ')
      + (link.mqttOn ? 'Connected.' : link.ntfyOn ? 'Connected (backup relay).' : 'Connecting…');
  $('link-off').disabled = !linked();
}
$('welcome-tv').addEventListener('click', function () { this.blur(); if (link.role === 'tv') linkStop(); else linkStart('tv'); });
$('welcome-remote').addEventListener('click', function () { this.blur(); if (link.role === 'remote') linkStop(); else linkStart('remote'); });
$('link-tv').addEventListener('click', function () { linkStart('tv'); });
$('link-remote').addEventListener('click', function () { linkStart('remote'); });
$('link-off').addEventListener('click', linkStop);
// Reconnect quickly when the screen wakes up or the Wi-Fi comes back.
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && linked() && !link.mqttOn) mqttConnect();
});
window.addEventListener('online', function () { if (linked() && !link.mqttOn) mqttConnect(); });

renderLink();
if (linked()) linkStart(link.role);
