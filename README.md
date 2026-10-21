# Song Party

Big, bright activity songs for the TV, for groups of adults who enjoy kids' songs (developmental delays,
about a 6–12-year-old level). David plays guitar live; the app shows the words and pictures and makes a few
synth sound effects (pops, a plop, a cheer). No voices.

**Open it:** https://www.davyrockett.com/song-party/ (in the TV's web browser; use Full screen on the welcome page).

## At the TV (keyboard)
- **Song list:** big picture tiles. Arrows to move, **Enter** to open, **Tab** to switch groups. The order is mixed up
  each time; songs sung today go to the end. **A–Z** shows them alphabetically. ⌂ (or **Home** / **Esc**) = welcome screen.
- **Get ready! card:** the song's picture, title and what to do. **N** shows the next tip, **Enter** starts.
- **Words:** one verse at a time, huge. **Space**, **→**, **Page Down** or **Enter** goes on (a foot pedal or clicker works);
  **←** / **Page Up** goes back; **Esc** back to the songs. After the last verse: a picture question, then confetti and a cheer.
- **Picture question** (after the song): "Who was sleeping?" with three big pictures. The group points or shouts;
  press **1**, **2** or **3** (or click). A wrong one wiggles and fades, the right one grows and sparkles. **N** = another
  question, **Enter** = on to the confetti (skips the question if you'd rather not). A song with several questions asks a
  different one each time it's sung. In the Hole song it asks what went in the hole first (or last).
- **Magic words:** a highlighted word like *cow* has a picture. Click the word (or press **1**–**9**) and the picture pops
  up big in the middle of the screen, then lands next to the word. Settings → Magic words can make them pop up by themselves instead.
- **C** switches colors anytime (light, dark, yellow on blue).

## Hole in the Bottom of the Sea
The group picks what goes in the hole.
1. Verse 1 is just the hole. Each verse is two screens: the long line ("sing it two times"), then
   "There's a ___, there's a ___!" with the long line again.
2. Then the picture board asks **What's on the ___?** Click what the group points to, or press **Space** for a
   **Surprise!** (the board lights up picture after picture and lands on one). **Old song** picks the next thing from the
   real song (log, bump, frog, wart, hair, fly, flea). Things already in the hole are greyed out.
3. The new thing drops into the sea with a plop, and the words stack up the same way the pile does.
4. **Finish** (or **F**) any time: confetti, plus everything that went into the hole.

## Changing songs
Settings (⚙ on the song list) → **Edit songs**: title, picture, groups, Get ready! tips, picture questions and lyrics.
- Picture questions: one per line, the question, `=`, then the right answer first and two wrong ones, as picture names:
  `Who was sleeping? = lion, cow, duck`. They get mixed up on screen. For a different word, put the picture in brackets:
  `Which one says quack? = quack (duck), moo (cow), oink (pig)`. A song with no questions goes straight to the confetti.
- Leave a blank line between verses; put `[Chorus]` on its own line at the top of a chorus.
- Magic words: `[frog](frog)` shows the word "frog" with the frog picture. The part in round brackets is a picture name;
  the Picture box suggests names as you type.
- To save changes for every device, paste your GitHub access key in Settings (it needs song-party-data with Contents "Read and write").
- ✎ **Edit** in the song's control bar lays out the screens by hand (same as Memory Lane).

## TV link (laptop controls the TV, no cable)
Same as Memory Lane: **📺 Use as TV screen** on the TV, **🎛 Control a TV** on the laptop. Sound effects play on the TV only.

## Pictures
Emoji artwork from [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0), stored in the app so they work offline and
look the same everywhere. To add a picture, add its name and code to `pics.js` and run `tools/get-pics.sh`.

## Test on the Mac
Double-click **Start Song Party.command**.
