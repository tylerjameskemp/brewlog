// ============================================================
// GRIND CALIBRATION — Qualitative tier → grinder-specific ranges
// ============================================================
// Maps qualitative grind descriptors (medium-fine, coarse, etc.)
// to suggested setting ranges for supported grinders.
// Research: docs/plans/2026-03-11-research-grinder-calibration.md

// Keyed by grinder ID from defaults.js.
export const GRIND_CALIBRATION = {
  'fellow-ode': {
    'fine': null,
    'medium-fine': '1 - 2-2',
    'medium': '2-2 - 5',
    'medium-coarse': '5 - 7',
    'coarse': '7 - 11',
  },
  'fellow-ode-gen2-burrs': {
    'fine': '1-2 - 2',
    'medium-fine': '2-2 - 5-2',
    'medium': '5-2 - 7',
    'medium-coarse': '7 - 9',
    'coarse': '9 - 11',
  },
  'fellow-ode-2': {
    'fine': '1-2 - 2',
    'medium-fine': '2-2 - 5-2',
    'medium': '5-2 - 7',
    'medium-coarse': '7 - 9',
    'coarse': '9 - 11',
  },
  'baratza-encore': {
    'fine': '4 - 9',
    'medium-fine': '10 - 18',
    'medium': '19 - 25',
    'medium-coarse': '26 - 32',
    'coarse': '33 - 40',
  },
  'comandante': {
    'fine': '7 - 13',
    'medium-fine': '15 - 25',
    'medium': '20 - 28',
    'medium-coarse': '26 - 34',
    'coarse': '30 - 40',
  },
  'timemore-c2': {
    'fine': '6 - 12',
    'medium-fine': '13 - 18',
    'medium': '18 - 22',
    'medium-coarse': '22 - 26',
    'coarse': '26 - 30',
  },
}

export function getGrindSuggestion(grinderId, qualitativeTier) {
  const calibration = GRIND_CALIBRATION[grinderId]
  if (!calibration) return null
  return calibration[qualitativeTier] ?? null
}
