// ─── Time-of-Day Atmospheric Colors ────────────────────────
// 7 anchor points from the design prototype. Pure CSS — no external APIs.
// Each anchor defines: background, glow blobs, wash gradient, text/UI colors.

const TOD_ANCHORS = [
  { hour: 5, bg: '#DDD6CE',
    g1: 'rgba(145,100,125,0.45)', g1w: 200, g1h: 160, g1f: 45,
    g2: 'rgba(170,120,110,0.35)', g2w: 160, g2h: 120, g2f: 50,
    g3: 'rgba(130,95,115,0.3)',   g3w: 130, g3h: 100, g3f: 40,
    g4: 'rgba(160,130,120,0.2)',  g4w: 180, g4h: 90,  g4f: 55,
    wash: 'radial-gradient(ellipse 120% 100% at 45% -10%,rgba(140,105,120,0.4) 0%,rgba(160,125,115,0.2) 35%,rgba(180,150,135,0.08) 60%,transparent 85%)',
    bean: '#352828', roast: '#6E6460', metaValue: '#6A5A50', metaDivider: '#B8AEA6',
    noteBg: '#E2DCD4', noteBorder: '#A88070', noteTitle: '#A06850', noteBody: '#5A504A', noteDate: '#908880',
    cardBg: '#E2DCD4', cardBorder: 'rgba(100,85,75,0.12)', link: '#7A706A',
    muted: '#908880', text: '#302828', chipColor: '#5A504A', chipBorder: '#C0B8B0' },
  { hour: 7, bg: '#E6DACC',
    g1: 'rgba(225,155,60,0.55)', g1w: 220, g1h: 170, g1f: 42,
    g2: 'rgba(210,115,55,0.35)', g2w: 170, g2h: 130, g2f: 48,
    g3: 'rgba(230,170,80,0.3)',  g3w: 140, g3h: 110, g3f: 38,
    g4: 'rgba(200,125,65,0.2)',  g4w: 190, g4h: 95,  g4f: 52,
    wash: 'radial-gradient(ellipse 130% 100% at 50% -10%,rgba(218,145,65,0.42) 0%,rgba(210,130,70,0.2) 35%,rgba(200,155,110,0.08) 60%,transparent 85%)',
    bean: '#352A25', roast: '#665A4E', metaValue: '#6A4828', metaDivider: '#C4BAB0',
    noteBg: '#F0E8DA', noteBorder: '#C07048', noteTitle: '#B05535', noteBody: '#3E3830', noteDate: '#A8A098',
    cardBg: '#F0E8DA', cardBorder: 'rgba(107,95,85,0.12)', link: '#7A7068',
    muted: '#A8A098', text: '#2A2622', chipColor: '#3E3830', chipBorder: '#C4BAB0' },
  { hour: 9, bg: '#E8DECC',
    g1: 'rgba(235,185,70,0.52)', g1w: 215, g1h: 165, g1f: 40,
    g2: 'rgba(240,195,95,0.32)', g2w: 175, g2h: 125, g2f: 46,
    g3: 'rgba(225,170,60,0.28)', g3w: 145, g3h: 105, g3f: 36,
    g4: 'rgba(235,180,85,0.18)', g4w: 195, g4h: 90,  g4f: 50,
    wash: 'radial-gradient(ellipse 130% 100% at 55% -10%,rgba(230,180,75,0.4) 0%,rgba(225,170,80,0.18) 35%,rgba(215,175,120,0.06) 60%,transparent 85%)',
    bean: '#352A25', roast: '#665A4E', metaValue: '#6A4828', metaDivider: '#C4BAB0',
    noteBg: '#F2EADE', noteBorder: '#C27050', noteTitle: '#B25838', noteBody: '#3E3830', noteDate: '#A8A098',
    cardBg: '#F2EADE', cardBorder: 'rgba(107,95,85,0.1)', link: '#7A7068',
    muted: '#A8A098', text: '#2A2622', chipColor: '#3E3830', chipBorder: '#C8BEB4' },
  { hour: 12, bg: '#EAE4D8',
    g1: 'rgba(215,190,145,0.38)', g1w: 200, g1h: 150, g1f: 44,
    g2: 'rgba(205,175,135,0.25)', g2w: 155, g2h: 115, g2f: 50,
    g3: 'rgba(220,195,155,0.22)', g3w: 130, g3h: 95,  g3f: 38,
    g4: 'rgba(210,185,150,0.15)', g4w: 175, g4h: 85,  g4f: 54,
    wash: 'radial-gradient(ellipse 120% 100% at 50% -10%,rgba(210,185,145,0.3) 0%,rgba(205,180,140,0.12) 35%,rgba(200,178,148,0.04) 60%,transparent 85%)',
    bean: '#2C2926', roast: '#6E685E', metaValue: '#5E4E3E', metaDivider: '#CAC4BA',
    noteBg: '#F0ECE2', noteBorder: '#CC7454', noteTitle: '#BA5C3A', noteBody: '#403C38', noteDate: '#AAA49E',
    cardBg: '#F0ECE2', cardBorder: 'rgba(107,95,85,0.08)', link: '#7A7570',
    muted: '#AAA49E', text: '#2C2926', chipColor: '#403C38', chipBorder: '#CCC6BE' },
  { hour: 15, bg: '#E6DED2',
    g1: 'rgba(200,172,125,0.42)', g1w: 205, g1h: 155, g1f: 43,
    g2: 'rgba(190,160,115,0.28)', g2w: 160, g2h: 118, g2f: 48,
    g3: 'rgba(205,175,130,0.24)', g3w: 135, g3h: 100, g3f: 37,
    g4: 'rgba(195,165,125,0.16)', g4w: 180, g4h: 88,  g4f: 52,
    wash: 'radial-gradient(ellipse 120% 100% at 48% -10%,rgba(195,168,125,0.32) 0%,rgba(190,162,120,0.14) 35%,rgba(185,160,130,0.05) 60%,transparent 85%)',
    bean: '#2C2926', roast: '#6A6258', metaValue: '#5E4E3E', metaDivider: '#C6BEB4',
    noteBg: '#EEE8DE', noteBorder: '#C06848', noteTitle: '#B05535', noteBody: '#3E3830', noteDate: '#A6A098',
    cardBg: '#EEE8DE', cardBorder: 'rgba(107,95,85,0.1)', link: '#787068',
    muted: '#A6A098', text: '#2A2622', chipColor: '#3E3830', chipBorder: '#C6BEB4' },
  { hour: 18, bg: '#E0D0B8',
    g1: 'rgba(228,155,30,0.6)',  g1w: 230, g1h: 180, g1f: 40,
    g2: 'rgba(215,125,35,0.4)',  g2w: 180, g2h: 135, g2f: 45,
    g3: 'rgba(235,168,45,0.32)', g3w: 150, g3h: 115, g3f: 35,
    g4: 'rgba(210,135,40,0.22)', g4w: 200, g4h: 95,  g4f: 50,
    wash: 'radial-gradient(ellipse 140% 100% at 52% -10%,rgba(222,148,35,0.5) 0%,rgba(215,138,40,0.24) 35%,rgba(208,155,80,0.08) 60%,transparent 85%)',
    bean: '#302520', roast: '#6A5440', metaValue: '#644828', metaDivider: '#C4B098',
    noteBg: '#EEE4D0', noteBorder: '#B87048', noteTitle: '#A44E2C', noteBody: '#4A3A28', noteDate: '#9E8E78',
    cardBg: '#EEE4D0', cardBorder: 'rgba(107,95,85,0.12)', link: '#786848',
    muted: '#9E8E78', text: '#282018', chipColor: '#4A3A28', chipBorder: '#C4B498' },
  { hour: 20, bg: '#D6CEC4',
    g1: 'rgba(140,105,110,0.45)', g1w: 210, g1h: 165, g1f: 43,
    g2: 'rgba(155,118,100,0.3)',  g2w: 165, g2h: 125, g2f: 48,
    g3: 'rgba(130,98,108,0.26)',  g3w: 135, g3h: 105, g3f: 38,
    g4: 'rgba(150,125,112,0.18)', g4w: 185, g4h: 90,  g4f: 52,
    wash: 'radial-gradient(ellipse 120% 100% at 46% -10%,rgba(130,100,105,0.38) 0%,rgba(140,112,100,0.16) 35%,rgba(150,128,115,0.05) 60%,transparent 85%)',
    bean: '#302520', roast: '#685E56', metaValue: '#5E5040', metaDivider: '#B8AEA4',
    noteBg: '#E0DAD0', noteBorder: '#A07058', noteTitle: '#8C5440', noteBody: '#4A4038', noteDate: '#948C84',
    cardBg: '#E0DAD0', cardBorder: 'rgba(107,95,85,0.12)', link: '#706660',
    muted: '#948C84', text: '#262220', chipColor: '#4A4038', chipBorder: '#B8AEA4' },
]

