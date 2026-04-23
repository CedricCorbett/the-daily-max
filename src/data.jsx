// THE DAILY MAX — data layer
// Ethos: Movement over ego. The Crew. Today's max is whatever was in you today.

const CORE_EXERCISES = [
  { id: 'pushups', name: 'PUSH-UPS',    short: 'PUSH',  unit: 'reps', color: '#B32121' },
  { id: 'squats',  name: 'AIR SQUATS',  short: 'SQUAT', unit: 'reps', color: '#B32121' },
  { id: 'hollow',  name: 'HOLLOW HOLD', short: 'HOLD',  unit: 'sec',  color: '#B32121' },
  { id: 'pullups', name: 'PULL-UPS',    short: 'PULL',  unit: 'reps', color: '#B32121' },
];

// Energy-adaptive variants. Same slot, different difficulty. Target is suggested.
const VARIANTS = {
  pushups: {
    easy:   { name: 'Knee Push-Ups',       target: 15, swap: 'Chest stays proud. No sag.' },
    medium: { name: 'Standard Push-Ups',   target: 25, swap: 'Full range. Chest to floor.' },
    hard:   { name: 'Archer Push-Ups',     target: 12, swap: 'One side bias, 6 per arm.' },
    hotel:  { name: 'Countertop Push-Ups', target: 25, swap: 'Use the desk edge.' },
    kid:    { name: 'Loaded Push-Ups',     target: 15, swap: 'Any load on your back.' },
    back:   { name: 'Wall Push-Ups',       target: 25, swap: 'Easy on the spine.' },
  },
  squats: {
    easy:   { name: 'Chair-Assisted Squats', target: 20, swap: 'Touch the seat. Stand.' },
    medium: { name: 'Air Squats',            target: 30, swap: 'Hips below knees.' },
    hard:   { name: 'Jump Squats',           target: 20, swap: 'Land soft. Reset every rep.' },
    hotel:  { name: 'Air Squats',            target: 30, swap: 'No gear needed.' },
    kid:    { name: 'Loaded Squats',         target: 20, swap: 'Hold any weight at chest.' },
    back:   { name: 'Wall Sits',             target: 45, swap: 'Seconds, not reps.' },
  },
  // HOLLOW HOLD replaces sit-ups — spine-safe, scales infinitely, can't be ego-repped.
  // Core that actually grows: transverse abdominis + rectus under constant tension.
  hollow: {
    easy:   { name: 'Tuck Hollow',    target: 30, swap: 'Knees to chest. Lumbar flat.' },
    medium: { name: 'Hollow Hold',    target: 45, swap: 'Legs out. Low back glued down.' },
    hard:   { name: 'Hollow Rocks',   target: 45, swap: 'Rock for time. Stay rigid.' },
    hotel:  { name: 'Hollow Hold',    target: 45, swap: 'Carpet or folded towel.' },
    kid:    { name: 'Hollow + Count', target: 30, swap: 'Count out loud for them.' },
    back:   { name: 'Dead Bug Hold',  target: 45, swap: 'Zero spinal load.' },
  },
  pullups: {
    easy:   { name: 'Door-Frame Rows',   target: 12, swap: 'Towel around handle.' },
    medium: { name: 'Pull-Ups',          target: 8,  swap: 'Chin over bar.' },
    hard:   { name: 'Archer Pull-Ups',   target: 6,  swap: 'Shift weight side to side.' },
    hotel:  { name: 'Towel Door Rows',   target: 15, swap: 'Bath towel, solid door.' },
    kid:    { name: 'Loaded Pull-Ups',   target: 6,  swap: 'If bar. Else skip.' },
    back:   { name: 'Pull-Up Negatives', target: 5,  swap: 'Slow down. 5 sec each.' },
  },
};

