// Rotating voice engine — streak-based tone
// 0-2: Dry Dad Humor   |  3-6: Bro Coach   |  7-20: Drill Sergeant   |  21+: Zen Father

const VOICE_PACKS = {
  dad: { // 0-2
    morning: [
      "Morning. The bar is six minutes. Go clear it.",
      "Coffee's brewing. So are you. Get up.",
      "Day one always feels like day one. Move.",
    ],
    mid: [
      "Halfway. Less than a commercial break.",
      "You've watched longer YouTube shorts than this.",
    ],
    finish: [
      "Done. Easiest thing you'll do today.",
      "Session logged. Go be a dad.",
      "Short. Stupid. Effective.",
    ],
    break: [
      "Missed yesterday. Happens. Today counts double.",
      "The streak's dead. Long live the streak.",
    ],
    idle: [
      "Still here? The workout isn't.",
    ]
  },
  bro: { // 3-6
    morning: [
      "You're building something. Six minutes. Let's GO.",
      "Streak says you mean it. Prove it again.",
      "Four stations. One shot each. MAX OUT.",
    ],
    mid: [
      "TWO more stations. LOCK IN.",
      "Your PB is right there. Take it.",
    ],
    finish: [
      "THAT'S how you stack a week. Big day.",
      "You vs yesterday. You won.",
    ],
    break: [
      "One miss. Not a trend. Today is the comeback.",
    ],
    idle: [
      "The timer doesn't start itself, champ.",
    ]
  },
  drill: { // 7-20
    morning: [
      "TWO WEEKS IN. NO DAYS OFF. HIT IT.",
      "STOP READING. START REPPING.",
      "THE BAR IS SET. CLEAR IT OR LOWER IT.",
    ],
    mid: [
      "BREATHE ON YOUR OWN TIME.",
      "DON'T YOU DARE CHEAT THE LAST STATION.",
    ],
    finish: [
      "LOGGED. DISMISSED.",
      "ANOTHER DAY THE OTHER DADS DIDN'T SHOW UP. YOU DID.",
    ],
    break: [
      "YOU BROKE THE STREAK. RECRUIT YOURSELF BACK IN.",
    ],
    idle: [
      "THE APP IS OPEN. THE WORKOUT IS NOT.",
    ]
  },
  zen: { // 21+
    morning: [
      "The discipline is quiet now. Just do the thing.",
      "Nothing to prove. Everything to maintain.",
      "Six minutes. Same as yesterday. Same as tomorrow.",
    ],
    mid: [
      "Steady. You've done this a hundred times.",
    ],
    finish: [
      "Logged. The habit is the reward.",
      "Body thanks you. Quietly.",
    ],
    break: [
      "Even the tide misses a day. Return.",
    ],
    idle: [
      "Practice is practice. Begin when you're ready.",
    ]
  },
};

function pickVoice(streak, override = 'auto') {
  if (override !== 'auto' && VOICE_PACKS[override]) return override;
  if (streak >= 21) return 'zen';
  if (streak >= 7)  return 'drill';
  if (streak >= 3)  return 'bro';
  return 'dad';
}

function voiceLine(key, streak, override = 'auto') {
  const pack = VOICE_PACKS[pickVoice(streak, override)];
  const bank = pack[key] || pack.morning;
  return bank[Math.floor(Math.random() * bank.length)];
}

function voiceLabel(code) {
  return { dad: 'Dry Dad', bro: 'Bro Coach', drill: 'Drill Sergeant', zen: 'Zen Father' }[code] || 'Auto';
}

Object.assign(window, { VOICE_PACKS, pickVoice, voiceLine, voiceLabel });