// Hex ↔ RGB helpers for smooth color interpolation
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
const lerpHex = (a, b, t) => {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t)
  )
}
const lerpNum = (a, b, t) => Math.round(a + (b - a) * t)

export function getTimeOfDayTheme() {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60
  const last = TOD_ANCHORS.length - 1

  // Find bracketing anchors
  let lo, hi, t
  if (h >= TOD_ANCHORS[last].hour || h < TOD_ANCHORS[0].hour) {
    // After last anchor or before first — snap to nearest edge
    lo = TOD_ANCHORS[last]
    hi = TOD_ANCHORS[0]
    t = 0
  } else {
    for (let i = 0; i < last; i++) {
      if (h >= TOD_ANCHORS[i].hour && h < TOD_ANCHORS[i + 1].hour) {
        lo = TOD_ANCHORS[i]
        hi = TOD_ANCHORS[i + 1]
        t = (h - lo.hour) / (hi.hour - lo.hour)
        break
      }
    }
  }

  // Interpolate hex colors
  const lerped = {}
  const hexKeys = ['bg', 'bean', 'roast', 'metaValue', 'metaDivider', 'noteBg', 'noteBorder',
                    'noteTitle', 'noteBody', 'noteDate', 'cardBg', 'link', 'muted', 'text',
                    'chipColor', 'chipBorder']
  for (const k of hexKeys) {
    if (lo[k] && hi[k] && lo[k][0] === '#' && hi[k][0] === '#') {
      lerped[k] = lerpHex(lo[k], hi[k], t)
    } else {
      lerped[k] = lo[k]
    }
  }

  // For non-hex values (rgba strings, gradients), snap to nearest anchor
  const snap = t < 0.5 ? lo : hi
  lerped.wash = snap.wash
  lerped.cardBorder = snap.cardBorder

  // Glow blobs — snap rgba, lerp dimensions
  for (const k of ['g1','g2','g3','g4']) {
    lerped[k] = snap[k]
    lerped[k + 'w'] = lerpNum(lo[k + 'w'], hi[k + 'w'], t)
    lerped[k + 'h'] = lerpNum(lo[k + 'h'], hi[k + 'h'], t)
    lerped[k + 'f'] = lerpNum(lo[k + 'f'], hi[k + 'f'], t)
  }

  return lerped
}

export const GRAIN_SVG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// CTA accent color — matches crema-500 in tailwind.config.js
export const ACCENT = '#C15F3C'
export const ACCENT_BG_ACTIVE = 'rgba(193,95,60,0.08)'

// Section divider color used inside recipe card
export const SECTION_BORDER = 'rgba(107,95,85,0.05)'

// Glow blob positions for the atmospheric layer
export const GLOW_POSITIONS = [
  { top: '18%', left: '48%', animation: 'animate-blob-drift-1' },
  { top: '22%', left: '55%', animation: 'animate-blob-drift-2' },
  { top: '14%', left: '40%', animation: 'animate-blob-drift-3' },
  { top: '26%', left: '52%', animation: 'animate-blob-drift-4' },
]
