import { describe, expect, it } from 'vitest'
import {
  MATERIAL_LIBRARY,
  MATERIAL_TRAINING_KITS,
  buildMaterialFinder,
  getMaterialCoverageSummary,
  getMaterialSpec,
  getMaterialSpecsByFamily,
  getMaterialSpecsByLevel,
  getMaterialTrainingKit,
  getMaterialTrainingKits,
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
    expect(getMaterialSpec('pressure-transmitter')?.examTags).toContain('4-20mA')
    expect(getMaterialSpec('access-control')?.safetyNotes).toContain('消防释放优先级必须保留')
  })

  it('supports level, family, and text search lookup', () => {
    expect(getMaterialSpecsByLevel('electrician').length).toBeGreaterThan(getMaterialSpecsByLevel('high-school').length)
    expect(getMaterialSpecsByFamily('装修工控').some((item) => item.kind === 'smart-gateway')).toBe(true)
    expect(searchMaterialSpecs('NPN').some((item) => item.kind === 'proximity-sensor')).toBe(true)
    expect(searchMaterialSpecs('消防').some((item) => item.kind === 'access-control')).toBe(true)
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

  it('builds complete training kits for school, industrial, and renovation practice', () => {
    const highSchoolKit = getMaterialTrainingKit('high-school-parallel-kit')
    const industrialKits = getMaterialTrainingKits({
      family: '工程工控',
      level: 'electrician'
    })
    const renovationKits = getMaterialTrainingKits({
      family: '装修工控'
    })

    expect(MATERIAL_TRAINING_KITS.every((kit) => getMaterialTrainingKit(kit.id)?.readiness === '素材齐备')).toBe(true)
    expect(highSchoolKit?.components.some((item) => item.kind === 'lamp')).toBe(true)
    expect(highSchoolKit?.examTags).toContain('欧姆定律')
    expect(industrialKits.some((kit) => kit.id === 'electrician-control-kit')).toBe(true)
    expect(industrialKits[0].safetyChecklist.length).toBeGreaterThan(0)
    expect(industrialKits[0].faultSamples.length).toBeGreaterThan(0)
    expect(renovationKits[0].title).toBe('装修智能联动包')
    expect(renovationKits[0].components.some((item) => item.kind === 'curtain-motor')).toBe(true)
  })
})
