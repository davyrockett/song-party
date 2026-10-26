"""Adds a silly-words (mad libs) song to Song Party, copying the words from Memory Lane's song list, or from a song
already in Song Party (--from song-party), never retyped.

   python3 tools/silly-song.py "Ring of Fire" --verses 1,2 --swap burning:describe,thing,ring,fire:things --pic fire
   python3 tools/silly-song.py "Hound Dog" --from song-party --title "Hound Dog (Silly Words)" --swap "hound dog,rabbit" --pic dog

--title names the new song (needed when the regular song is already in Song Party, so both can stay).
--verses picks which sections to keep (1 = the first verse, blank-line separated, counting choruses).
--swap marks the words the group gets to swap (whole words, any capitals), each with the kind of word that fits
there after a colon (thing, things or describe; see SILLY_KINDS in madlib.js): fire:things → {fire|things}.
Adds the song to ../song-party-data/data.json. A song already there (same id) is left alone, so edits made in
the app are never overwritten, unless --replace is given. Then commit and push song-party-data."""
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "song-party-data" / "data.json"
MEMORY_LANE = HERE.parent.parent / "memory-lane-data" / "data.json"
HOW = ["We pick silly words for the song!", "Point to a picture for each word.", "Then we sing it with our silly words!"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("song")
    ap.add_argument("--verses", default="")
    ap.add_argument("--swap", required=True)
    ap.add_argument("--pic", default="notes")
    ap.add_argument("--cats", default="Silly Songs,Pick & Build")
    ap.add_argument("--replace", action="store_true")
    ap.add_argument("--from", dest="src", choices=["memory-lane", "song-party"], default="memory-lane")
    ap.add_argument("--title", default="")
    a = ap.parse_args()

    songs = json.loads((DATA if a.src == "song-party" else MEMORY_LANE).read_text())["items"]
    src = next((v for v in songs.values() if v.get("title", "").lower() == a.song.lower() and not v.get("deleted")), None)
    if not src:
        raise SystemExit(f"No song called {a.song!r} in {a.src}.")
    blocks = [b.strip() for b in re.split(r"\n\s*\n", src["lyrics"].replace("\r", "")) if b.strip()]
    if a.verses:
        blocks = [blocks[int(n) - 1] for n in a.verses.split(",")]
    lyrics = "\n\n".join(blocks)
    for spec in a.swap.split(","):
        w, _, kind = spec.strip().partition(":")
        tail = "|" + kind if kind and kind != "thing" else ""
        lyrics, n = re.subn(rf"\b({re.escape(w)})\b", lambda m: "{" + m.group(1) + tail + "}", lyrics, flags=re.I)
        print(f"{w}: marked {n} times ({kind or 'thing'})")

    data = json.loads(DATA.read_text())
    title = a.title or src["title"]
    sid = "song-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if sid in data["items"] and not a.replace:
        raise SystemExit(f"{sid} is already in Song Party; left alone.")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    data["items"][sid] = {"type": "song", "title": title, "pic": a.pic, "cats": a.cats.split(","),
                          "how": HOW, "lyrics": lyrics, "updatedAt": now}
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Added {sid}: {len(blocks)} sections, {lyrics.count(chr(10)) + 1} lines")


if __name__ == "__main__":
    main()