// Night mobility (unlocks at streak 7)
const NIGHT_FLOW = [
  { name: "Deep Squat Hold",              time: 45, cue: "Sit deep. Breathe slow." },
  { name: "World's Greatest Stretch",     time: 30, cue: "Each side. Open the hip." },
  { name: "Dead Hang or Doorway Stretch", time: 30, cue: "Let the shoulders decompress." },
  { name: "90/90 Hip Switch",             time: 45, cue: "Slow pivots. Feel the capsule." },
  { name: "Child's Pose + Breath",        time: 30, cue: "Five nasal breaths. Out long." },
  { name: "Lying Spinal Twist",           time: 60, cue: "30s per side. Eyes closed." },
  { name: "Reset. Lights out.",           time: 20, cue: "Phone down. Day is done." },
];

// Share card captions — The Crew, effort over ego.
const MAX_CARD_CAPTIONS = [
  "Six minutes. Before the day started.",
  "Showed up. That's the whole game.",
  "The only meeting I didn't skip.",
  "No gear. No gym. No excuse.",
  "Day %STREAK%. Still in.",
  "This is the bar. Come clear it.",
  "Movement over ego.",
  "Not a PR. Still counts.",
];

// Per-exercise Elite Clubs. Hollow is lifetime seconds held.
const MILESTONES_BY_EXERCISE = {
  pushups: [
    { reps: 500,   label: "500 CLUB",         tier: "ROOKIE" },
    { reps: 2500,  label: "2.5K CLUB",        tier: "BRONZE" },
    { reps: 10000, label: "10K CLUB",         tier: "SILVER" },
    { reps: 25000, label: "25K CLUB",         tier: "GOLD"   },
    { reps: 50000, label: "50K PUSH-UP CLUB", tier: "ELITE"  },
  ],
  squats: [
    { reps: 500,   label: "500 CLUB",        tier: "ROOKIE" },
    { reps: 3000,  label: "3K CLUB",         tier: "BRONZE" },
    { reps: 15000, label: "15K CLUB",        tier: "SILVER" },
    { reps: 40000, label: "40K CLUB",        tier: "GOLD"   },
    { reps: 75000, label: "75K SQUAT CLUB",  tier: "ELITE"  },
  ],
  hollow: [
    { reps: 600,   label: "10 MIN CLUB",     tier: "ROOKIE" },
    { reps: 3000,  label: "50 MIN CLUB",     tier: "BRONZE" },
    { reps: 10800, label: "3 HOUR CLUB",     tier: "SILVER" },
    { reps: 36000, label: "10 HOUR CLUB",    tier: "GOLD"   },
    { reps: 90000, label: "25 HOUR CLUB",    tier: "ELITE"  },
  ],
  pullups: [
    { reps: 100,   label: "100 CLUB",         tier: "ROOKIE" },
    { reps: 500,   label: "500 CLUB",         tier: "BRONZE" },
    { reps: 2000,  label: "2K CLUB",          tier: "SILVER" },
    { reps: 5000,  label: "5K CLUB",          tier: "GOLD"   },
    { reps: 10000, label: "10K PULL-UP CLUB", tier: "ELITE"  },
  ],
};

function milestoneProgress(exId, count) {
  const ladder = MILESTONES_BY_EXERCISE[exId] || [];
  const earned = [...ladder].reverse().find(m => count >= m.reps);
  const next = ladder.find(m => count < m.reps);
  const prev = earned ? earned.reps : 0;
  const pct = next ? Math.round(((count - prev) / (next.reps - prev)) * 100) : 100;
  return { earned, next, pct };
}

