/* The picture library: emoji-style pictures stored in the app (pics/<code>.svg), so they look the same on every
   TV and work offline. Artwork: Twemoji (github.com/jdecked/twemoji), CC-BY 4.0.
   A song's picture and its magic words use these names, e.g. [frog](frog) in the lyrics.
   To add one: find its code at emojipedia.org (e.g. 1f438 for 🐸), add a line here, and run tools/get-pics.sh.
   Also loaded by sw.js, so every picture is saved for offline use. Plain old JavaScript for TV browsers. */
var PICS = {
  // Animals
  frog: '1f438', fish: '1f41f', 'tropical fish': '1f420', duck: '1f986', cat: '1f431', dog: '1f436', crab: '1f980',
  octopus: '1f419', turtle: '1f422', shark: '1f988', whale: '1f433', cow: '1f42e', pig: '1f437', monkey: '1f435',
  snail: '1f40c', bee: '1f41d', penguin: '1f427', horse: '1f434', sheep: '1f411', chicken: '1f414', chick: '1f424',
  lion: '1f981', elephant: '1f418', bear: '1f43b', rabbit: '1f430', mouse: '1f42d', butterfly: '1f98b',
  spider: '1f577', dinosaur: '1f996', unicorn: '1f984', fly: '1fab0', bug: '1f41b', ant: '1f41c', turkey: '1f983',
  // Food
  pizza: '1f355', banana: '1f34c', cake: '1f382', 'ice cream': '1f366', apple: '1f34e', hamburger: '1f354',
  donut: '1f369', cookie: '1f36a', strawberry: '1f353', carrot: '1f955', egg: '1f95a',
  // Things
  log: '1fab5', rock: '1faa8', shoe: '1f45f', hat: '1f3a9', crown: '1f451', ball: '26bd', teddy: '1f9f8',
  car: '1f697', bus: '1f68c', train: '1f682', boat: '26f5', rocket: '1f680', robot: '1f916', guitar: '1f3b8',
  drum: '1f941', bell: '1f514', balloon: '1f388', gift: '1f381', house: '1f3e0', umbrella: '2602',
  'green dot': '1f7e2', curl: '27b0', 'brown dot': '1f7e4',
  // Nature and weather
  wave: '1f30a', shell: '1f41a', sun: '2600', moon: '1f319', star: '2b50', rainbow: '1f308', tree: '1f333',
  flower: '1f338', leaf: '1f33f', snowman: '26c4', pumpkin: '1f383', ghost: '1f47b', 'christmas tree': '1f384',
  // Party
  party: '1f389', confetti: '1f38a', notes: '1f3b6', heart: '2764', sparkles: '2728',
  // Body and actions
  clap: '1f44f', hooray: '1f64c', wave_hand: '1f44b', stomp: '1f9b6', foot: '1f9b6', leg: '1f9b5', hand: '270b',
  thumbs: '1f44d', arm: '1f4aa', eyes: '1f440', ear: '1f442', nose: '1f443', mouth: '1f444', dance: '1f483',
  // More for the ARC songs (added 2026-10-19)
  blowfish: '1f421', dolphin: '1f42c', lobster: '1f99e', oyster: '1f9aa', tiger: '1f42f', racehorse: '1f40e', bird: '1f426',
  paw: '1f43e', planet: '1fa90', earth: '1f30d', 'shooting star': '1f320', cloud: '2601', snowflake: '2744', ice: '1f9ca',
  palm: '1f334', cactus: '1f335', rose: '1f339', mountain: '26f0', beach: '1f3d6', lemon: '1f34b', honey: '1f36f',
  lollipop: '1f36d', anchor: '2693', ship: '1f6a2', cowboy: '1f920', maracas: '1fa87', trumpet: '1f3ba', saxophone: '1f3b7',
  violin: '1f3bb', microphone: '1f3a4', handshake: '1f91d', hug: '1fac2', friends: '1f9d1-200d-1f91d-200d-1f9d1',
  // Feelings
  happy: '1f60a', smile: '1f603', sad: '1f622', angry: '1f620', sleepy: '1f634', surprised: '1f62e', silly: '1f61c',
};
function picUrl(name) {
  var code = PICS[String(name || '').toLowerCase()];
  return code ? 'pics/' + code + '.svg' : '';
}
