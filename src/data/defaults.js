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
export const GRINDERS = [
  { id: 'fellow-ode', name: 'Fellow Ode', settingType: 'numeric', min: 1, max: 11, step: 0.5 },
  { id: 'fellow-ode-2', name: 'Fellow Ode Gen 2', settingType: 'numeric', min: 1, max: 11, step: 0.5 },
  { id: 'baratza-encore', name: 'Baratza Encore', settingType: 'numeric', min: 1, max: 40 },
  { id: 'comandante', name: 'Comandante C40', settingType: 'clicks', min: 0, max: 40 },
  { id: 'timemore-c2', name: 'Timemore C2', settingType: 'clicks', min: 0, max: 36 },
  { id: 'custom', name: 'Other', settingType: 'text', min: null, max: null },
]

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
