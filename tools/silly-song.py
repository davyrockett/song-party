"""Adds a silly-words (mad libs) song to Song Party, copying the words from Memory Lane's song list (never retyped).

   python3 tools/silly-song.py "Ring of Fire" --verses 1,2 --swap thing,ring,fire --pic fire

--verses picks which sections to keep (1 = the first verse, blank-line separated, counting choruses).
--swap marks the words the group gets to swap, as {fire} in the lyrics (whole words, any capitals).
Adds the song to ../song-party-data/data.json; a song already there (same id) is left alone, so edits made
in the app are never overwritten. Then commit and push song-party-data."""
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "song-party-data" / "data.json"
MEMORY_LANE = HERE.parent.parent / "memory-lane-data" / "data.json"
HOW = ["We pick silly words for the song!", "Point to a picture for each word.", "Then we sing it with our silly words!"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("title")
    ap.add_argument("--verses", default="")
    ap.add_argument("--swap", required=True)
    ap.add_argument("--pic", default="notes")
    ap.add_argument("--cats", default="Silly Songs,Pick & Build")
    a = ap.parse_args()

    ml = json.loads(MEMORY_LANE.read_text())["items"]
    src = next((v for v in ml.values() if v.get("title", "").lower() == a.title.lower() and not v.get("deleted")), None)
    if not src:
        raise SystemExit(f"No song called {a.title!r} in Memory Lane.")
    blocks = [b.strip() for b in re.split(r"\n\s*\n", src["lyrics"].replace("\r", "")) if b.strip()]
    if a.verses:
        blocks = [blocks[int(n) - 1] for n in a.verses.split(",")]
    lyrics = "\n\n".join(blocks)
    for w in a.swap.split(","):
        w = w.strip()
        lyrics, n = re.subn(rf"\b({re.escape(w)})\b", r"{\1}", lyrics, flags=re.I)
        print(f"{w}: marked {n} times")

    data = json.loads(DATA.read_text())
    sid = "song-" + re.sub(r"[^a-z0-9]+", "-", a.title.lower()).strip("-")
    if sid in data["items"]:
        raise SystemExit(f"{sid} is already in Song Party; left alone.")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    data["items"][sid] = {"type": "song", "title": src["title"], "pic": a.pic, "cats": a.cats.split(","),
                          "how": HOW, "lyrics": lyrics, "updatedAt": now}
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Added {sid}: {len(blocks)} sections, {lyrics.count(chr(10)) + 1} lines")


if __name__ == "__main__":
    main()