// Leaderboard mock — mixed names, 20s/30s/40s/50s brackets.
// ho = hollow seconds, pu/sq/pl = reps.
const LEADERBOARD = {
  '20s': [
    { name: 'Alex K.',   city: 'Austin',    pu: 58, sq: 72, ho: 90, pl: 22, streak: 64  },
    { name: 'Sam R.',    city: 'Brooklyn',  pu: 50, sq: 65, ho: 75, pl: 18, streak: 31  },
    { name: 'YOU',       city: 'Charlotte', pu: 32, sq: 40, ho: 45, pl: 8,  streak: 1, isYou: true },
    { name: 'Jordan P.', city: 'Denver',    pu: 45, sq: 60, ho: 70, pl: 15, streak: 102 },
    { name: 'Mia T.',    city: 'LA',        pu: 38, sq: 58, ho: 95, pl: 12, streak: 47  },
  ],
  '30s': [
    { name: 'Mike D.',  city: 'Austin',      pu: 52, sq: 68, ho: 80, pl: 18, streak: 142 },
    { name: 'Raj P.',   city: 'Jersey City', pu: 48, sq: 62, ho: 75, pl: 16, streak: 89  },
    { name: 'Priya S.', city: 'Seattle',     pu: 36, sq: 50, ho: 85, pl: 10, streak: 77  },
    { name: 'Dev K.',   city: 'Seattle',     pu: 41, sq: 55, ho: 65, pl: 12, streak: 201 },
    { name: 'Chris M.', city: 'Denver',      pu: 38, sq: 50, ho: 60, pl: 14, streak: 67  },
  ],
  '40s': [
    { name: 'Cedric B.', city: 'Charlotte',  pu: 45, sq: 55, ho: 75, pl: 12, streak: 87  },
    { name: 'Tom R.',    city: 'Portland',   pu: 41, sq: 51, ho: 70, pl: 10, streak: 156 },
    { name: 'Lena V.',   city: 'Chicago',    pu: 34, sq: 48, ho: 90, pl: 8,  streak: 44  },
    { name: 'Oscar L.',  city: 'Miami',      pu: 35, sq: 44, ho: 60, pl: 8,  streak: 23  },
    { name: 'Marcus T.', city: 'Atlanta',    pu: 33, sq: 41, ho: 55, pl: 7,  streak: 112 },
  ],
  '50s': [
    { name: 'Dave H.',  city: 'Boise',       pu: 38, sq: 44, ho: 65, pl: 7, streak: 311 },
    { name: 'Paula S.', city: 'Phoenix',     pu: 32, sq: 42, ho: 80, pl: 6, streak: 180 },
    { name: 'Rick F.',  city: 'Nashville',   pu: 31, sq: 37, ho: 50, pl: 5, streak: 72  },
    { name: 'Brian O.', city: 'Minneapolis', pu: 28, sq: 34, ho: 45, pl: 4, streak: 49  },
    { name: 'Ken W.',   city: 'Raleigh',     pu: 25, sq: 31, ho: 40, pl: 3, streak: 15  },
  ],
};

// ───────────────── RALLY BOARD — crew members who broke their streak ─────────────────

const RALLY_ENCOURAGEMENTS = [
  "One day off isn't the end. Six minutes tomorrow.",
  "The streak is a habit. Habits restart. Get back in.",
  "Movement over ego. Just show up.",
  "I've broken 3 streaks. The 4th is 89 days. Come back.",
  "Day 1 again is better than day never.",
  "The comeback is the whole point. Let's go.",
  "Missed a day? Fine. Don't miss two.",
];

const RALLY_BOARD_SEED = [
  { id: 'r1', name: 'Tom R.',    city: 'Portland',    avatar: 'T', streakLost: 156, daysOff: 2, rallies: 18, sentByYou: false, note: "Lost the bar after a work trip. Starting over tomorrow.", bestExercise: 'pushups', bestCount: 41 },
  { id: 'r2', name: 'Priya S.',  city: 'Seattle',     avatar: 'P', streakLost: 23,  daysOff: 1, rallies: 4,  sentByYou: false, note: "Got sick. Missed 1. Don't want to miss 2.",             bestExercise: 'squats',  bestCount: 50 },
  { id: 'r3', name: 'Brian O.',  city: 'Minneapolis', avatar: 'B', streakLost: 49,  daysOff: 3, rallies: 11, sentByYou: false, note: "Back tweaked. Need a nudge to try back-ok mode.",       bestExercise: 'pullups', bestCount: 4  },
  { id: 'r4', name: 'Marcus T.', city: 'Atlanta',     avatar: 'M', streakLost: 112, daysOff: 4, rallies: 27, sentByYou: false, note: "This one hurts. 112 down the drain. Help.",            bestExercise: 'hollow',  bestCount: 55 },
];

