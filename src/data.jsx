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

// Leaderboard — empty until real users populate it via the backend.
// Structure kept intact so brackets still render; add seed rows here for local demos.
const LEADERBOARD = {
  '20s': [],
  '30s': [],
  '40s': [],
  '50s': [],
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

// Rally board + inbox — empty until real users break their streaks and the
// backend populates them. Seed arrays kept empty so the UI shows true zero.
const RALLY_BOARD_SEED = [];
const RALLY_INBOX_SEED = [];

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

// ───────────────── KICKOFF 30 — 30-DAY RAMP ─────────────────
// Each day adds ONE bonus on top of your Daily Max. No skipping. No catching up.
// Miss a day and that number is gone forever. Keep it short, physical, doable in
// a hallway. On-brand: stoic, crew-coded, zero fluff.
const KICKOFF_BONUSES = [
  { name: "The Loaded Carry",        cue: "60-second farmer carry. Groceries, a backpack, whatever's heaviest in reach. One trip." },
  { name: "The Dead Hang",           cue: "60 seconds hanging from a bar. One grip. If you drop, you start over." },
  { name: "The Wall Sit",            cue: "90 seconds. Back flat. Knees at 90. Don't slide. Don't bargain." },
  { name: "The Cold Minute",         cue: "60 seconds cold shower at the end. Breathe slow through the nose. Don't flinch." },
  { name: "The Plank Lock",          cue: "2 minutes in a plank. Ribs down, glutes tight. Unbroken or you redo it." },
  { name: "The Single-Leg Stand",    cue: "60 seconds per leg, eyes closed. Balance is a skill you've been losing." },
  { name: "The Bear Crawl",          cue: "50 feet forward, 50 feet back. Knees an inch off the floor the whole way." },
  { name: "The Jump Rope",           cue: "300 jumps. No rope? Fake it. Light on the balls of the feet." },
  { name: "The Hinge Hundred",       cue: "100 good-mornings, bodyweight. Hinge at the hip, not the back. Teach your posterior chain who it is." },
  { name: "The Stair Climb",         cue: "10 flights straight up, no stopping. No stairs? 100 step-ups on any ledge." },
  { name: "The Towel Row",           cue: "50 slow rows with a towel around a door handle. Pull the elbows past the ribs." },
  { name: "The Shoulder Carry",      cue: "60 seconds overhead hold with any weight. Backpack, jug, toddler. Arms locked." },
  { name: "The Lunge Mile",          cue: "100 walking lunges. Back knee kisses the floor. No racing — earn every step." },
  { name: "The Burpee Tax",          cue: "30 burpees. Chest to floor, jump at the top. Pay it all at once or in 3 sets of 10." },
  { name: "The Breath Ladder",       cue: "5 rounds: 20 seconds max inhale hold, 20 seconds easy breathing. Calm under pressure." },
  { name: "The Handstand Hold",      cue: "60 cumulative seconds nose-to-wall handstand. Shoulders in your ears. Stack." },
  { name: "The Hollow Double",       cue: "Add a second hollow hold to your Daily Max. Same duration. Back to back. No rest." },
  { name: "The Sprint Six",          cue: "6 × 20-second all-out sprints. Hill, driveway, or in place. 40 seconds walk between." },
  { name: "The L-Sit",               cue: "60 cumulative seconds. Two chairs, palms down, legs out. Fail, reset, keep the clock." },
  { name: "The Pull-Up Double",      cue: "Add a second pull-up set to your Daily Max. Match your first rep count or go to failure." },
  { name: "The Goblet Hold",         cue: "90 seconds holding a heavy object at your chest in a deep squat. Quiet breath. Still hips." },
  { name: "The Push-Up Ladder",      cue: "Count up: 1, 2, 3 … until you fail a number. Rest 10s between rungs. That's your new ceiling." },
  { name: "The Silent Mile",         cue: "Walk one mile. No phone. No music. No pod. Just your head and the road." },
  { name: "The Reverse Plank",       cue: "90 seconds. Heels down, hips up, chest open. Undoes everything your desk did." },
  { name: "The Hollow Mile",         cue: "Accumulate 5 minutes of hollow hold today. 30s sets until you hit it. Low back never leaves the floor." },
  { name: "The Squat Century",       cue: "100 air squats, unbroken. If you stop, the set restarts. No exceptions. No complaints." },
  { name: "The Carry Complex",       cue: "60s overhead hold → 60s front rack → 60s farmer carry. Same weight. No set-downs between." },
  { name: "The Cold + Quiet",        cue: "2 minutes cold shower. Nasal breathing only. Day 4's breath. Day 28's composure." },
  { name: "The Crew Rally",          cue: "Send one rally to a crew member today. Name them. Tell them you saw it. Then train." },
  { name: "The Promise Kept",        cue: "30 days. You showed up. Today, double your Daily Max. One time. For the record. For the crew." },
];

// ───────────────── CLAN PREVIEW SEED ─────────────────
// Empty shape; real clan data comes from Supabase. Left as `null` so ClanScreen
// redirects to the join/create entry flow for users not in a real crew yet.
const CLAN_SEED = null;

// ───────────────── FEATURE FLAGS ─────────────────
// Accountability partner (streak-break SMS/email) — hidden until the
// notification pipeline is wired. Set to true to re-enable the UI.
const ACCOUNTABILITY_ENABLED = false;

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
  lastLoggedDate: null,
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
  kickoffDay: 1,
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
  CORE_EXERCISES, VARIANTS, NIGHT_FLOW, KICKOFF_BONUSES, MAX_CARD_CAPTIONS, EXERCISE_CUES,
  MILESTONES_BY_EXERCISE, milestoneProgress, LEADERBOARD,
  RALLY_ENCOURAGEMENTS, RALLY_BOARD_SEED, RALLY_INBOX_SEED, RALLY_PUSH_CAP,
  MANTRAS, pickMantra,
  showedUpScore, effortScore, dayTotal, prSum, draftInClass, clanClass, tierStyle,
  CLAN_SEED, defaultState, loadState, saveState, dateOffset,
  ACCOUNTABILITY_ENABLED,
});
