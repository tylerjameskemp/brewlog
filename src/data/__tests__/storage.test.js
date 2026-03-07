import { describe, it, expect } from 'vitest'
import {
  getBrews,
  saveBrew,
  updateBrew,
  deleteBrew,
  getBeans,
  saveBean,
  deduplicateBeans,
  renameBrewBean,
  getLastBrewOfBean,
  normalizeSteps,
  migrateBloomToSteps,
  migrateGrindSettings,
  getActiveBrew,
  saveActiveBrew,
  clearActiveBrew,
  computeTimeStatus,
  exportData,
  importData,
  mergeData,
  getEquipment,
  saveEquipment,
  getPourTemplates,
  parseFlexTime,
} from '../storage'

// --- Brew CRUD ---

describe('saveBrew / getBrews', () => {
  it('saves and retrieves a brew', () => {
    const brew = { id: 'b1', beanName: 'Test Bean', brewedAt: '2026-03-01T10:00:00Z' }
    saveBrew(brew)
    const brews = getBrews()
    expect(brews).toHaveLength(1)
    expect(brews[0].id).toBe('b1')
    expect(brews[0].beanName).toBe('Test Bean')
  })

  it('returns brews sorted by brewedAt descending', () => {
    saveBrew({ id: 'old', beanName: 'Old', brewedAt: '2026-01-01T00:00:00Z' })
    saveBrew({ id: 'new', beanName: 'New', brewedAt: '2026-03-01T00:00:00Z' })
    saveBrew({ id: 'mid', beanName: 'Mid', brewedAt: '2026-02-01T00:00:00Z' })
    const brews = getBrews()
    expect(brews.map(b => b.id)).toEqual(['new', 'mid', 'old'])
  })

  it('returns empty array when no brews exist', () => {
    expect(getBrews()).toEqual([])
  })
})

describe('updateBrew', () => {
  it('updates specified fields and preserves others', () => {
    saveBrew({
      id: 'b1',
      beanName: 'Test',
      grindSetting: '6-1',
      rating: 3,
      notes: 'good',
      stepResults: { '1': { tappedAt: 42 } },
      brewedAt: '2026-03-01T10:00:00Z',
    })

    updateBrew('b1', { rating: 5 })

    const brews = getBrews()
    expect(brews[0].rating).toBe(5)
    expect(brews[0].beanName).toBe('Test')
    expect(brews[0].grindSetting).toBe('6-1')
    expect(brews[0].notes).toBe('good')
    expect(brews[0].stepResults).toEqual({ '1': { tappedAt: 42 } })
  })

  it('does nothing for non-existent id', () => {
    saveBrew({ id: 'b1', beanName: 'Test', brewedAt: '2026-03-01T10:00:00Z' })
    updateBrew('nonexistent', { rating: 5 })
    const brews = getBrews()
    expect(brews).toHaveLength(1)
    expect(brews[0].rating).toBeUndefined()
  })
})

describe('deleteBrew', () => {
  it('removes a brew by id', () => {
    saveBrew({ id: 'b1', beanName: 'A', brewedAt: '2026-03-01T10:00:00Z' })
    saveBrew({ id: 'b2', beanName: 'B', brewedAt: '2026-03-02T10:00:00Z' })
    deleteBrew('b1')
    const brews = getBrews()
    expect(brews).toHaveLength(1)
    expect(brews[0].id).toBe('b2')
  })
})

// --- Bean CRUD ---

describe('saveBean', () => {
  it('saves a new bean', () => {
    saveBean({ id: 'bean1', name: 'Heart Colombia' })
    expect(getBeans()).toHaveLength(1)
  })

  it('skips duplicate bean names (case-insensitive)', () => {
    saveBean({ id: 'bean1', name: 'Heart Colombia' })
    saveBean({ id: 'bean2', name: 'heart colombia' })
    expect(getBeans()).toHaveLength(1)
  })

  it('skips duplicate bean names with extra whitespace', () => {
    saveBean({ id: 'bean1', name: 'Heart Colombia' })
    saveBean({ id: 'bean2', name: '  Heart Colombia  ' })
    expect(getBeans()).toHaveLength(1)
  })
})

