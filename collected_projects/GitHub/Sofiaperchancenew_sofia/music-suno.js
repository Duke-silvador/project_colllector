// Moteur studio Suno — table des familles + auto-reglages.
// Vendu depuis Music Design Studio (engine.js : GENRES/bpm/accords/batterie/voix/instru/mix)
// + discipline MelodyForge (style compact, paroles = prompt, style = instructions).
// Les descripteurs sont en anglais : la boite Style Suno se colle telle quelle.
// Les accords reprennent EXACTEMENT les libelles de SOUND.chords (music-data.js)
// pour que l'auto-selection dans mzChords fonctionne.
export const SUNO_FAM = {
  pop: { bpm: 110, chords: 'C - G - Am - F (euphoric lift)', drums: 'four-on-the-floor kick, snappy snare, offbeat hats', vocal: 'soft modern vocal, light doubles, airy harmonies', instru: 'clean guitar, warm piano, airy pads, tight drums, sub bass', mix: 'warm airy mix, controlled low-end, vocal forward' },
  rock: { bpm: 120, chords: 'Em - C - G - D', drums: 'driving kick, big snare, straight 8th hats, energetic fills', vocal: 'bold forward vocal with grit and power', instru: 'crunchy distorted guitars, live drums, bass', mix: 'punchy drums, solid center vocal' },
  metal: { bpm: 140, chords: 'Am - G - F - E (epic minor)', drums: 'double kick, aggressive fills, dynamic breaks', vocal: 'powerful vocal, clean to harsh', instru: 'heavily distorted guitars, deep bass, double-kick drums', mix: 'heavy low-end, tight drums, wall of guitars' },
  hiphop: { bpm: 85, chords: 'Dm - Bb - F - C', drums: '808 kick, trap snare, rolling hi-hats', vocal: 'confident rhythmic flow, tight timing', instru: '808s, trap drums, sparse keys, pads', mix: 'tight low-end, crisp highs, punchy 808s' },
  edm: { bpm: 128, chords: 'Am - F - C - G', drums: 'big kick, claps on 2 and 4, sidechained hats, builds and drops', vocal: 'energetic lead vocal, bright presence', instru: 'sidechained supersaws, bright plucks, pads, sub bass', mix: 'wide stereo, strong sidechain pump, massive drops' },
  jazz: { bpm: 100, chords: 'Dm7 - G7 - Cmaj7 (ii-V-I)', drums: 'swing ride, brushed snare, walking feel', vocal: 'smooth phrased vocal with swing feel', instru: 'piano, upright bass, brushed drums, sax', mix: 'warm natural sound, room ambience' },
  rnb: { bpm: 75, chords: 'Dm7 - G7 - Cmaj7 (ii-V-I)', drums: 'laid-back kick, soft snare, swung hats', vocal: 'smooth expressive vocal, gentle vibrato', instru: 'electric piano, soft bass, lush pads', mix: 'warm rounded low-end, silky highs, intimate vocal' },
  blues: { bpm: 80, chords: 'E7 - A7 - B7 (12-bar blues)', drums: 'shuffle groove, light crash, walking bass', vocal: 'raw expressive vocal', instru: 'electric guitar, harmonica, bass, brushed drums', mix: 'warm vintage sound' },
  country: { bpm: 90, chords: 'C - F - G - C (classical cadence)', drums: 'natural kick, light snare, train beat', vocal: 'storytelling vocal, natural tone', instru: 'acoustic guitar, pedal steel, bass, fiddle', mix: 'natural instruments, clear vocal on top' },
  folk: { bpm: 80, chords: 'C - G - Am - Em (alberti flow)', drums: 'light percussion, brush snare, tambourine', vocal: 'warm unadorned vocal, harmonies on chorus', instru: 'acoustic guitar, mandolin, fiddle, upright bass', mix: 'natural warm sound, minimal processing' },
  indie: { bpm: 90, chords: 'C - G - Am - F (euphoric lift)', drums: 'soft kick, brushed snare, organic feel', vocal: 'intimate close-mic vocal, warmth and fragility', instru: 'acoustic guitar, upright bass, subtle piano', mix: 'warm organic mix, gentle compression' },
  classical: { bpm: 90, chords: 'C - F - G - C (classical cadence)', drums: 'orchestral percussion, timpani swells', vocal: 'operatic vocal or choir', instru: 'full symphonic orchestra, strings, brass', mix: 'concert hall, wide dynamics' },
  comedy: { bpm: 110, chords: 'C - F - G - C (classical cadence)', drums: 'playful bouncy beat, rimshots, comedic stingers', vocal: 'character-driven vocal, comic timing', instru: 'acoustic guitar, banjo, toy instruments', mix: 'bright and punchy, vocal-forward' }
};

