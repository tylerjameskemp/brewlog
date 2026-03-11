# Grinder Calibration Research

**Date:** 2026-03-11
**Related:** [Recipe Import Brainstorm](./2026-03-11-feat-recipe-import-brainstorm.md)

---

## Qualitative Tier Definitions (approximate micron targets)

| Tier | Approx. Microns | Typical Use |
|------|-----------------|-------------|
| Extra Fine | 100-300 | Turkish, fine espresso |
| Fine | 300-500 | Espresso, Moka pot |
| Medium-Fine | 500-700 | V60, pour-over sweet spot |
| Medium | 700-850 | Batch drip, Chemex, siphon |
| Medium-Coarse | 850-1000 | Chemex (large), steep-and-release |
| Coarse | 1000+ | French press, cold brew |

---

## 1. Fellow Ode Gen 1 -- Stock Flat Burrs

**Notation:** Dial numbers 1-11, with sub-positions (e.g., 3-2 = dial 3, second click past 3). 31 total steps.
**Micron range:** 550-1400 microns. Cannot reach espresso or Turkish.
**Microns/step:** ~27 microns per click.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | N/A | NO | Floor is ~550 microns |
| Fine | N/A | NO | Cannot grind fine enough |
| Medium-Fine | 1 - 2-2 | YES (barely) | V60 range per Fellow. Light roasts often under-extract here |
| Medium | 2-2 - 5 | YES | Siphon, standard drip |
| Medium-Coarse | 5 - 7 | YES | Chemex, steep-and-release |
| Coarse | 7 - 11 | YES | French press, cold brew |

**Critical notes:**
- Stock Gen 1 burrs are widely criticized as too coarse for light roasts on V60. The ~550-micron floor means the "medium-fine" range is narrow and barely reaches pour-over territory.
- Most serious V60 users upgrade to SSP burrs or buy the Gen 2.

### Fellow Ode Gen 1 -- SSP Multi-Purpose (MP) Burrs

**Calibration:** After installing SSP burrs, set zero by touching burrs, then 5 clicks clockwise = position 1.
**Micron range:** ~200-1400 microns (SSP opens up the fine end significantly).

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 1 - 2 | YES | Can reach near-espresso |
| Fine | 2 - 3 | YES | |
| Medium-Fine | 3 - 5 | YES | V60 sweet spot. Users report 4-6 for light roasts |
| Medium | 5 - 7 | YES | |
| Medium-Coarse | 7 - 9 | YES | |
| Coarse | 9 - 11 | YES | |

**Notes:** SSP MP burrs produce a balanced cup with some body. Community consensus starting point for V60: ~setting 5-7. Requires 5-10 lbs break-in.

### Fellow Ode Gen 1 -- SSP Unimodal Burrs

Similar range to MP but produces a very tight particle distribution -- extremely clean, tea-like cups. Settings run ~1 notch finer than MP for equivalent extraction due to fewer fines. V60 sweet spot around 4-6.

### Fellow Ode Gen 1 -- SSP High Uniformity (HU) Burrs

The most clarity-focused SSP option. Even tighter distribution than Unimodal. Tends to run slightly coarser than MP for equivalent extraction. V60 sweet spot around 5-7. Best for light roasts where clarity is paramount.

---

## 2. Fellow Ode Gen 2 -- Stock Burrs (Fellow-designed)

**Notation:** Same dial system as Gen 1. Numbers 1-11 with sub-positions. 31 total steps.
**Micron range:** 275-1160 microns. Reaches espresso range (barely).
**Microns/step:** ~25 microns per click.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 1 - 1-2 | Marginal | Can technically reach ~275 microns but not true espresso quality |
| Fine | 1-2 - 2 | YES | Moka pot range |
| Medium-Fine | 2-2 - 5-2 | YES | V60 recommended range per Fellow. Sweet spot ~3-4 for light, ~5 for dark |
| Medium | 5-2 - 7 | YES | Drip, siphon |
| Medium-Coarse | 7 - 9 | YES | Chemex, steep-and-release |
| Coarse | 9 - 11 | YES | French press, cold brew |

**Critical notes:**
- Major improvement over Gen 1 stock burrs. The fine end drops from ~550 to ~275 microns.
- Community reports: V60 settings typically 3-5 for light roasts, 5-6 for medium, 7-8 for dark.
- Fellow's official guide: V60 = settings 2-2 to 5-2.
- SSP burrs are considered a "sidegrade" rather than an upgrade on Gen 2 -- the stock burrs are already quite good for filter brewing.

---

## 3. Baratza Encore -- Stock M2 Conical Burrs

