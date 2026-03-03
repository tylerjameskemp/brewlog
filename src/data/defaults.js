// ============================================================
// DEFAULT DATA — The "vocabulary" of the app
// ============================================================
// This file defines the options users can select from.
// Think of it like a menu — the app shows these choices,
// and the user picks what applies to their setup.
//
// WHY THIS MATTERS: One of your key insights was that the app
// should "give you language options" rather than making you
// come up with descriptors from scratch. These defaults do that.
// ============================================================

// --- BREW METHODS ---
// Starting with V60 since that's your primary method.
// Each method has sensible default ratios and timing.
export const BREW_METHODS = [
  {
    id: 'v60',
    name: 'Hario V60',
    defaultRatio: 16,        // 1g coffee : 16g water
    defaultBloomTime: 45,    // seconds
    defaultTotalTime: 210,   // 3:30 target in seconds
    icon: '☕',
  },
  {
    id: 'chemex',
    name: 'Chemex',
    defaultRatio: 15,
    defaultBloomTime: 45,
    defaultTotalTime: 240,
    icon: '🧪',
  },
  {
    id: 'french-press',
    name: 'French Press',
    defaultRatio: 15,
    defaultBloomTime: 0,
    defaultTotalTime: 240,
    icon: '🫖',
  },
  {
    id: 'aeropress',
    name: 'AeroPress',
    defaultRatio: 14,
    defaultBloomTime: 30,
    defaultTotalTime: 120,
    icon: '💨',
  },
]

// --- GRINDERS ---
// Your Fellow Ode is first. Settings are specific to each grinder.
// Fellow Ode uses 'ode' settingType with X-1/X-2 micro-adjustment notation.
export const GRINDERS = [
  { id: 'fellow-ode', name: 'Fellow Ode', settingType: 'ode' },
  { id: 'fellow-ode-2', name: 'Fellow Ode Gen 2', settingType: 'ode' },
  { id: 'baratza-encore', name: 'Baratza Encore', settingType: 'numeric', min: 1, max: 40 },
  { id: 'comandante', name: 'Comandante C40', settingType: 'clicks', min: 0, max: 40 },
  { id: 'timemore-c2', name: 'Timemore C2', settingType: 'clicks', min: 0, max: 36 },
  { id: 'custom', name: 'Other', settingType: 'text', min: null, max: null },
]

// --- DRIPPER MATERIALS ---
export const DRIPPER_MATERIALS = ['ceramic', 'plastic', 'metal', 'glass']

// --- FILTER TYPES ---
export const FILTER_TYPES = ['paper-tabbed', 'paper-natural', 'metal', 'cloth']

export const getMethodName = (id) => BREW_METHODS.find(m => m.id === id)?.name || id
export const getGrinderName = (id) => GRINDERS.find(g => g.id === id)?.name || id

// --- FELLOW ODE GRIND POSITIONS ---
// 31 positions: 1, 1-1, 1-2, 2, 2-1, 2-2, ..., 10, 10-1, 10-2, 11
// Two micro-clicks between each main number.
export const FELLOW_ODE_POSITIONS = Object.freeze((() => {
  const pos = []
  for (let i = 1; i <= 10; i++) {
    pos.push(String(i), `${i}-1`, `${i}-2`)
  }
  pos.push('11')
  return pos
})())

// Convert grind notation to numeric value for charting
// "6" → 6.0, "6-1" → 6.33, "6-2" → 6.67
// Also handles plain numbers (pass through)
export function grindNotationToNumeric(value) {
  if (value == null) return null
  if (typeof value === 'number') return value
  const str = String(value).trim()
  const match = str.match(/^(\d+)(?:-([12]))?$/)
  if (!match) return null
  const base = parseInt(match[1], 10)
  const micro = match[2] ? parseInt(match[2], 10) : 0
  return base + (micro / 3)
}

// Convert numeric grind to Fellow Ode notation (for migration)
// Whole numbers stay as-is, half-steps map to nearest sub-position
export function numericToGrindNotation(value) {
  if (value == null) return null
  const num = Number(value)
  if (isNaN(num)) return String(value)
  const base = Math.floor(num)
  const frac = num - base
  if (frac < 0.17) return String(base)
  if (frac < 0.5) return `${base}-1`
  if (frac < 0.83) return `${base}-2`
  return String(base + 1)
}