const RALLY_INBOX_SEED = [
  { from: 'Cedric B.', city: 'Charlotte',   msg: "Six minutes. Before the day starts. You got this.", when: '2h ago' },
  { from: 'Raj P.',    city: 'Jersey City', msg: "Day 1 again > day never. See you tomorrow.",        when: '5h ago' },
];

// Rally notification cap — first N send a push; the rest collect inside the app.
// Keeps the Rally a nudge, not a harassment.
const RALLY_PUSH_CAP = 7;

// ───────────────── MANTRAS — stoic, The Crew ─────────────────

const MANTRAS = [
  { line: "THE OBSTACLE IS THE WAY.",                                                 src: "MARCUS AURELIUS" },
  { line: "YOU HAVE POWER OVER YOUR MIND —\nNOT OUTSIDE EVENTS.",                     src: "MARCUS AURELIUS" },
  { line: "FIRST SAY TO YOURSELF WHAT YOU WOULD BE.\nTHEN DO WHAT YOU HAVE TO DO.",   src: "EPICTETUS" },
  { line: "DISCIPLINE EQUALS FREEDOM.",                                               src: "JOCKO" },
  { line: "DON'T BE THE ONE WHO USED TO.",                                            src: "THE DAILY MAX" },
  { line: "SIX MINUTES.\nNOBODY IS COMING.\nGO.",                                     src: "THE DAILY MAX" },
  { line: "MOVEMENT OVER EGO.",                                                       src: "THE DAILY MAX" },
  { line: "THE BODY IS THE FIRST PROMISE\nYOU KEEP TO YOURSELF.",                     src: "THE DAILY MAX" },
  { line: "WASTE NO MORE TIME ARGUING\nWHAT A GOOD PERSON SHOULD BE.\nBE ONE.",       src: "MARCUS AURELIUS" },
  { line: "HARD CHOICES. EASY LIFE.\nEASY CHOICES. HARD LIFE.",                       src: "JERZY GREGOREK" },
  { line: "THE CAVE YOU FEAR TO ENTER\nHOLDS THE TREASURE YOU SEEK.",                 src: "JOSEPH CAMPBELL" },
  { line: "IT IS NOT DEATH YOU SHOULD FEAR —\nFEAR NEVER BEGINNING TO LIVE.",         src: "MARCUS AURELIUS" },
  { line: "THE PAIN YOU FEEL TODAY\nIS THE STRENGTH YOU FEEL TOMORROW.",              src: "" },
  { line: "THE CREW IS WATCHING.\nSHOW UP.",                                          src: "THE DAILY MAX" },
  { line: "SHOW UP. SUIT UP. SHUT UP.",                                               src: "" },
  { line: "THE REP YOU SKIP\nIS THE ONE THAT MATTERED.",                              src: "" },
  { line: "TODAY'S MAX IS WHATEVER\nWAS IN YOU TODAY.\nTHAT IS ENOUGH.",              src: "THE DAILY MAX" },
];

function pickMantra(streak, queue = []) {
  const recent = new Set(queue);
  const available = MANTRAS.map((m, i) => i).filter(i => !recent.has(i));
  const pool = available.length ? available : MANTRAS.map((_, i) => i);
  const pick = pool[(streak + new Date().getDate()) % pool.length];
  return { mantra: MANTRAS[pick], idx: pick };
}

