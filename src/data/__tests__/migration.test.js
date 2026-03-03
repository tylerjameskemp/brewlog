import { describe, it, expect } from 'vitest'
import { migrateToSchemaV2, getBrews } from '../storage'

describe('migrateToSchemaV2', () => {
  it('migrates a legacy BrewForm brew to schema V2', () => {
    const brews = [{
      id: 'legacy1',
      beanName: 'Heart Colombia',
      brewedAt: '2026-01-15T10:00:00Z',
      recipeSteps: [
        { label: 'Bloom', startTime: 0, targetWater: 42, note: 'gentle' },
        { label: 'Pour 1', startTime: 40, targetWater: 160, note: '' },
      ],
      steps: [
        { label: 'Bloom', startTime: 0, targetWater: 40, note: '' },
      ],
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateToSchemaV2()
    const brew = result.find(b => b.id === 'legacy1')

    expect(brew.schemaVersion).toBe(2)

    // recipeSteps converted to new format
    expect(brew.recipeSteps[0].name).toBe('Bloom')
    expect(brew.recipeSteps[0].waterTo).toBe(42)
    expect(brew.recipeSteps[0].time).toBe(0)
    expect(brew.recipeSteps[0].note).toBe('gentle')
    expect(brew.recipeSteps[0].id).toBe(1)
    expect(brew.recipeSteps[1].name).toBe('Pour 1')

    // actual steps also converted
    expect(brew.steps[0].name).toBe('Bloom')
    expect(brew.steps[0].waterTo).toBe(40)
  })

  it('migrates a BrewScreen brew to schema V2', () => {
    const brews = [{
      id: 'screen1',
      beanName: 'Onyx Ethiopia',
      brewScreenVersion: 1,
      brewedAt: '2026-03-01T10:00:00Z',
      recipeSteps: [
        { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: '' },
      ],
      stepResults: { '1': { tappedAt: 38, skipped: false } },
      notes: 'Great brew',
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateToSchemaV2()
    const brew = result.find(b => b.id === 'screen1')

    expect(brew.schemaVersion).toBe(2)
    expect(brew.brewScreenVersion).toBeUndefined()

    // Steps preserved (already in new format)
    expect(brew.recipeSteps[0].name).toBe('Bloom')
    // stepResults preserved
    expect(brew.stepResults['1'].tappedAt).toBe(38)
    // notes preserved
    expect(brew.notes).toBe('Great brew')
  })

  it('is idempotent — skips already-migrated brews', () => {
    const brews = [{
      id: 'migrated1',
      beanName: 'Already Done',
      schemaVersion: 2,
      brewedAt: '2026-02-01T10:00:00Z',
      recipeSteps: [{ id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: '' }],
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    migrateToSchemaV2()
    const result = getBrews()

    expect(result).toHaveLength(1)
    expect(result[0].schemaVersion).toBe(2)
  })

  it('handles hybrid brew (BrewScreen-created, edited via BrewForm)', () => {
    const brews = [{
      id: 'hybrid1',
      beanName: 'Hybrid Bean',
      brewScreenVersion: 1,
      brewedAt: '2026-02-15T10:00:00Z',
      recipeSteps: [
        { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: '' },
      ],
      steps: [
        { id: 1, name: 'Bloom', waterTo: 40, time: 0, duration: 40, note: '' },
      ],
      stepResults: { '1': { tappedAt: 35, skipped: false } },
      notes: 'Edited later',
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateToSchemaV2()
    const brew = result.find(b => b.id === 'hybrid1')

    expect(brew.schemaVersion).toBe(2)
    expect(brew.brewScreenVersion).toBeUndefined()
    expect(brew.stepResults['1'].tappedAt).toBe(35)
  })

  it('handles empty brews array without error', () => {
    localStorage.setItem('brewlog_brews', JSON.stringify([]))
    const result = migrateToSchemaV2()
    expect(result).toEqual([])
  })

  it('handles no brews key without error', () => {
    const result = migrateToSchemaV2()
    expect(result).toEqual([])
  })

  it('creates backup in brewlog_brews_backup_v1', () => {
    const brews = [{
      id: 'b1',
      beanName: 'Test',
      brewedAt: '2026-03-01T10:00:00Z',
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    migrateToSchemaV2()

    const backup = JSON.parse(localStorage.getItem('brewlog_brews_backup_v1'))
    expect(backup).toHaveLength(1)
    expect(backup[0].id).toBe('b1')
    // Backup should be pre-migration (no schemaVersion)
    expect(backup[0].schemaVersion).toBeUndefined()
  })

  it('does not overwrite existing backup', () => {
    localStorage.setItem('brewlog_brews_backup_v1', JSON.stringify([{ id: 'original-backup' }]))

    const brews = [{
      id: 'b1',
      beanName: 'Test',
      brewedAt: '2026-03-01T10:00:00Z',
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    migrateToSchemaV2()

    const backup = JSON.parse(localStorage.getItem('brewlog_brews_backup_v1'))
    expect(backup[0].id).toBe('original-backup')
  })

  it('migrates legacy brew with bloom fields but no recipeSteps', () => {
    const brews = [{
      id: 'bloom-only',
      beanName: 'Old Brew',
      brewedAt: '2026-01-01T10:00:00Z',
      bloomTime: 45,
      bloomWater: 60,
    }]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateToSchemaV2()
    const brew = result.find(b => b.id === 'bloom-only')

    expect(brew.schemaVersion).toBe(2)
    // normalizeSteps returns [] for no recipeSteps
    expect(brew.recipeSteps).toEqual([])
  })

  it('migrates mixed brews (legacy + BrewScreen) in one pass', () => {
    const brews = [
      {
        id: 'legacy',
        beanName: 'Legacy Bean',
        brewedAt: '2026-01-01T10:00:00Z',
        recipeSteps: [{ label: 'Bloom', startTime: 0, targetWater: 42, note: '' }],
      },
      {
        id: 'screen',
        beanName: 'Screen Bean',
        brewScreenVersion: 1,
        brewedAt: '2026-03-01T10:00:00Z',
        recipeSteps: [{ id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: '' }],
      },
    ]
    localStorage.setItem('brewlog_brews', JSON.stringify(brews))

    const result = migrateToSchemaV2()

    expect(result).toHaveLength(2)
    expect(result.every(b => b.schemaVersion === 2)).toBe(true)
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('brewlog_brews', '{invalid json}')
    expect(() => migrateToSchemaV2()).not.toThrow()
    expect(migrateToSchemaV2()).toEqual([])
  })

  it('handles double-corrupt data (both main and backup corrupt)', () => {
    localStorage.setItem('brewlog_brews', '{corrupt main}')
    localStorage.setItem('brewlog_brews_backup_v1', '{corrupt backup}')
    expect(() => migrateToSchemaV2()).not.toThrow()
    expect(migrateToSchemaV2()).toEqual([])
    // Backup should not be removed (already consumed/invalid)
  })

  it('restores from backup when main data is corrupt', () => {
    const validBrews = [{ id: 'b1', beanName: 'Test', brewedAt: '2026-03-01T00:00:00Z' }]
    localStorage.setItem('brewlog_brews', '{corrupt main}')
    localStorage.setItem('brewlog_brews_backup_v1', JSON.stringify(validBrews))

    const result = migrateToSchemaV2()
    expect(result).toHaveLength(1)
    expect(result[0].schemaVersion).toBe(2)
    // Main data restored from backup
    const restored = JSON.parse(localStorage.getItem('brewlog_brews'))
    expect(restored[0].id).toBe('b1')
  })

  it('skips null elements in brews array', () => {
    localStorage.setItem('brewlog_brews', JSON.stringify([
      { id: 'b1', beanName: 'Test', brewedAt: '2026-03-01T00:00:00Z' },
      null,
      { id: 'b2', beanName: 'Test2', brewedAt: '2026-03-02T00:00:00Z' },
    ]))
    expect(() => migrateToSchemaV2()).not.toThrow()
    const result = getBrews()
    expect(result).toHaveLength(2) // nulls filtered by getBrews()
    expect(result.every(b => b.schemaVersion === 2)).toBe(true)
  })
})