describe('deduplicateBeans', () => {
  it('removes duplicate beans by normalized name', () => {
    // Directly write beans to bypass saveBean's dedup
    const beans = [
      { id: '1', name: 'Heart Colombia' },
      { id: '2', name: 'heart colombia' },
      { id: '3', name: 'Onyx Ethiopia' },
    ]
    localStorage.setItem('brewlog_beans', JSON.stringify(beans))

    const result = deduplicateBeans()
    expect(result).toHaveLength(2)
    expect(result.map(b => b.name)).toContain('Heart Colombia')
    expect(result.map(b => b.name)).toContain('Onyx Ethiopia')
  })

  it('is a no-op when there are no duplicates', () => {
    saveBean({ id: '1', name: 'Heart Colombia' })
    saveBean({ id: '2', name: 'Onyx Ethiopia' })
    const before = getBeans()
    deduplicateBeans()
    const after = getBeans()
    expect(after).toEqual(before)
  })
})

describe('renameBrewBean', () => {
  it('updates beanName on all matching brews', () => {
    saveBrew({ id: 'b1', beanName: 'Old Name', brewedAt: '2026-03-01T10:00:00Z' })
    saveBrew({ id: 'b2', beanName: 'Old Name', brewedAt: '2026-03-02T10:00:00Z' })
    saveBrew({ id: 'b3', beanName: 'Other Bean', brewedAt: '2026-03-03T10:00:00Z' })

    renameBrewBean('Old Name', 'New Name')

    const brews = getBrews()
    expect(brews.find(b => b.id === 'b1').beanName).toBe('New Name')
    expect(brews.find(b => b.id === 'b2').beanName).toBe('New Name')
    expect(brews.find(b => b.id === 'b3').beanName).toBe('Other Bean')
  })

  it('handles case-insensitive matching on old name', () => {
    saveBrew({ id: 'b1', beanName: 'heart colombia', brewedAt: '2026-03-01T10:00:00Z' })
    renameBrewBean('Heart Colombia', 'Heart Colombia Javier')
    const brews = getBrews()
    expect(brews[0].beanName).toBe('Heart Colombia Javier')
  })
})

// --- Pre-fill ---

describe('getLastBrewOfBean', () => {
  it('returns the most recent brew for a specific bean', () => {
    saveBrew({ id: 'b1', beanName: 'Heart Colombia', brewedAt: '2026-01-01T00:00:00Z' })
    saveBrew({ id: 'b2', beanName: 'Heart Colombia', brewedAt: '2026-03-01T00:00:00Z' })
    saveBrew({ id: 'b3', beanName: 'Onyx Ethiopia', brewedAt: '2026-03-02T00:00:00Z' })

    const result = getLastBrewOfBean('Heart Colombia')
    expect(result.id).toBe('b2')
  })

  it('matches case-insensitively', () => {
    saveBrew({ id: 'b1', beanName: 'Heart Colombia', brewedAt: '2026-03-01T00:00:00Z' })
    expect(getLastBrewOfBean('heart colombia').id).toBe('b1')
    expect(getLastBrewOfBean('HEART COLOMBIA').id).toBe('b1')
  })

  it('trims whitespace in lookup', () => {
    saveBrew({ id: 'b1', beanName: 'Heart Colombia', brewedAt: '2026-03-01T00:00:00Z' })
    expect(getLastBrewOfBean('  Heart Colombia  ').id).toBe('b1')
  })

  it('returns null for empty or missing name', () => {
    expect(getLastBrewOfBean('')).toBeNull()
    expect(getLastBrewOfBean(null)).toBeNull()
    expect(getLastBrewOfBean(undefined)).toBeNull()
  })

  it('returns null when no brews match', () => {
    saveBrew({ id: 'b1', beanName: 'Heart Colombia', brewedAt: '2026-03-01T00:00:00Z' })
    expect(getLastBrewOfBean('Onyx Ethiopia')).toBeNull()
  })
})