// SHOWED UP score — 7-day (consistency × avg % of PR). Not raw volume.
// Showing up at 60% of your PR beats PRing on day 1 and vanishing.
// Effort capped at 1.0 per day — no ego carry.
function showedUpScore(history, bests) {
  const last7 = (history || []).slice(-7);
  if (!last7.length) return 0;
  const prTotal = prSum(bests);
  const effortDays = last7.map(h => Math.min(1, dayTotal(h) / Math.max(1, prTotal)));
  const consistency = last7.length / 7;
  const avgEffort = effortDays.reduce((a, b) => a + b, 0) / effortDays.length;
  // Weight consistency slightly heavier than intensity — showing up is the point.
  return Math.round((consistency * 0.55 + avgEffort * 0.45) * 100);
}

function dayTotal(day) {
  if (!day) return 0;
  return (day.pushups || 0) + (day.squats || 0) + (day.hollow || 0) + (day.pullups || 0);
}

function prSum(bests) {
  bests = bests || {};
  return (bests.pushups || 0) + (bests.squats || 0) + (bests.hollow || 0) + (bests.pullups || 0);
}

// Effort score 0–1.0, capped. Used by Draft (cross-tier) and Clan battles.
// Cap = 1.0 means titans can't carry. Movement over ego.
function effortScore(dayTotals, bests) {
  const total = dayTotal(dayTotals);
  const pr = prSum(bests);
  if (pr <= 0) return 0;
  return Math.min(1, total / pr);
}

// Draft tier match — is challenger within ±10% of opponent's PR total?
function draftInClass(yourPR, theirPR, tol = 0.10) {
  if (yourPR <= 0 || theirPR <= 0) return false;
  const diff = Math.abs(yourPR - theirPR) / Math.max(yourPR, theirPR);
  return diff <= tol;
}

// Clan class letter by mean team PR total (S/A/B/C). Matchmaking prefers same class.
function clanClass(meanPR) {
  if (meanPR >= 300) return 'S';
  if (meanPR >= 200) return 'A';
  if (meanPR >= 100) return 'B';
  return 'C';
}

function tierStyle(tier) {
  return {
    ROOKIE: { fg: '#C4A37A', bg: '#1F1714', border: '#6B4E32' },
    BRONZE: { fg: '#CD7F32', bg: '#1F140A', border: '#8B5A22' },
    SILVER: { fg: '#D9D9D9', bg: '#1A1A1A', border: '#808080' },
    GOLD:   { fg: '#E6C068', bg: '#1F1708', border: '#A88A3A' },
    ELITE:  { fg: '#FFD700', bg: '#2A1F08', border: '#FFD700' },
  }[tier] || { fg: '#888', bg: '#1A1A1A', border: '#444' };
}

// ───────────────── EXERCISE CUES ─────────────────

const EXERCISE_CUES = {
  pushups: {
    setup: 'Hands under shoulders. Body in one straight line, head to heel.',
    cues: ['Lead with the chest, not the head.', 'Full lockout at the top. Elbows close to 45°.'],
    mistake: 'Sagging hips or a "pecking" head — costs you shoulder health.',
  },
  squats: {
    setup: 'Feet shoulder-width. Toes slightly out. Chest tall.',
    cues: ['Knees track over toes, never collapse in.', 'Hips drop below knees. Stand all the way up.'],
    mistake: 'Half-reps. If the hip crease isn\'t below the knee, it\'s not a rep.',
  },
  hollow: {
    setup: 'On your back. Low back pressed into the floor. Arms overhead, legs extended.',
    cues: ['Ribs down, belly tight. Zero gap under the lumbar.', 'Breathe shallow through the nose. Stay rigid.'],
    mistake: 'Low back arching off the floor — that isn\'t a hollow, that\'s a back lift.',
  },
  pullups: {
    setup: 'Dead hang. Grip just wider than shoulders.',
    cues: ['Pull the bar to you, not you to the bar.', 'Chin clears the bar. Controlled descent.'],
    mistake: 'Chicken-wing reps — full range or it doesn\'t count.',
  },
};

// ───────────────── CLAN PREVIEW SEED ─────────────────