// --- FLAVOR DESCRIPTORS ---
// Organized by category so the UI can show them in groups.
// These are standard SCA (Specialty Coffee Association) descriptors
// adapted for home brewers — less jargon, more relatable.
//
// YOUR IDEA: "pop up a bunch of them and you could click on them
// or put a custom one in there" — that's exactly what this enables.
export const FLAVOR_DESCRIPTORS = {
  fruity: [
    'Berry', 'Citrus', 'Stone Fruit', 'Tropical',
    'Apple', 'Grape', 'Dried Fruit', 'Lemon', 'Orange',
  ],
  sweet: [
    'Chocolate', 'Caramel', 'Honey', 'Brown Sugar',
    'Vanilla', 'Maple', 'Molasses', 'Toffee',
  ],
  nutty: [
    'Almond', 'Hazelnut', 'Peanut', 'Walnut', 'Cocoa Nib',
  ],
  floral: [
    'Jasmine', 'Rose', 'Lavender', 'Hibiscus', 'Chamomile',
  ],
  earthy: [
    'Tobacco', 'Cedar', 'Leather', 'Mushroom', 'Spice',
  ],
  roast: [
    'Smoky', 'Toasty', 'Roasted', 'Ashy', 'Dark Chocolate',
  ],
  // Negative descriptors — things you DON'T want but need to track
  // These help diagnose problems (over-extraction, under-extraction, etc.)
  off: [
    'Bitter', 'Sour', 'Astringent', 'Papery', 'Woody',
    'Rubbery', 'Metallic', 'Flat', 'Watery', 'Harsh',
  ],
}

// --- BODY DESCRIPTORS ---
// How the coffee feels in your mouth
export const BODY_OPTIONS = ['Thin', 'Light', 'Medium', 'Full', 'Syrupy', 'Creamy']

// --- OVERALL RATING ---
// Simple 1-5 scale with emoji for quick logging
export const RATING_SCALE = [
  { value: 1, label: 'Bad',   emoji: '😬' },
  { value: 2, label: 'Meh',   emoji: '😐' },
  { value: 3, label: 'Good',  emoji: '🙂' },
  { value: 4, label: 'Great', emoji: '😊' },
  { value: 5, label: 'Wow',   emoji: '🤩' },
]

// --- BREW ISSUES ---
// Common problems you can tag on a brew.
// Pulled directly from your transcripts (stalled bed, channeling, etc.)
export const BREW_ISSUES = [
  'Stalled bed',
  'Channeling',
  'Uneven extraction',
  'Bed too high',
  'Fines clogging',
  'Overflow',
  'Too fast drawdown',
  'Inconsistent pour',
]

// --- BEAN ORIGINS ---
// Common coffee-producing countries for quick selection
export const BEAN_ORIGINS = [
  'Ethiopia', 'Colombia', 'Kenya', 'Guatemala', 'Costa Rica',
  'Brazil', 'Peru', 'Honduras', 'Rwanda', 'Indonesia',
  'Mexico', 'Panama', 'El Salvador', 'Burundi', 'India',
]

// --- BEAN PROCESSES ---
// Common coffee processing methods
export const BEAN_PROCESSES = [
  'Washed', 'Natural', 'Honey', 'Anaerobic', 'Wet-hulled',
  'Carbonic maceration', 'Swiss Water (decaf)',
]

// --- DEFAULT POUR TEMPLATES ---
// Seeded into localStorage on first app load.
// Users can select these to populate brew steps in the Brew Screen.
export const DEFAULT_POUR_TEMPLATES = [
  {
    id: 'standard-3pour-v60',
    name: 'Standard 3-Pour V60',
    steps: [
      { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: 'Gentle spiral pour, let degas' },
      { id: 2, name: 'First Pour', waterTo: 160, time: 40, duration: 50, note: 'Steady spiral to edges' },
      { id: 3, name: 'Final Pour', waterTo: 240, time: 90, duration: 30, note: 'Center pour, gentle' },
      { id: 4, name: 'Drawdown', waterTo: null, time: 120, duration: 90, note: 'Wait for complete drain' },
    ],
  },
  {
    id: 'tetsu-46',
    name: 'Tetsu 4:6 Method',
    steps: [
      { id: 1, name: 'Pour 1 (Sweet)', waterTo: 50, time: 0, duration: 45, note: 'First 40% — sweetness' },
      { id: 2, name: 'Pour 2 (Acidity)', waterTo: 100, time: 45, duration: 45, note: 'Second 40% — acidity' },
      { id: 3, name: 'Pour 3', waterTo: 150, time: 90, duration: 45, note: 'First 60% pour' },
      { id: 4, name: 'Pour 4', waterTo: 200, time: 135, duration: 45, note: 'Second 60% pour' },
      { id: 5, name: 'Pour 5', waterTo: 250, time: 180, duration: 45, note: 'Final 60% pour' },
    ],
  },
  {
    id: 'single-pour',
    name: 'Single Pour Bloom-and-Go',
    steps: [
      { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: 'Wet all grounds, let degas' },
      { id: 2, name: 'Main Pour', waterTo: 240, time: 40, duration: 80, note: 'Continuous slow spiral pour' },
      { id: 3, name: 'Drawdown', waterTo: null, time: 120, duration: 90, note: 'Wait for complete drain' },
    ],
  },
]