// --- normalizeSteps ---

describe('normalizeSteps', () => {
  it('converts legacy format to new format', () => {
    const legacy = [
      { label: 'Bloom', startTime: 0, targetWater: 42, note: 'gentle pour' },
      { label: 'Pour 1', startTime: 40, targetWater: 160, note: '' },
      { label: 'Pour 2', startTime: 90, targetWater: 320, note: '' },
    ]

    const result = normalizeSteps(legacy)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      id: 1,
      name: 'Bloom',
      waterTo: 42,
      time: 0,
      duration: 40,
      note: 'gentle pour',
    })
    expect(result[1]).toEqual({
      id: 2,
      name: 'Pour 1',
      waterTo: 160,
      time: 40,
      duration: 50,
      note: '',
    })
    // Last step: duration estimated as startTime + 60 - startTime = 60
    expect(result[2].duration).toBe(60)
  })

  it('passes through new-format steps unchanged', () => {
    const newFormat = [
      { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: '' },
    ]
    const result = normalizeSteps(newFormat)
    expect(result).toBe(newFormat) // same reference
  })

  it('returns empty array for null/undefined/empty input', () => {
    expect(normalizeSteps(null)).toEqual([])
    expect(normalizeSteps(undefined)).toEqual([])
    expect(normalizeSteps([])).toEqual([])
  })

  it('returns empty array for non-array input', () => {
    expect(normalizeSteps('not an array')).toEqual([])
    expect(normalizeSteps(42)).toEqual([])
  })

  it('handles legacy steps with missing fields', () => {
    const legacy = [{ label: 'Bloom' }]
    const result = normalizeSteps(legacy)
    expect(result[0].name).toBe('Bloom')
    expect(result[0].waterTo).toBeNull()
    expect(result[0].time).toBe(0)
    expect(result[0].note).toBe('')
  })
})

// --- Migrations ---