const CLAN_SEED = {
  id: 'crew-charlotte',
  name: 'CHARLOTTE CREW',
  members: [
    { name: 'YOU',     prTotal: 125, contributedToday: 0,    isYou: true  },
    { name: 'Raj P.',  prTotal: 201, contributedToday: 0.82, isYou: false },
    { name: 'Lena V.', prTotal: 180, contributedToday: 1.00, isYou: false },
    { name: 'Dev K.',  prTotal: 173, contributedToday: 0.00, isYou: false },
    { name: 'Sam R.',  prTotal: 208, contributedToday: 0.65, isYou: false },
  ],
  battleAgainst: {
    id: 'crew-austin',
    name: 'AUSTIN CREW',
    memberCount: 5,
    contributedCount: 3,
    meanScore: 0.74,
  },
  battleEndsAt: Date.now() + 1000 * 60 * 60 * 18,
};

// ───────────────── STATE STORE ─────────────────

const STORAGE_KEY = 'dailymax:v2';

const defaultState = {
  firstRun: true,
  name: '',
  ageBracket: '',
  city: '',
  partner: '', // accountability partner (name/phone) — optional
  hasBar: null,
  streak: 0,
  bestStreak: 0,
  totalDays: 0,
  totalReps: 0, // mixed unit lifetime "work" number — reps + held seconds
  lifetimeBreakdown: { pushups: 0, squats: 0, hollow: 0, pullups: 0 },
  bests: { pushups: 0, squats: 0, hollow: 0, pullups: 0 },
  today: null,
  history: [],
  streakInsurance: 0,
  mantraQueue: [],
  mode: 'medium',
  modifier: 'none',
  slot: 'am',
  voice: 'auto',
  aesthetic: 'oxblood',
  referralCode: 'CREW-' + (Math.random().toString(36).slice(2, 6).toUpperCase()),
  kickoffDay: 3,
  rallyBoard: RALLY_BOARD_SEED,
  rallyInbox: RALLY_INBOX_SEED,
  ralliesSent: 0,
  ralliesReceived: 0,
  onRally: false,
  clan: CLAN_SEED,
  // Backend-linked auth + crew (populated post-sign-in)
  userId: null,
  username: null,
  regionState: '',
  clanId: null,
  clanRole: null,       // 'leader' | 'member' | null
  clanIsSystem: false,  // true when only in The DM Clan
};

function dateOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
    // v1 → v2 migration: sit-ups get reset (different units), spouse → partner.
    const v1raw = localStorage.getItem('dailymax:v1');
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      const migrated = migrateV1(v1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return { ...defaultState, ...migrated };
    }
    return { ...defaultState };
  } catch (e) {
    return { ...defaultState };
  }
}

function migrateV1(v1) {
  const strip = (obj) => { if (!obj) return obj; const { situps, ...rest } = obj; return { ...rest, hollow: 0 }; };
  const { situps, spouse, dadventDay, ...rest } = v1 || {};
  return {
    ...rest,
    partner: spouse || '',
    kickoffDay: dadventDay || 1,
    bests: strip(v1.bests),
    lifetimeBreakdown: strip(v1.lifetimeBreakdown),
    history: (v1.history || []).map(strip),
    today: v1.today ? strip(v1.today) : null,
  };
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

Object.assign(window, {
  CORE_EXERCISES, VARIANTS, NIGHT_FLOW, MAX_CARD_CAPTIONS, EXERCISE_CUES,
  MILESTONES_BY_EXERCISE, milestoneProgress, LEADERBOARD,
  RALLY_ENCOURAGEMENTS, RALLY_BOARD_SEED, RALLY_INBOX_SEED, RALLY_PUSH_CAP,
  MANTRAS, pickMantra,
  showedUpScore, effortScore, dayTotal, prSum, draftInClass, clanClass, tierStyle,
  CLAN_SEED, defaultState, loadState, saveState, dateOffset,
});
