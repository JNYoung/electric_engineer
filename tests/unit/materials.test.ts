import { describe, expect, it } from 'vitest'
import {
  MATERIAL_LIBRARY,
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
})
