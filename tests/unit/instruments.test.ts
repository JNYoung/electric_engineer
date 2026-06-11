import { describe, expect, it } from 'vitest'
import { createInitialCircuit, wire } from '../../src/core/circuitFactory'
import { buildVirtualMeterWorksheet } from '../../src/core/instruments'
import { simulateCircuit } from '../../src/core/simulator'
import type { CircuitModel, Wire } from '../../src/core/types'

function patchWire(model: CircuitModel, wireId: string, patch: Partial<Wire>): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((item) => (item.id === wireId ? { ...item, ...patch } : item))
  }
}

describe('virtual meter worksheet', () => {
  it('turns a healthy parallel circuit into voltage, current, KCL, and continuity readings', () => {
    const model = createInitialCircuit(12)
    const worksheet = buildVirtualMeterWorksheet(model, simulateCircuit(model))

    expect(worksheet.status).toBe('可测量')
    expect(worksheet.safeToMeasure).toBe(true)
    expect(worksheet.passed).toBe(worksheet.total)
    expect(worksheet.readings.find((reading) => reading.id === 'meter-supply-voltage')?.value).toBe('12.00')
    expect(worksheet.readings.find((reading) => reading.id === 'meter-current-l1')?.expected).toContain('0.50A')
    expect(worksheet.readings.find((reading) => reading.id === 'meter-kcl-current')?.passed).toBe(true)
    expect(worksheet.readings.find((reading) => reading.id === 'meter-continuity-w-pos-switch')?.value).toBe('0.0')
  })

  it('reports open wiring with continuity and branch current remediation', () => {
    const model = patchWire(createInitialCircuit(12), 'w-lamp-neg', { connected: false })
    const worksheet = buildVirtualMeterWorksheet(model, simulateCircuit(model))

    expect(worksheet.status).toBe('待接线')
    expect(worksheet.readings.find((reading) => reading.id === 'meter-current-l1')?.passed).toBe(false)
    expect(worksheet.readings.find((reading) => reading.id === 'meter-continuity-w-lamp-neg')?.value).toBe('OL')
    expect(worksheet.nextActions.some((action) => action.includes('接回 灯泡回负极'))).toBe(true)
  })

  it('locks out meter work when a source short is detected', () => {
    const initial = createInitialCircuit(12)
    const model: CircuitModel = {
      ...initial,
      wires: [
        ...initial.wires,
        wire('w-source-short', 'p1', 'out', 'n1', 'in', '正负极直短')
      ]
    }
    const worksheet = buildVirtualMeterWorksheet(model, simulateCircuit(model))

    expect(worksheet.status).toBe('需断电排障')
    expect(worksheet.safeToMeasure).toBe(false)
    expect(worksheet.readings[0].id).toBe('meter-short-lockout')
    expect(worksheet.readings[0].severity).toBe('danger')
  })

  it('flags over-voltage load readings as dangerous electrician practice evidence', () => {
    const model = createInitialCircuit(48)
    const worksheet = buildVirtualMeterWorksheet(model, simulateCircuit(model))

    expect(worksheet.status).toBe('需断电排障')
    expect(worksheet.readings.find((reading) => reading.id === 'meter-voltage-l1')?.severity).toBe('danger')
    expect(worksheet.nextActions.some((action) => action.includes('降低电源'))).toBe(true)
  })
})
