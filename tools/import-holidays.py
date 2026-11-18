"""Adds the holiday songs to Song Party (2026-11-18), in their own "Holiday Songs" group.

The words are copied from Memory Lane's song list (../memory-lane-data/data.json), where they were read from David's
chord charts (memory-lane/tools/add-holiday-songs.py), never retyped. Picture, "how" lines and picture questions are
written here. Songs already in data.json (same id) are left alone, so edits made in the app are never overwritten.

   python3 tools/import-holidays.py
"""
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "song-party-data" / "data.json"
MEMORY_LANE = HERE.parent.parent / "memory-lane-data" / "data.json"
GROUP = "Holiday Songs"

SONGS = {
    "song-blue-christmas": dict(
        pic="snowflake",
        how=["Sway side to side, nice and slow.", "Wiggle your fingers like falling snow."],
        quiz=["What fell from the sky? = snowflake, pizza, ball",
              "What did we see that was green? = Christmas tree (christmas tree), sun, cake"]),
    "song-feliz-navidad": dict(
        pic="maracas",
        how=["Shake your maracas, or shake your hands!", "Wave to a friend on “merry Christmas.”"],
        quiz=["What did we say? = Feliz Navidad (christmas tree), Happy birthday (cake), Good night (moon)",
              "Where did our wish come from? = heart, shoe, rock"]),
    "song-frosty-the-snowman": dict(
        pic="snowman",
        how=["Put on your hat!", "Run in place when Frosty runs."],
        quiz=["Who came to life? = snowman, dog, robot",
              "What did Frosty wear on his head? = hat, shoe, banana",
              "What made his eyes? = coal (rock), grapes, cookie"]),
    "song-here-comes-santa-claus": dict(
        pic="santa",
        how=["Shake your hands like jingle bells.", "Wave when Santa comes by!"],
        quiz=["Who's coming? = Santa (santa), cow, shark",
              "Who pulls the sleigh? = reindeer (deer), fish, car",
              "What jingles? = bell, cheese, rock"]),
    "song-jingle-bell-rock": dict(
        pic="bell",
        how=["Dance! Rock side to side.", "Shake your jingle bells."],
        quiz=["What rocks? = bell, banana, sheep",
              "What do we do to this song? = dance, sleep (sleepy), swim"]),
    "song-jingle-bells": dict(
        pic="sled",
        how=["Shake your bells on “Jingle bells!”", "Bounce like you're riding in a sleigh."],
        quiz=["What pulled the sleigh? = horse, pig, duck",
              "What rings? = bell, fish, apple",
              "What did we ride in? = sleigh (sled), boat, rocket"]),
    "song-let-it-snow": dict(
        pic="snowflake",
        how=["Wiggle your fingers like falling snow.", "Hug yourself to keep warm."],
        quiz=["What's falling outside? = snow (snowflake), banana, ball",
              "What did we make to eat? = popcorn, spaghetti, pickle",
              "What keeps us warm? = fire, ice cream, umbrella"]),
    "song-rudolph": dict(
        pic="deer",
        how=["Touch your nose when we sing “nose.”", "Make antlers with your hands!"],
        quiz=["Who has a shiny nose? = reindeer (deer), elephant, fish",
              "Who asked Rudolph for help? = Santa (santa), cat, robot",
              "What lit up? = nose, foot, ear"]),
    "song-santa-claus-is-coming-to-town": dict(
        pic="list",
        how=["Wag your finger on “You better watch out!”", "Pretend to sleep, then wake up!"],
        quiz=["Who's coming to town? = Santa (santa), cow, ghost",
              "What is Santa making? = a list (list), a cake (cake), a snowman (snowman)"]),
    "song-we-wish-you-a-merry-christmas": dict(
        pic="pudding",
        how=["Wave and sing it big!", "Pat your tummy for the figgy pudding."],
        quiz=["What do they want to eat? = pudding, pickle, fries",
              "What do we wish you? = Merry Christmas (christmas tree), Good night (moon), Happy birthday (cake)"]),
    "song-white-christmas": dict(
        pic="christmas tree",
        how=["Sway slowly, nice and calm.", "Wiggle your fingers like falling snow."],
        quiz=["What's on the ground? = snow (snowflake), sand (shell), leaves (leaf)",
              "What do we hear in the snow? = sleigh bells (bell), drum, duck"]),
}


def main():
    d = json.loads(DATA.read_text())
    ml = json.loads(MEMORY_LANE.read_text())["items"]
    now = datetime.now(timezone.utc).isoformat()
    for sid, info in SONGS.items():
        if sid in d["items"] and not d["items"][sid].get("deleted"):
            print("already there:", sid); continue
        src = ml[sid]
        d["items"][sid] = {"type": "song", "title": src["title"], "pic": info["pic"], "cats": [GROUP],
                           "how": info["how"], "lyrics": src["lyrics"], "quiz": info["quiz"], "updatedAt": now}
        print("added", src["title"])
    settings = next(v for v in d["items"].values() if v.get("type") == "settings")
    if GROUP not in settings["categories"]:
        settings["categories"].append(GROUP); settings["updatedAt"] = now
    DATA.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