describe('migrateBloomToSteps', () => {
  it('converts bloom fields to step arrays', () => {
    const brews = [
      { id: 'b1', bloomTime: 45, bloomWater: 60, actualBloomWater: 55, brewedAt: '2026-03-01T00:00:00Z' },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateBloomToSteps()

    expect(result[0].recipeSteps).toHaveLength(1)
    expect(result[0].recipeSteps[0].label).toBe('Bloom')
    expect(result[0].recipeSteps[0].targetWater).toBe(60)
    expect(result[0].steps).toHaveLength(1)
    expect(result[0].steps[0].targetWater).toBe(55) // actualBloomWater
  })

  it('is idempotent — skips brews that already have recipeSteps', () => {
    const brews = [
      {
        id: 'b1',
        bloomTime: 45,
        bloomWater: 60,
        recipeSteps: [{ label: 'Bloom', startTime: 0, targetWater: 60, note: '' }],
        brewedAt: '2026-03-01T00:00:00Z',
      },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateBloomToSteps()
    expect(result[0].recipeSteps).toHaveLength(1) // unchanged
  })

  it('skips brews with no bloom data', () => {
    const brews = [
      { id: 'b1', beanName: 'Test', brewedAt: '2026-03-01T00:00:00Z' },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateBloomToSteps()
    expect(result[0].recipeSteps).toBeUndefined()
  })
})

describe('migrateGrindSettings', () => {
  it('converts numeric Fellow Ode grind settings to notation', () => {
    const brews = [
      { id: 'b1', grinder: 'fellow-ode', grindSetting: 6.3, brewedAt: '2026-03-01T00:00:00Z' },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateGrindSettings()
    expect(result[0].grindSetting).toBe('6-1')
  })

  it('is idempotent — skips string grind settings', () => {
    const brews = [
      { id: 'b1', grinder: 'fellow-ode', grindSetting: '6-1', brewedAt: '2026-03-01T00:00:00Z' },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateGrindSettings()
    expect(result[0].grindSetting).toBe('6-1')
  })

  it('only affects Fellow Ode grinders', () => {
    const brews = [
      { id: 'b1', grinder: 'comandante', grindSetting: 24, brewedAt: '2026-03-01T00:00:00Z' },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateGrindSettings()
    expect(result[0].grindSetting).toBe(24) // unchanged
  })
})

// --- Active Brew ---

describe('active brew persistence', () => {
  it('saves and retrieves active brew state', () => {
    const state = { beanId: 'b1', beanName: 'Test', elapsed: 120 }
    saveActiveBrew(state)
    expect(getActiveBrew()).toEqual(state)
  })

  it('clears active brew state', () => {
    saveActiveBrew({ beanId: 'b1' })
    clearActiveBrew()
    expect(getActiveBrew()).toBeNull()
  })

  it('returns null when no active brew exists', () => {
    expect(getActiveBrew()).toBeNull()
  })
})

// --- parseFlexTime ---

describe('parseFlexTime', () => {
  it('parses raw seconds string', () => {
    expect(parseFlexTime('90')).toBe(90)
    expect(parseFlexTime('0')).toBe(0)
    expect(parseFlexTime('090')).toBe(90)
  })

  it('parses MM:SS format', () => {
    expect(parseFlexTime('1:30')).toBe(90)
    expect(parseFlexTime('0:00')).toBe(0)
    expect(parseFlexTime('2:00')).toBe(120)
    expect(parseFlexTime('01:30')).toBe(90)
    expect(parseFlexTime('12:30')).toBe(750)
  })

  it('parses forgiving M:S format', () => {
    expect(parseFlexTime('1:3')).toBe(63)
    expect(parseFlexTime('0:5')).toBe(5)
  })

  it('passes through valid numbers', () => {
    expect(parseFlexTime(90)).toBe(90)
    expect(parseFlexTime(0)).toBe(0)
  })

  it('returns null for invalid input', () => {
    expect(parseFlexTime(null)).toBeNull()
    expect(parseFlexTime(undefined)).toBeNull()
    expect(parseFlexTime('')).toBeNull()
    expect(parseFlexTime(':')).toBeNull()
    expect(parseFlexTime('abc')).toBeNull()
    expect(parseFlexTime('-5')).toBeNull()
    expect(parseFlexTime('1.5')).toBeNull()
    expect(parseFlexTime('1:300')).toBeNull()
  })

  it('rejects non-integer numbers', () => {
    expect(parseFlexTime(1.5)).toBeNull()
    expect(parseFlexTime(-5)).toBeNull()
    expect(parseFlexTime(Infinity)).toBeNull()
  })
})

// --- computeTimeStatus ---

describe('computeTimeStatus', () => {
  it('returns on-target when elapsed is safely within range', () => {
    const result = computeTimeStatus(185, 180, 210, null, null)
    expect(result).toEqual({ status: 'on-target', delta: 0 })
  })

  it('returns approaching when near target max', () => {
    // Range 180-210, threshold = min(15, floor(30/2)) = 15. secsLeft at 200 = 10 <= 15
    const result = computeTimeStatus(200, 180, 210, null, null)
    expect(result.status).toBe('approaching')
    expect(result.delta).toBe(10)
  })

  it('returns under when elapsed is below min', () => {
    const result = computeTimeStatus(100, 180, 210, null, null)
    expect(result).toEqual({ status: 'under', delta: 80 })
  })

  it('returns over when elapsed exceeds max', () => {
    const result = computeTimeStatus(250, 180, 210, null, null)
    expect(result).toEqual({ status: 'over', delta: 40 })
  })

  it('applies 10s tolerance when min equals max (single target)', () => {
    // Single target of 210. Tolerance = 10s, so 200-220 is the valid range.
    // Approaching threshold = min(15, floor(20/2)) = 10
    expect(computeTimeStatus(205, 210, 210, null, null)).toEqual({ status: 'on-target', delta: 0 })
    expect(computeTimeStatus(215, 210, 210, null, null).status).toBe('approaching') // near max boundary
    expect(computeTimeStatus(199, 210, 210, null, null)).toEqual({ status: 'under', delta: 11 })
    expect(computeTimeStatus(221, 210, 210, null, null)).toEqual({ status: 'over', delta: 11 })
  })

  it('falls back to targetTime when min/max are null', () => {
    const result = computeTimeStatus(205, null, null, 210, null)
    expect(result).toEqual({ status: 'on-target', delta: 0 })
  })

  it('falls back to fallbackDuration when all targets are null', () => {
    const result = computeTimeStatus(300, null, null, null, 210)
    expect(result).toEqual({ status: 'over', delta: 90 })
  })

  it('returns null when no target values exist', () => {
    expect(computeTimeStatus(200, null, null, null, null)).toBeNull()
  })
})

// --- Export / Import / Merge ---

describe('exportData', () => {
  it('exports all entity types', () => {
    saveBrew({ id: 'b1', beanName: 'Test', brewedAt: '2026-03-01T00:00:00Z' })
    saveBean({ id: 'bean1', name: 'Test Bean' })
    saveEquipment({ brewMethod: 'v60', grinder: 'fellow-ode' })

    const data = exportData()
    expect(data.brews).toHaveLength(1)
    expect(data.beans).toHaveLength(1)
    expect(data.equipment).toEqual({ brewMethod: 'v60', grinder: 'fellow-ode' })
    expect(data.pourTemplates).toEqual([])
    expect(data.exportedAt).toBeDefined()
  })

  it('returns empty collections when no data exists', () => {
    const data = exportData()
    expect(data.brews).toEqual([])
    expect(data.beans).toEqual([])
    expect(data.equipment).toBeNull()
    expect(data.pourTemplates).toEqual([])
  })
})

describe('importData', () => {
  it('replaces brews when present in payload', () => {
    saveBrew({ id: 'local', beanName: 'Local', brewedAt: '2026-03-01T00:00:00Z' })

    importData({
      brews: [{ id: 'imported', beanName: 'Imported', brewedAt: '2026-03-02T00:00:00Z' }],
    })

    const brews = getBrews()
    expect(brews).toHaveLength(1)
    expect(brews[0].id).toBe('imported')
  })

  it('only touches keys present in the payload', () => {
    saveBrew({ id: 'b1', beanName: 'Keep', brewedAt: '2026-03-01T00:00:00Z' })
    saveBean({ id: 'bean1', name: 'Keep Bean' })

    importData({ beans: [{ id: 'new', name: 'New Bean' }] })

    // Brews untouched — key not in payload
    expect(getBrews()).toHaveLength(1)
    expect(getBrews()[0].id).toBe('b1')
    // Beans replaced
    expect(getBeans()).toHaveLength(1)
    expect(getBeans()[0].id).toBe('new')
  })

  it('removes equipment when payload has null equipment', () => {
    saveEquipment({ brewMethod: 'v60' })
    importData({ equipment: null })
    expect(getEquipment()).toBeNull()
  })
})

describe('mergeData', () => {
  it('adds new brews without removing existing ones', () => {
    saveBrew({ id: 'local', beanName: 'Local', brewedAt: '2026-03-01T00:00:00Z' })

    mergeData({
      brews: [
        { id: 'imported', beanName: 'Imported', brewedAt: '2026-03-02T00:00:00Z' },
      ],
    })

    const brews = getBrews()
    expect(brews).toHaveLength(2)
    expect(brews.map(b => b.id)).toContain('local')
    expect(brews.map(b => b.id)).toContain('imported')
  })

  it('skips brews with duplicate IDs (local wins)', () => {
    saveBrew({ id: 'b1', beanName: 'Local Version', brewedAt: '2026-03-01T00:00:00Z' })

    mergeData({
      brews: [{ id: 'b1', beanName: 'Imported Version', brewedAt: '2026-03-01T00:00:00Z' }],
    })

    const brews = getBrews()
    expect(brews).toHaveLength(1)
    expect(brews[0].beanName).toBe('Local Version')
  })

  it('skips beans with duplicate names (case-insensitive)', () => {
    saveBean({ id: 'local', name: 'Heart Colombia' })

    mergeData({
      beans: [
        { id: 'imported', name: 'heart colombia' },
        { id: 'new', name: 'Onyx Ethiopia' },
      ],
    })

    const beans = getBeans()
    expect(beans).toHaveLength(2)
    expect(beans.map(b => b.name)).toContain('Heart Colombia')
    expect(beans.map(b => b.name)).toContain('Onyx Ethiopia')
  })

  it('only imports equipment if local has none', () => {
    saveEquipment({ brewMethod: 'v60' })

    mergeData({ equipment: { brewMethod: 'chemex' } })

    expect(getEquipment().brewMethod).toBe('v60') // local wins
  })

  it('imports equipment when local has none', () => {
    mergeData({ equipment: { brewMethod: 'chemex' } })
    expect(getEquipment().brewMethod).toBe('chemex')
  })

  it('merges pour templates by ID', () => {
    localStorage.setItem('brewlog_pour_templates', JSON.stringify([
      { id: 'tmpl1', name: 'Local Template' },
    ]))

    mergeData({
      pourTemplates: [
        { id: 'tmpl1', name: 'Imported Duplicate' },
        { id: 'tmpl2', name: 'New Template' },
      ],
    })

    const templates = getPourTemplates()
    expect(templates).toHaveLength(2)
    expect(templates.find(t => t.id === 'tmpl1').name).toBe('Local Template')
    expect(templates.find(t => t.id === 'tmpl2').name).toBe('New Template')
  })

  it('is a no-op for empty or missing data', () => {
    saveBrew({ id: 'b1', beanName: 'Keep', brewedAt: '2026-03-01T00:00:00Z' })
    mergeData({})
    expect(getBrews()).toHaveLength(1)
  })
})

// --- Phase 3: Rate-phase patterns ---

describe('updateBrew — tasting data merge', () => {
  it('merges tasting fields into an existing brew without overwriting other fields', () => {
    saveBrew({
      id: 'b1',
      beanName: 'Ethiopia',
      grindSetting: '6-1',
      totalTime: 195,
      timeStatus: 'on-target',
      stepResults: { '1': { tappedAt: 42, skipped: false, variance: 2 } },
      recipeSnapshot: { coffeeGrams: 20, waterGrams: 320 },
      recipeSteps: [{ id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40 }],
      flavors: [],
      body: '',
      rating: null,
      issues: [],
      notes: '',
      nextBrewChanges: '',
      brewedAt: '2026-03-01T10:00:00Z',
    })

    updateBrew('b1', {
      flavors: ['chocolate', 'cherry'],
      body: 'medium',
      rating: 4,
      notes: 'Nice and clean',
      nextBrewChanges: 'Try finer grind',
    })

    const brew = getBrews()[0]
    // Tasting data merged
    expect(brew.flavors).toEqual(['chocolate', 'cherry'])
    expect(brew.body).toBe('medium')
    expect(brew.rating).toBe(4)
    expect(brew.notes).toBe('Nice and clean')
    expect(brew.nextBrewChanges).toBe('Try finer grind')
    // Original fields preserved
    expect(brew.beanName).toBe('Ethiopia')
    expect(brew.grindSetting).toBe('6-1')
    expect(brew.totalTime).toBe(195)
    expect(brew.timeStatus).toBe('on-target')
    expect(brew.stepResults).toEqual({ '1': { tappedAt: 42, skipped: false, variance: 2 } })
    expect(brew.recipeSnapshot).toEqual({ coffeeGrams: 20, waterGrams: 320 })
  })

  it('corrects grindSetting and totalTime without losing tasting data', () => {
    saveBrew({
      id: 'b1',
      grindSetting: '6-1',
      totalTime: 195,
      timeStatus: 'on-target',
      flavors: ['chocolate'],
      rating: 4,
      brewedAt: '2026-03-01T10:00:00Z',
    })

    updateBrew('b1', { grindSetting: '6-2', totalTime: 220, timeStatus: 'over' })

    const brew = getBrews()[0]
    expect(brew.grindSetting).toBe('6-2')
    expect(brew.totalTime).toBe(220)
    expect(brew.timeStatus).toBe('over')
    // Tasting data still present
    expect(brew.flavors).toEqual(['chocolate'])
    expect(brew.rating).toBe(4)
  })
})

describe('computeTimeStatus — recomputation on correction', () => {
  it('changes status when corrected totalTime moves from on-target to over', () => {
    const original = computeTimeStatus(185, 180, 210, null, null)
    expect(original.status).toBe('on-target')

    const corrected = computeTimeStatus(250, 180, 210, null, null)
    expect(corrected.status).toBe('over')
    expect(corrected.delta).toBe(40)
  })

  it('changes status when corrected totalTime moves from over to on-target', () => {
    const original = computeTimeStatus(250, 180, 210, null, null)
    expect(original.status).toBe('over')

    const corrected = computeTimeStatus(185, 180, 210, null, null)
    expect(corrected.status).toBe('on-target')
  })

  it('returns approaching when near target max', () => {
    // Range 180-210, approaching threshold = min(15, 15) = 15
    const result = computeTimeStatus(200, 180, 210, null, null)
    expect(result.status).toBe('approaching')
    expect(result.delta).toBe(10) // 210 - 200 = 10s left
  })
})

describe('active brew — rate-phase persistence and recovery', () => {
  it('persists and retrieves rate-phase active brew with brewId', () => {
    saveActiveBrew({ phase: 'rate', brewId: 'brew-123', beanName: 'Ethiopia' })
    const active = getActiveBrew()
    expect(active.phase).toBe('rate')
    expect(active.brewId).toBe('brew-123')
    expect(active.beanName).toBe('Ethiopia')
  })

  it('finds saved brew by ID during rate-phase recovery', () => {
    saveBrew({ id: 'brew-123', beanName: 'Ethiopia', rating: null, brewedAt: '2026-03-01T10:00:00Z' })
    saveBrew({ id: 'brew-456', beanName: 'Colombia', rating: 3, brewedAt: '2026-03-02T10:00:00Z' })
    saveActiveBrew({ phase: 'rate', brewId: 'brew-123', beanName: 'Ethiopia' })

    const active = getActiveBrew()
    const brew = getBrews().find(b => b.id === active.brewId)
    expect(brew).toBeDefined()
    expect(brew.id).toBe('brew-123')
    expect(brew.beanName).toBe('Ethiopia')
  })

  it('returns undefined when brew ID no longer exists (e.g. data replaced)', () => {
    saveBrew({ id: 'other-brew', beanName: 'Colombia', brewedAt: '2026-03-01T10:00:00Z' })
    saveActiveBrew({ phase: 'rate', brewId: 'deleted-brew', beanName: 'Ethiopia' })

    const active = getActiveBrew()
    const brew = getBrews().find(b => b.id === active.brewId)
    expect(brew).toBeUndefined()
  })

  it('clearActiveBrew removes rate-phase state', () => {
    saveActiveBrew({ phase: 'rate', brewId: 'brew-123', beanName: 'Ethiopia' })
    clearActiveBrew()
    expect(getActiveBrew()).toBeNull()
  })

  it('distinguishes rate-phase from brew-phase active brew', () => {
    saveActiveBrew({ phase: 'brew', beanName: 'Ethiopia', timerState: { startedAt: 100 } })
    const active = getActiveBrew()
    expect(active.phase).toBe('brew')
    expect(active.brewId).toBeUndefined()

    saveActiveBrew({ phase: 'rate', brewId: 'brew-123', beanName: 'Ethiopia' })
    const active2 = getActiveBrew()
    expect(active2.phase).toBe('rate')
    expect(active2.brewId).toBe('brew-123')
  })
})
