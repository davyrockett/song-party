"""Adds David's ARC Adults songs to Song Party, reading the words straight from his files (never retyped).

   python3 tools/import-arc.py        -> adds missing songs to ../song-party-data/data.json

Sources:
  - Chord charts in ~/Dropbox/Local/Resounding Joy/ARC Adults (text PDFs): chord lines are dropped, the sections
    are put in the order they're sung (choruses written out), and a few typos are fixed.
  - Memory Lane's song list (../memory-lane-data/data.json) for songs whose ARC sheet is a scan or notated
    band parts (Fly Me to the Moon, Over the Rainbow, Hound Dog, Lean On Me, The Bare Necessities).
Songs already in data.json (same id) are left alone, so edits made in the app are never overwritten.
Needs pypdf (pip3 install pypdf)."""
import json, re
from datetime import datetime, timezone
from pathlib import Path
import pypdf

HERE = Path(__file__).resolve().parent
ARC = Path.home() / "Dropbox/Local/Resounding Joy/ARC Adults"
DATA = HERE.parent.parent / "song-party-data" / "data.json"
MEMORY_LANE = HERE.parent.parent / "memory-lane-data" / "data.json"

CHORD = re.compile(r"^\(?[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?\+?\d*((sus|add|maj|b|#|aug|dim|\+)?\d*)*(/[A-G][#b]?)?\)?[*,]?$")
JUNK = re.compile(r"^(x\d+|\d+x|N\.?C\.?|\||-+|/+|%|\.+|//:.*|.*://)$", re.I)


def pdf_text(name):
    r = pypdf.PdfReader(str(ARC / name))
    return "\n".join(p.extract_text(extraction_mode="layout") or "" for p in r.pages)


def is_chords(s):
    t = s.split()
    return bool(t) and all(CHORD.match(x) or JUNK.match(x) for x in t)


def lyric_lines(text):
    """Every non-chord line, spaces tidied. Section headers like [Verse 1] are kept as they are."""
    out = []
    for raw in text.split("\n"):
        s = re.sub(r"\s{2,}", " ", raw.strip())
        if s and not is_chords(s):
            out.append(s)
    return out


def sections(lines):
    """[Header] lines start a new section: {name: [lines]} in order."""
    out, cur = [], None
    for s in lines:
        m = re.match(r"^\[([^\]]*)\]$", s)
        if m:
            cur = (m.group(1).lower(), []); out.append(cur)
        elif cur:
            cur[1].append(s)
    return out


def block(lines, chorus=False):
    return ("[Chorus]\n" if chorus else "") + "\n".join(lines)


def fix(text, fixes):
    for a, b in fixes.items():
        text = text.replace(a, b)
    return text


# ---------- One function per chart (each sheet is laid out a little differently) ----------

def happy_and_you_know_it():
    secs = sections(lyric_lines(pdf_text("Happy and you know it.pdf")))
    # The long middle line is split after the comma, so the words can be bigger (5 lines a verse).
    split = lambda ls: [p for l in ls for p in (l.replace(", then your face", ",\nthen your face").split("\n"))]
    return "\n\n".join(block(split(ls)) for name, ls in secs if name.startswith("verse"))


def lion_sleeps_tonight():
    ls = lyric_lines(pdf_text("The Lion Sleeps Tonight - The Tokens.pdf"))
    ls = [s for s in ls if not s.startswith(("The Lion Sleeps Tonight -", "Note:", "Wimoweh is anglicisation"))]
    ls = [s.replace("dont", "don’t") for s in ls]
    chant = [s for s in ls if s.startswith("Ee-e-e")][:2]
    wimoweh = [s for s in ls if s.startswith("Wimoweh")][:4]
    verses, cur = [], []
    for s in ls:
        if s.startswith(("Ee-e-e", "Wimoweh")) or s == "[Wimoweh section]":
            continue
        cur.append(s)
        if len(cur) == 4:
            verses.append(cur); cur = []
    parts = [block(chant), block(wimoweh, True)]
    for v in verses:   # the sheet says "[Wimoweh section]" after each verse but the last
        parts += [block(v), block(wimoweh, True)]
    parts[-1] = block(chant)
    return "\n\n".join(parts)


def under_the_sea():
    text = pdf_text("Under the Sea.pdf").replace("ﬂ", "fl").replace("ﬁ", "fi")
    out, cur = [], []
    for raw in text.split("\n") + [""]:
        s = re.sub(r"\s{2,}", " ", raw.strip())
        # Chords are listed at the end of some lines ("…lake C, G7, C"): cut them off.
        s = re.sub(r"\s+(\(?[A-Ga-g]\s?[#b]?\s?(m|7|\d)*\s?\)?\s?,\s*)+\(?[A-Ga-g]\s?[#b]?\s?(m|7|\d)*\)?\s*$", "", s).strip()
        if not s:
            if cur: out.append(cur); cur = []
            continue
        # The sheet runs two sung lines together ("…greener In somebody else's lake"): split at the capital.
        cur += [p.strip() for p in re.split(r"(?<=[a-z’',.!])\s+(?=[A-Z][a-z’'])(?!I\b|I’|I')", s) if p.strip()]
    fixes = {"strugeon": "sturgeon", "They ray he can play": "The ray he can play", "He lings on": "The ling’s on",
             "Guess whos": "Guess who’s", "soundin sharp": "soundin’ sharp"}
    text = "\n\n".join(block([fix(l, fixes) for l in sec], sec[0].lower().startswith("under the sea")) for sec in out)
    return text.replace("An’\nOh.\nThat blowfish blow", "An’ Oh. That blowfish blow")