**Notation:** Numbered dial 1-40. Stepless macro ring under hopper for micro-adjustment.
**Micron range:** 250-1200 microns.
**Microns/step:** ~24 microns per step.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 1-3 | Marginal | Turkish-adjacent but inconsistent |
| Fine | 4-9 | YES | Espresso range but not recommended -- too inconsistent |
| Medium-Fine | 10-18 | YES | V60 sweet spot = 13-15 (light), 15-18 (dark) |
| Medium | 19-25 | YES | Drip machines, Chemex |
| Medium-Coarse | 26-32 | YES | Large Chemex, steep-and-release |
| Coarse | 33-40 | YES | French press, cold brew |

**Critical notes:**
- NOT an espresso grinder despite reaching fine settings. Particle distribution at settings 1-9 is too inconsistent.
- V60 consensus: start at 15, go finer (13-14) for light roasts, coarser (17-18) for dark.
- Upgrading to Virtuoso M3 burrs is a cheap mod (~$15) that improves consistency.

---

## 4. Baratza Encore ESP -- Stock Burrs

**Notation:** Numbered dial 0-40. Dual-range system: settings 1-20 are micro adjustments (20 microns/click), settings 21-40 are macro adjustments (90 microns/click).
**Micron range:** 230-1380 microns.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 0-5 | YES | Designed for espresso -- micro adjustments here |
| Fine | 5-13 | YES | Fine espresso tuning with 20-micron steps |
| Medium-Fine | 15-22 | YES | V60 range. Crosses from micro to macro zone at 20 |
| Medium | 22-27 | YES | Drip, siphon (macro steps = 90 microns each) |
| Medium-Coarse | 27-33 | YES | Chemex, cupping |
| Coarse | 33-40 | YES | French press, cold brew |

**Critical notes:**
- Dual-range system: 20 microns/click for 1-20, 90 microns/click for 21-40.
- V60 range (15-25) straddles the micro/macro boundary.

---

## 5. Comandante C40 MK3 -- Stock Burrs

**Notation:** Clicks from zero (fully closed). 12 clicks per full rotation. ~35 total usable clicks.
**Micron range:** 0-1090 microns.
**Microns/click:** ~30 microns per click.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 2-6 | YES | Turkish |
| Fine | 7-13 | YES | Espresso |
| Medium-Fine | 15-25 | YES | V60 sweet spot. Community consensus: 20-25 clicks |
| Medium | 20-28 | YES | Drip, siphon |
| Medium-Coarse | 26-34 | YES | Chemex, French press |
| Coarse | 30-40 | YES | Cold brew |

### Comandante C40 MK3 -- with Red Clix

**Notation:** 24 clicks per rotation (doubled). ~70 total usable clicks.
**Microns/click:** ~15 microns per click.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 3-12 | YES | |
| Fine | 14-27 | YES | Espresso |
| Medium-Fine | 30-51 | YES | V60 range |
| Medium | 40-58 | YES | |
| Medium-Coarse | 51-68 | YES | |
| Coarse | 59-80 | YES | French press, cold brew |

**Notes:** Red Clix doubles resolution. Multiply standard click settings by ~2 for Red Clix equivalents.

---

## 6. Comandante C40 MK4

**Burrs and click system are identical to MK3.** MK4 improvements are ergonomic only (redesigned bean-loading arms, different catch cups). No grind quality difference. All MK3 accessories (including Red Clix) fit MK4.

Use MK3 tables above for all MK4 settings.

---

## 7. Timemore C2 / C2 Max -- Stock Burrs

**Notation:** Clicks from zero (fully closed).
**Micron range:** 0-950 microns.
**Microns/click:** ~80 microns per click (coarse resolution).

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 2-6 | Marginal | Avoid below 6 clicks -- can dull burrs |
| Fine | 6-12 | YES | Espresso range (inconsistent) |
| Medium-Fine | 13-18 | YES | V60 sweet spot. 1-cup (15g): ~18 clicks; 2-cup (30g): ~22 |
| Medium | 18-22 | YES | Drip, Chemex |
| Medium-Coarse | 22-26 | YES | Steep-and-release, cupping |
| Coarse | 26-30 | YES | French press, cold brew |

**Critical notes:**
- C2 and C2 Max have identical burrs and click system. Max just has larger capacity.
- ~80 microns/click means a single click meaningfully changes your brew. Main limitation for V60 dialing.
- Do not use below 6 clicks -- can dull the stainless steel burrs.

---

## 8. 1Zpresso JX -- Stock Burrs

