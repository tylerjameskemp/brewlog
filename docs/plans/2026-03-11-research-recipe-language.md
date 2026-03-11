# Recipe Language Patterns Research

**Date:** 2026-03-11
**Related:** [Recipe Import Brainstorm](./2026-03-11-feat-recipe-import-brainstorm.md)

---

## How Recipe Parameters Are Specified Across Sources

### Brew Method
- Named: "V60", "Chemex", "AeroPress", "French Press", "Kalita Wave"
- Sometimes includes technique: "4:6 method", "Hoffmann method", "inverted"
- Equipment-specific: "Hario V60 02", "Stagg [X]", "Stagg XF"

### Dose (Coffee Amount)
| Format | Example | Frequency |
|--------|---------|-----------|
| Grams (exact) | "30g", "20 grams" | Very common |
| Grams (range) | "23-25g" | Occasional |
| Scoops | "3 tablespoons" | Rare (consumer blogs) |
| Ratio-derived | "1:16 with 500ml water" (implies 31.25g) | Occasional |

### Water Amount
| Format | Example | Frequency |
|--------|---------|-----------|
| Grams | "500g" | Very common |
| Milliliters | "500ml" | Common (interchangeable with grams) |
| Ounces | "16 oz" | Rare (US consumer) |
| Ratio only | "1:16" (derive from dose) | Occasional |

### Ratio
| Format | Example | Frequency |
|--------|---------|-----------|
| 1:N | "1:16", "1:17" | Very common |
| N:N | "3:50", "60g/litre" | Rare (Hoffmann) |
| Range | "1:15 to 1:17" | Occasional |

### Grind Size
| Format | Example | Frequency |
|--------|---------|-----------|
| Qualitative | "medium-fine", "coarse" | Very common |
| Comparisons | "finer than table salt", "like kosher salt" | Common |
| Grinder clicks | "Comandante 24 clicks" | Common (enthusiast) |
| Grinder setting | "Ode 1.2", "Opus 6-7" | Common (Fellow ecosystem) |
| Multiple grinders | "Ode SSP: 5.1-6.1, Gen 2: 4.1-5.1" | Common (Fellow Drops) |
| Microns | "600-800 microns" | Rare |

### Temperature
| Format | Example | Frequency |
|--------|---------|-----------|
| Celsius | "93C", "93 degrees C" | Common |
| Fahrenheit | "205F", "205 degrees F" | Common |
| Both | "93C / 200F" | Occasional |
| Qualitative | "just off boil", "boiling" | Common (casual) |
| Range | "195-205F" | Occasional |
| Roast-dependent | "93C light, 88C medium, 83C dark" | Rare |

### Pour Steps

Two fundamentally different water conventions:
- **Cumulative** (most common): "Pour to 200g", "bloom 60g, then to 300g"
- **Per-pour/additive** (less common): "Pour 60g five times" (Kasuya 4:6)

Step fields observed across sources:
| Field | Example | Frequency |
|-------|---------|-----------|
| Name/label | "Bloom", "Pour 1", "First Pour" | Very common |
| Water target (cumulative) | "to 300g" | Very common |
| Water amount (additive) | "pour 60g" | Common |
| Duration | "30 seconds", "30s" | Very common |
| Start time | "at 0:45", "at 1:20" | Common |
| Action type | "pour", "swirl", "stir", "wait", "bloom" | Common |
| Pour description | "slow concentric circles" | Occasional |

### Brew Time
| Format | Example | Frequency |
|--------|---------|-----------|
| Exact | "3:30" | Common |
| Range | "2:30-3:00", "3:00 to 3:30" | Very common |
| Approximate | "about 3 minutes" | Occasional |

---

## Field Presence Across Sources

**Always present (required):**
- Brew method name
- Coffee amount (grams)
- Water amount (grams/ml)
- Grind size (at least qualitative)
- At least one step or instruction

**Usually present:**
- Water temperature
- Total/target brew time
- Ratio
- Bloom step with water amount and duration

**Sometimes present:**
- Specific grinder settings
- Filter type
- Dripper model
- Number of servings

**Rarely present but useful:**
- TDS / extraction yield
- Bean origin/process
- Roast date freshness window
- Flavor notes / tasting expectations
- "What to adjust" guidance

---

## Real Recipe Examples by Source

### James Hoffmann Ultimate V60
- 30g coffee, 500g water, ratio "60g/litre"
- Grind: "Medium fine" (no grinder-specific)
- Temp: 100C / 212F (boiling)
- Target: 3:30
- Steps: Bloom 60g for 45s, pour to 300g by 1:15, pour to 500g by 1:45, stir, swirl, drawdown
- Includes non-pour actions: swirl, stir

### Tetsu Kasuya 4:6 Method
- 20g coffee, 300g water, ratio 1:15
- Grind: "coarse, similar to French Press"
- Temp: varies by roast (93C light, 88C medium, 83C dark)
- Steps: 5 equal pours of 60g each (PER-POUR, not cumulative)
- Target: ~3:30