def here_comes_the_sun():
    secs = dict(sections(lyric_lines(pdf_text("Here Comes The Sun.pdf"))))
    fixes = {"allright": "all right", "sinc it's": "since it's", "the smiles returning": "the smiles returning"}
    c = block([fix(l, fixes) for l in secs["chorus"]], True)
    v = lambda n: block([fix(l, fixes) for l in secs[n]])
    # As it's sung: chorus between the verses, then the "sun, sun, sun" part, the last verse and the chorus.
    return "\n\n".join([c, v("verse 1"), c, v("verse 2"), c, v("middle section"), v("verse 3"), c])


def happy_trails():
    ls = lyric_lines(pdf_text("Happy Trails.pdf"))
    ls = ls[ls.index(next(s for s in ls if s.startswith("Happy trails to you"))):]
    i = next(n for n, s in enumerate(ls) if s.startswith("Some trails"))
    return block(ls[:i], True) + "\n\n" + block(ls[i:])


def la_bamba():
    ls = lyric_lines(pdf_text("La Bamba.pdf"))
    ls = [s for s in ls if not s.startswith(("La Bamba /", "Intro"))]
    a = next(n for n, s in enumerate(ls) if s.startswith("Yo no soy"))
    b = next(n for n, s in enumerate(ls) if s.startswith("Bamba"))
    return "\n\n".join([block(ls[:a]), block(ls[a:b]), block(ls[b:], True)])


# id, title, picture, groups, Get ready! tips, where the words come from
SONGS = [
    ("song-happy-know-it", "If You’re Happy and You Know It", "clap", ["Action Songs"],
     ["Clap your hands, stomp your feet and shout hooray!", "Watch David to see what comes next."], happy_and_you_know_it),
    ("song-lion-sleeps", "The Lion Sleeps Tonight", "lion", ["Animal Songs"],
     ["Sing “Wimoweh” with David!", "Can you roar like a lion? Shhh, he’s sleeping!"], lion_sleeps_tonight),
    ("song-under-the-sea", "Under the Sea", "crab", ["Movie Songs", "Dance Songs"],
     ["Swim like a fish!", "Wiggle and dance with David."], under_the_sea),
    ("song-here-comes-sun", "Here Comes the Sun", "sun", ["Feel-Good Songs"],
     ["Make a big sun with your arms!", "Sing “here comes the sun” with David."], here_comes_the_sun),
    ("song-happy-trails", "Happy Trails", "horse", ["Feel-Good Songs"],
     ["Ride your horse! Giddy-up!", "Wave goodbye at the end."], happy_trails),
    ("song-la-bamba", "La Bamba", "guitar", ["Dance Songs"],
     ["Dance with David!", "Shout “Bamba!” together."], la_bamba),
    ("song-fly-me-moon", "Fly Me to the Moon", "moon", ["Feel-Good Songs"],
     ["Point up to the moon and the stars!"], "Fly Me To The Moon"),
    ("song-over-rainbow", "Over the Rainbow", "rainbow", ["Movie Songs", "Calm Songs"],
     ["Draw a big rainbow in the air with your hand."], "Over the Rainbow"),
    ("song-hound-dog", "Hound Dog", "dog", ["Animal Songs", "Dance Songs"],
     ["Dance like Elvis!", "Can you bark like a dog?"], "Hound Dog"),
    ("song-lean-on-me", "Lean On Me", "heart", ["Feel-Good Songs", "Calm Songs"],
     ["Sway side to side with your friends."], "Lean On Me"),
    ("song-bare-necessities", "The Bare Necessities", "bear", ["Movie Songs", "Animal Songs"],
     ["Scratch your back like a bear!", "Dance like Baloo."], "The Bare Necessities"),
]
CATEGORIES = ["Action Songs", "Silly Songs", "Animal Songs", "Dance Songs", "Movie Songs", "Feel-Good Songs",
              "Calm Songs", "Pick & Build"]


def main():
    data = json.loads(DATA.read_text())
    items = data["items"]
    ml = {v["title"]: v for v in json.loads(MEMORY_LANE.read_text())["items"].values()
          if v.get("type") == "song" and not v.get("deleted")}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    added = []
    for sid, title, pic, cats, how, src in SONGS:
        if sid in items:
            continue
        lyrics = src() if callable(src) else ml[src]["lyrics"]
        items[sid] = {"type": "song", "title": title, "pic": pic, "cats": cats, "how": how,
                      "lyrics": lyrics.strip(), "updatedAt": now}
        added.append(title)
    s = items.get("settings") or {"type": "settings", "categories": []}
    cats = list(s.get("categories") or [])
    for c in CATEGORIES:
        if c not in cats:
            cats.append(c)
    order = [c for c in CATEGORIES if c in cats] + [c for c in cats if c not in CATEGORIES]
    if order != s.get("categories"):
        items["settings"] = dict(s, categories=order, updatedAt=now)
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print("added:", ", ".join(added) or "nothing new")


if __name__ == "__main__":
    main()
