import { describe, expect, it } from 'vitest'
import { createBranchWires, createDevice, createInitialCircuit } from '../../src/core/circuitFactory'
import { simulateCircuit } from '../../src/core/simulator'
import {
  buildSafetyDiagnostics,
  createTrainingCircuit,
  evaluateTrainingChallenge
} from '../../src/core/training'
import type { CircuitModel, Wire } from '../../src/core/types'

function patchWire(model: CircuitModel, wireId: string, patch: Partial<Wire>): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((item) => (item.id === wireId ? { ...item, ...patch } : item))
  }
}

describe('training challenge evaluation', () => {
  it('scores the lighting fault only after the lamp return wire is restored', () => {
    const faultModel = createTrainingCircuit('lighting-fault')
    const faultResult = simulateCircuit(faultModel)
    const faultEvaluation = evaluateTrainingChallenge(faultModel, faultResult, 'lighting-fault')

    expect(faultEvaluation.percent).toBeLessThan(90)
    expect(faultEvaluation.ruleResults.find((rule) => rule.id === 'lamp-return')?.passed).toBe(false)
    expect(faultEvaluation.ruleResults.find((rule) => rule.id === 'fan-active')?.passed).toBe(true)

    const repairedModel = patchWire(faultModel, 'w-lamp-neg', { connected: true })
    const repairedResult = simulateCircuit(repairedModel)
    const repairedEvaluation = evaluateTrainingChallenge(repairedModel, repairedResult, 'lighting-fault')

    expect(repairedEvaluation.percent).toBe(100)
    expect(repairedEvaluation.status).toBe('passed')
  })

  it('builds a ventilation alarm circuit with active actuator branches', () => {
    const model = createTrainingCircuit('ventilation-alarm')
    const result = simulateCircuit(model)
    const evaluation = evaluateTrainingChallenge(model, result, 'ventilation-alarm')

    expect(model.devices.some((device) => device.kind === 'buzzer')).toBe(true)
    expect(model.devices.some((device) => device.kind === 'relay')).toBe(true)
    expect(result.effects.x1.label).toBe('鸣响 100%')
    expect(result.effects.x2.label).toBe('线圈吸合 100%')
    expect(evaluation.percent).toBe(100)
  })

  it('reports over-voltage diagnostics for low-voltage indicators on a 12V rail', () => {
    const led = createDevice('led', 1)
    const model: CircuitModel = {
      ...createInitialCircuit(12),
      devices: [...createInitialCircuit(12).devices, led],
      wires: [...createInitialCircuit(12).wires, ...createBranchWires(led.id, 1, led.label)]
    }
    const result = simulateCircuit(model)
    const diagnostics = buildSafetyDiagnostics(model, result)

    expect(diagnostics.some((item) => item.id === `over-voltage-${led.id}`)).toBe(true)
  })
})