**Notation:** Rotation.Number.Tick (e.g., 1.3.2). 10 numbers and 30 clicks per rotation. ~4 rotations total.
**Micron range:** 0-1080 microns.
**Microns/click:** ~9 microns per click (very fine resolution).

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 0.1.2 - 0.8.0 | YES | Turkish |
| Fine | 0.6.2 - 1.4.0 | YES | Not ideal for espresso (filter-focused) |
| Medium-Fine | 1.5.0 - 2.5.2 | YES | V60 sweet spot |
| Medium | 2.0.0 - 3.0.0 | YES | Drip, siphon |
| Medium-Coarse | 2.5.2 - 3.5.1 | YES | Steep-and-release |
| Coarse | 3.0.0 - 4.0.0 | YES | French press, cold brew |

---

## 9. 1Zpresso JX-Pro -- Stock Burrs

**Notation:** Rotation.Number.Tick. 10 numbers and 40 clicks per rotation (~12.5 microns/click). ~5 rotations total.
**Micron range:** 0-915 microns.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 0.2.1 - 1.0.0 | YES | Turkish |
| Fine | 1.0.0 - 2.0.3 | YES | Espresso -- Pro's primary advantage over JX |
| Medium-Fine | 2.2.0 - 3.8.1 | YES | V60 sweet spot |
| Medium | 3.0.0 - 4.3.0 | YES | Drip, siphon |
| Medium-Coarse | 3.8.0 - 4.6.0 | YES | Chemex, cupping |
| Coarse | 4.3.3 - 5.0.0 | YES | French press, cold brew |

---

## 10. 1Zpresso J-Max -- Stock Burrs

**Notation:** Rotation.Number.Tick. 90 clicks per rotation (~8.8 microns/click). ~4.5 rotations total (400 clicks max).
**Micron range:** 0-1190 microns.

| Tier | Setting Range | Reachable? | Notes |
|------|--------------|------------|-------|
| Extra Fine | 0.1.6 - 0.8.3 | YES | Turkish |
| Fine | 0.6.9 - 1.5.3 | YES | Espresso |
| Medium-Fine | 1.6.2 - 2.8.4 | YES | V60 sweet spot |
| Medium | 2.5.0 - 3.5.0 | YES | Drip, siphon |
| Medium-Coarse | 3.3.3 - 4.0.0 | YES | Cupping, steep-and-release |
| Coarse | 3.5.0 - 5.0.0 | YES | French press, cold brew |

**Notes:** 8.8 microns/click = finest adjustment resolution of any grinder in this list. Best all-rounder for espresso + filter.

---

## Popular Aftermarket Burr Upgrades

### Fellow Ode (Gen 1 and Gen 2)
- **SSP Multi-Purpose (MP)** -- Most popular. Balanced sweetness/clarity. Fellow now sells these directly.
- **SSP Unimodal** -- Maximum clarity, tea-like cups. Tight particle distribution.
- **SSP High Uniformity (HU)** -- Even tighter than Unimodal. Best for light roasts.
- **SSP Lab Sweet** -- Maximum sweetness, wider distribution. Good for medium roasts.
- **Italmill burrs** -- Budget SSP alternative.

### Baratza Encore
- **Virtuoso M3 burrs** -- Drop-in conical replacement (~$15). Most common Encore mod.

### Comandante C40 (MK3/MK4)
- **Red Clix** -- Doubles click resolution. Not a burr swap but an adjustment mechanism replacement. Only widely used upgrade.

### Timemore C2 / 1Zpresso
- No widely available aftermarket burr upgrades. Upgrade path is buying a higher model.

---

## Notable Grinders Not Yet Supported (consider adding)

1. **Baratza Virtuoso+** -- Encore's upmarket sibling. M3 burrs, built-in timer. Settings ~2 finer than Encore.
2. **Timemore Sculptor 064/078** -- Electric single-dose, flat burrs. Increasingly popular.
3. **DF64 (Turin) Gen 2 / V4** -- 64mm flat burr single-dose. Accepts SSP burrs. Very popular all-rounder.
4. **1Zpresso K-Ultra / K-Max / K-Plus** -- Premium hand grinders with larger 48mm burrs.
5. **Niche Zero** -- 63mm conical single-dose. Popular but more espresso-focused.
6. **Lagom P64 / P100** -- Premium reference-grade flat burr electrics.

---

## Reliable Sources

**Tier 1 -- Most Reliable:**
- Manufacturer documentation (Fellow, 1Zpresso, Baratza)
- Honest Coffee Guide (honestcoffeeguide.com) -- Aggregated charts for 100+ grinders
- Coffee ad Astra (coffeeadastra.com) -- Scientific particle size distribution analysis

**Tier 2 -- Expert Reviewers:**
- James Hoffmann (YouTube)
- Lance Hedrick (YouTube)
- Coffee Chronicler (coffeechronicler.com)

**Tier 3 -- Community:**
- Reddit r/pourover, r/Coffee
- Home-Barista.com forums