### Fellow Drops Recipe Cards
Structured card format with:
- Coffee weight (range: "23-25g")
- Water weight + temp ("390-400g at 206F")
- Grind: **multiple grinder models** (Ode SSP: 6-7, Ode Gen 2: 5-6, Gen 1: 3-4, Opus: 7-8)
- Brew time range ("3:15-3:45")
- Dripper named
- Numbered pours with cumulative water targets

### George Howell Coffee
- **Multiple grinder-specific settings** in a single recipe
- Ode SSP: 5.1-6.1, Ode Gen 2: 4.1-5.1, Opus: 6-7

### Reddit/Forum Format
```
20g coffee : 320g water (1:16)
Medium-fine grind (Comandante ~24 clicks)
Water: 96C
Bloom: 60g, 30-45s
Pour 1: to 200g
Pour 2: to 320g
Total time: ~3:00
```

### ChatGPT-Generated Recipes
- Ratio as "1:16", grind as qualitative ("medium-fine")
- Temperature exact with unit ("205F")
- Steps as prose paragraphs, not structured data
- Rarely includes grinder-specific settings
- Often includes equipment list

---

## Common Recipe "Shapes" by Method

### V60 (cone dripper)
- 3-5 steps: bloom + 2-4 pours
- Ratio: 1:15 to 1:17
- Grind: medium-fine
- Temp: 90-100C
- Time: 2:30-3:30
- Actions include: swirl, stir, wait for drawdown

### Chemex
- 3-4 steps: bloom + 2-3 pours
- Ratio: 1:15 to 1:17
- Grind: medium-coarse (coarser than V60 due to thicker filter)
- Temp: 200F / 93C
- Time: 4:00-5:00

### AeroPress
- 3-4 steps: add water, steep, press
- Ratio: 1:14 to 1:17 (wider variation)
- Grind: fine to medium
- Temp: 175-205F (wider range, often lower)
- Time: 1:30-3:00
- Unique: "inverted" or "standard" orientation, press duration

### French Press
- 2-3 steps: pour, steep, plunge
- Ratio: 1:15 to 1:17
- Grind: coarse
- Temp: 200F / 93C
- Time: 4:00 (Hoffmann method: 9+ minutes)
- No per-step water amounts (single pour immersion)

---

## Existing Schemas and Standards

**No coffee-specific recipe schema exists.** Schema.org/Recipe is for cooking and maps poorly to coffee (no concept of ratio, grind, pour steps).

### Timer.Coffee (open source)
- Fields: `coffeeAmount`, `waterAmount`, `waterTemp`, `grindSize`, `brewTime`
- Steps: `description` (string) + `time` (Duration) -- no per-step water amount
- Water distribution embedded in description strings

### Beanconqueror (open source)
- 27+ brew parameters including `grind_size`, `grind_weight`, `mill`, `mill_speed`
- No structured step model -- focuses on recording outcomes, not guiding steps

---

## Proposed Extraction Schema

```json
{
  "method": "v60",
  "methodVariant": "4:6 method",
  "sourceName": "James Hoffmann",

  "coffeeGrams": 30,
  "waterGrams": 500,
  "ratio": "1:16",
  "grindSize": "medium-fine",
  "grindSizeQualitative": "medium-fine",

  "waterTempC": 93,
  "waterTempF": 200,

  "targetTime": "3:30",
  "targetTimeSeconds": 210,
  "targetTimeMinSeconds": 180,
  "targetTimeMaxSeconds": 210,

  "steps": [
    {
      "order": 1,
      "name": "Bloom",
      "action": "bloom",
      "waterTo": 60,
      "waterAdd": 60,
      "startTimeSeconds": 0,
      "durationSeconds": 45,
      "note": "Gentle spiral pour, let degas"
    }
  ],

  "dripper": "V60 02",
  "filterType": "paper",
  "grinder": "Comandante C40",
  "grinderSetting": "24 clicks",
  "roastLevel": "light",

  "rawText": "original pasted text",
  "confidence": 0.85
}
```

### Key Design Decisions
1. Store BOTH `waterTo` (cumulative) and `waterAdd` (additive) -- recipes use both conventions. Derive the missing one.
2. Store grind as free text AND qualitative tier -- grinder-specific settings are too variable to normalize.
3. Temperature in both C and F; convert when only one is given.
4. Steps must support non-pour actions (swirl, stir, wait).
5. Always preserve `rawText` -- no parser is perfect.

### Parsing Difficulty Ranking
- **Easy:** dose, water amount, ratio, temperature (numeric with units)
- **Medium:** grind size, brew time, step water amounts (multiple formats)
- **Hard:** step boundaries, step naming, cumulative vs additive disambiguation
- **Very hard:** prose-format recipes with no clear step structure
