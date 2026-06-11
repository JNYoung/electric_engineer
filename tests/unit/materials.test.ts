import { describe, expect, it } from 'vitest'
import {
  MATERIAL_LIBRARY,
  buildMaterialFinder,
  getMaterialCoverageSummary,
  getMaterialSpec,
  getMaterialSpecsByFamily,
  getMaterialSpecsByLevel,
  searchMaterialSpecs
} from '../../src/core/materials'

describe('material specification library', () => {
  it('covers common, industrial, and renovation material families', () => {
    const summary = getMaterialCoverageSummary()

    expect(summary.total).toBe(MATERIAL_LIBRARY.length)
    expect(summary.highSchool).toBeGreaterThan(0)
    expect(summary.university).toBeGreaterThan(0)
    expect(summary.electrician).toBeGreaterThan(0)
    expect(summary.industrial).toBeGreaterThan(0)
    expect(summary.renovation).toBeGreaterThan(0)
  })

  it('returns practical specs for simulation components', () => {
    const plc = getMaterialSpec('plc-controller')
    const lamp = getMaterialSpec('lamp')

    expect(plc?.examTags).toContain('PLC')
    expect(plc?.safetyNotes.length).toBeGreaterThan(0)
    expect(lamp?.commonFaults).toContain('回线断开')
  })

  it('supports level, family, and text search lookup', () => {
    expect(getMaterialSpecsByLevel('electrician').length).toBeGreaterThan(getMaterialSpecsByLevel('high-school').length)
    expect(getMaterialSpecsByFamily('装修工控').some((item) => item.kind === 'smart-gateway')).toBe(true)
    expect(searchMaterialSpecs('NPN').some((item) => item.kind === 'proximity-sensor')).toBe(true)
  })

  it('builds training-ready material finder results', () => {
    const industrialFinder = buildMaterialFinder({
      family: '工程工控',
      query: 'NPN',
      limit: 3
    })
    const renovationFinder = buildMaterialFinder({
      family: '装修工控',
      query: '回线'
    })

    expect(industrialFinder.total).toBe(getMaterialSpecsByFamily('工程工控').length)
    expect(industrialFinder.filtered).toBe(1)
    expect(industrialFinder.matches[0].kind).toBe('proximity-sensor')
    expect(industrialFinder.highlightedTags).toContain('NPN/PNP')
    expect(industrialFinder.safetyChecklist.length).toBeGreaterThan(0)
    expect(renovationFinder.matches.some((item) => item.kind === 'leak-detector')).toBe(true)
    expect(renovationFinder.faultSamples).toContain('回线断开')
  })
})