// Regles mot-cle (ordre = priorite) : mappe les 334 libelles SOUND.genre vers une famille.
const FAM_RULES = [
  ['doom', 'metal'], ['black metal', 'metal'], ['death', 'metal'], ['thrash', 'metal'],
  ['speed metal', 'metal'], ['power metal', 'metal'], ['symphonic metal', 'metal'], ['nu metal', 'metal'],
  ['metalcore', 'metal'], ['deathcore', 'metal'], ['mathcore', 'metal'], ['djent', 'metal'],
  ['grind', 'metal'], ['sludge', 'metal'], ['viking', 'metal'], ['folk metal', 'metal'],
  ['industrial metal', 'metal'], ['groove metal', 'metal'], ['alternative metal', 'metal'],
  ['rap metal', 'metal'], ['funk metal', 'metal'], ['pirate', 'metal'], ['crystal metal', 'metal'],
  ['orchestral metal', 'metal'], ['pounding metal', 'metal'], ['heavy metal', 'metal'], ['metal', 'metal'],
  ['hip-hop', 'hiphop'], ['hip hop', 'hiphop'], ['boom-bap', 'hiphop'], ['grime', 'hiphop'],
  ['crunk', 'hiphop'], ['phonk', 'hiphop'], ['hyphy', 'hiphop'], ['drill', 'hiphop'],
  ['trap', 'hiphop'], ['rap', 'hiphop'],
  ['tribal house', 'edm'], ['vogue', 'edm'], ['ebm', 'edm'], ['cyber', 'edm'], ['circuit', 'edm'],
  ['hardstyle', 'edm'], ['gabber', 'edm'], ['synthwave', 'edm'], ['vapor', 'edm'], ['rave', 'edm'],
  ['house', 'edm'], ['techno', 'edm'], ['trance', 'edm'], ['dubstep', 'edm'], ['drum & bass', 'edm'],
  ['drum and bass', 'edm'], ['garage', 'edm'], ['electro', 'edm'], ['club', 'edm'], ['edm', 'edm'],
  ['dance-pop', 'edm'], ['future bass', 'edm'], ['tropical', 'edm'],
  ['bebop', 'jazz'], ['bossa', 'jazz'], ['swing', 'jazz'], ['jazz', 'jazz'],
  ['blues', 'blues'],
  ['motown', 'rnb'], ['disco', 'rnb'], ['boogie', 'rnb'], ['gospel', 'rnb'], ['soul', 'rnb'],
  ['funk', 'rnb'], ['r&b', 'rnb'], ['rnb', 'rnb'], ['reggae', 'rnb'], ['dub', 'rnb'], ['ska', 'rnb'],
  ['worship', 'rnb'],
  ['country', 'country'], ['americana', 'country'], ['bluegrass', 'country'], ['western', 'country'],
  ['chanson', 'folk'], ['singer-songwriter', 'folk'], ['celtic', 'folk'], ['acoustic', 'folk'], ['folk', 'folk'],
  ['symphonic orchestra', 'classical'], ['symphonic', 'classical'], ['classical', 'classical'],
  ['baroque', 'classical'], ['opera', 'classical'], ['mozart', 'classical'], ['bach', 'classical'],
  ['beethoven', 'classical'], ['orchestra', 'classical'],
  ['parody', 'comedy'], ['novelty', 'comedy'], ['comedy', 'comedy'],
  ['dream pop', 'indie'], ['shoegaze', 'indie'], ['slowcore', 'indie'], ['indie', 'indie'],
  ['k-pop', 'pop'], ['j-pop', 'pop'], ['city pop', 'pop'], ['pop', 'pop'],
  ['punk', 'rock'], ['grunge', 'rock'], ['guitar', 'rock'], ['rock', 'rock']
];

export function familyFor(label) {
  var s = String(label || '').toLowerCase();
  if (!s) return null;
  for (var i = 0; i < FAM_RULES.length; i++) {
    if (s.indexOf(FAM_RULES[i][0]) !== -1) return FAM_RULES[i][1];
  }
  return null;
}

// Complement Style (instru + mix de la famille) pour les gros plans Style (v5/v4.5).
// MelodyForge : le style reste compact, tranche a 1000.
export function sunoExtra(famKey, max) {
  if (!famKey || !SUNO_FAM[famKey] || (max || 0) < 500) return '';
  var F = SUNO_FAM[famKey];
  return ', ' + F.instru + ', ' + F.mix;
}

// Humeurs (cover + habillage), en anglais comme tout prompt visuel/Suno.
export const SUNO_MOODS = ['longing', 'wistful', 'aching', 'haunted', 'cold fury', 'slow despair',
  'defiant optimism', 'gentle healing', 'fragile hope', 'dawn breaking', 'quiet determination',
  'euphoric', 'energetic', 'playful', 'tender', 'melancholic', 'dark and moody', 'peaceful',
  'romantic', 'nostalgic', 'triumphant', 'intimate', 'anthemic', 'dreamy', 'smoky', 'velvet'];
