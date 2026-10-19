"""Gives the ARC songs their pictures: a scene, big verse pictures ({clap} lines) and a few magic words.

   python3 tools/add-visuals.py      -> updates ../song-party-data/data.json

Works on the lyrics already in data.json: it adds a {…} line to the matching sections and wraps existing words
as magic words ([rabbit](rabbit)); it never retypes lyrics. Safe to run again: sections that already have a {…}
line and words already marked are left alone. After this, change pictures in the app (Edit songs)."""
import json, re
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent.parent / "song-party-data" / "data.json"

# song id: (scene, [(text that picks the section, "{pictures}" or None, [(words to mark, picture), …]), …])
VISUALS = {
    "song-happy-know-it": ("party", [
        (r"clap your hands", "clap", []),
        (r"stomp your feet", "stomp", []),
        (r"shout", "hooray", []),
        (r"do all three", "clap, stomp, hooray", []),
    ]),
    "song-lion-sleeps": ("jungle", [
        (r"^Ee-e-e", "lion zzz", []),
        (r"^Wimoweh", "lion zzz", []),
        (r"In the jungle", "tree", [("mighty jungle", "tiger")]),
        (r"Near the village", "house", [("peaceful village", "tree")]),
        (r"Hush my darling", "heart", []),
    ]),
    "song-under-the-sea": ("sea", [
        (r"The seaweed", "leaf, wave", [("ocean floor", "shell")]),
        (r"Darlin’ it’s better", "crab, tropical fish", [("in the sun", "sun")]),
        (r"Down here all the fish", "tropical fish, fish", [("bowl", "fish")]),
        (r"Nobody beats us", "crab, blowfish", [("sturgeon", "fish"), ("ray", "dolphin")]),
        (r"The newt play the flute", "trumpet, saxophone", []),
        (r"The ray he can play", "violin, microphone", [("blowfish", "blowfish")]),
        (r"When the sardine", "fish, notes", []),
        (r"crustacean band", "lobster, drum", [("clam", "oyster"), ("slug", "snail")]),
        (r"Each little snail", "snail, octopus", []),
    ]),
    "song-here-comes-sun": ("sunny", [
        (r"Here comes the sun\. Here", "sun", []),
        (r"cold lonely winter", "snowman", [("winter", "snowflake")]),
        (r"smiles returning", "smile", []),
        (r"^Sun, sun, sun", "sun, sparkles", []),
        (r"ice is slowly melting", "ice", []),
    ]),
    "song-happy-trails": ("west", [
        (r"^Happy trails to you", "racehorse, cowboy", [("clouds", "cloud"), ("sunny weather", "sun")]),
        (r"^Some trails", "happy, sad", []),
    ]),
    "song-la-bamba": ("fiesta", [
        (r"^Para bailar", "dance, maracas", []),
        (r"^Yo no soy marinero", "ship, anchor", []),
        (r"^Bamba", "guitar, maracas", []),
    ]),
    "song-fly-me-moon": ("space", [
        (r"^Fly me to the moon", "moon, rocket", [("stars", "star"), ("Jupiter and Mars", "planet")]),
        (r"hold my hand", "handshake", []),
        (r"Fill my heart", "notes, heart", []),
        (r"please, be true", "heart", []),
    ]),
    "song-over-rainbow": ("rainbow", [
        (r"Way up high", "rainbow", [("lullaby", "sleepy")]),
        (r"Skies are blue", "rainbow, cloud", [("dreams", "sparkles")]),
        (r"wish upon a star", "star, cloud", [("lemon drops", "lemon"), ("chimney tops", "house")]),
        (r"Bluebirds fly", "bird, rainbow", []),
        (r"happy little bluebirds", "bird", []),
    ]),
    "song-hound-dog": ("party", [
        (r"hound dog, hound dog", "dog", [("rabbit", "rabbit")]),
        (r"high-classed", "dog, crown", [("rabbit", "rabbit")]),
    ]),
    "song-lean-on-me": ("hearts", [
        (r"Sometimes in our lives", "sad", [("tomorrow", "sun")]),
        (r"^Lean on me", "hug", []),
        (r"won’t be long", "friends", []),
        (r"swallow your pride", "handshake", []),
        (r"call on me brother", "friends, heart", [("hand", "hand")]),
        (r"load you have to bear", "arm", [("road", "car")]),
    ]),
    "song-bare-necessities": ("jungle", [
        (r"^Look for the bare", "bear", []),
        (r"Mother Nature", "bear, flower", []),
        (r"Wherever I wander", "bee, honey", [("bees", "bee"), ("rocks", "rock")]),
        (r"fancy ants", "ant", [("ants", "ant")]),
        (r"rest at ease", "bear zzz", []),
    ]),
    "song-old-macdonald": ("farm", []),
}


def mark(section, words, pic):
    """Turn the first plain (not yet marked) "words" in the section into [words](pic)."""
    if "[" + words + "](" in section:
        return section
    m = re.search(r"(?<![\w\[])" + re.escape(words) + r"(?![\w\]])", section)
    if not m:
        print("   (not found:", words + ")")
        return section
    return section[:m.start()] + "[" + words + "](" + pic + ")" + section[m.end():]


def decorate(lyrics, rules):
    secs = lyrics.split("\n\n")
    for pattern, pics, magic in rules:
        flat = lambda t: t.replace("’", "'")   # curly or straight apostrophes both match
        hit = [i for i, s in enumerate(secs)
               if re.search(flat(pattern), flat("\n".join(l for l in s.split("\n") if not l.startswith(("[Chorus]", "{")))), re.M)]
        if not hit:
            print("   no section matches", pattern)
        for i in hit:
            s = secs[i]
            ls = s.split("\n")
            if pics and not any(l.startswith("{") for l in ls):
                at = 1 if ls[0] == "[Chorus]" else 0
                ls.insert(at, "{" + pics + "}")
            s = "\n".join(ls)
            for words, pic in magic:
                s = mark(s, words, pic)
            secs[i] = s
    return "\n\n".join(secs)


def main():
    data = json.loads(DATA.read_text())
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    for sid, (scene, rules) in VISUALS.items():
        rec = data["items"].get(sid)
        if not rec or rec.get("deleted"):
            print("missing", sid); continue
        print(rec["title"])
        new = dict(rec, scene=rec.get("scene") or scene, lyrics=decorate(rec["lyrics"], rules))
        if new != rec:
            new["updatedAt"] = now
            data["items"][sid] = new
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
