import { describe, expect, it } from 'vitest'
import { createBranchWires, createDevice, createInitialCircuit, wire } from '../../src/core/circuitFactory'
import { DEVICE_PALETTE } from '../../src/core/registry'
import { simulateCircuit } from '../../src/core/simulator'
import type { CircuitDevice, CircuitModel, DeviceKind, Wire } from '../../src/core/types'

function patchDevice(
  model: CircuitModel,
  deviceId: string,
  patch: Partial<CircuitDevice>
): CircuitModel {
  return {
    ...model,
    devices: model.devices.map((device) =>
      device.id === deviceId ? { ...device, ...patch } : device
    )
  }
}

function patchWire(model: CircuitModel, wireId: string, patch: Partial<Wire>): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((item) => (item.id === wireId ? { ...item, ...patch } : item))
  }
}

function addAutoConnectedLoad(model: CircuitModel, kind: DeviceKind, index: number): CircuitModel {
  const device = createDevice(kind, index)
  return {
    devices: [...model.devices, device],
    wires: [...model.wires, ...createBranchWires(device.id, index, device.label)]
  }
}

describe('simulateCircuit electrical physics', () => {
  it('calculates voltage, current, and power for a closed 12V parallel circuit', () => {
    const result = simulateCircuit(createInitialCircuit(12))

    expect(result.hasSource).toBe(true)
    expect(result.closedCircuit).toBe(true)
    expect(result.shortCircuit).toBe(false)
    expect(result.supplyVoltage).toBe(12)

    expect(result.effects.l1.voltage).toBeCloseTo(12, 5)
    expect(result.effects.l1.current).toBeCloseTo(12 / 24, 5)
    expect(result.effects.l1.power).toBeCloseTo(6, 5)
    expect(result.effects.l1.active).toBe(true)
    expect(result.effects.l1.label).toBe('亮度 100%')

    expect(result.effects.f1.voltage).toBeCloseTo(12, 5)
    expect(result.effects.f1.current).toBeCloseTo(12 / 18, 5)
    expect(result.effects.f1.power).toBeCloseTo(8, 5)
    expect(result.effects.f1.active).toBe(true)
    expect(result.effects.f1.label).toBe('转速 100%')

    expect(result.totalCurrent).toBeCloseTo(12 / 24 + 12 / 18, 5)
  })

  it('turns every load off when the main switch is open', () => {
    const model = patchDevice(createInitialCircuit(12), 's1', { isClosed: false })
    const result = simulateCircuit(model)

    expect(result.closedCircuit).toBe(false)
    expect(result.shortCircuit).toBe(false)
    expect(result.totalCurrent).toBe(0)
    expect(result.effects.l1.active).toBe(false)
    expect(result.effects.f1.active).toBe(false)
    expect(result.effects.l1.label).toBe('未通电')
    expect(result.issues.some((issue) => issue.message.includes('回路未闭合'))).toBe(true)
  })

  it('keeps healthy parallel branches running when one return wire is disconnected', () => {
    const model = patchWire(createInitialCircuit(12), 'w-lamp-neg', { connected: false })
    const result = simulateCircuit(model)

    expect(result.closedCircuit).toBe(true)
    expect(result.effects.l1.active).toBe(false)
    expect(result.effects.l1.current).toBeCloseTo(0, 5)
    expect(result.effects.f1.active).toBe(true)
    expect(result.effects.f1.current).toBeCloseTo(12 / 18, 5)
    expect(result.totalCurrent).toBeCloseTo(12 / 18, 5)
  })

  it('reports a protected short circuit when source positive and negative are directly bridged', () => {
    const initial = createInitialCircuit(12)
    const model: CircuitModel = {
      ...initial,
      wires: [
        ...initial.wires,
        wire('w-source-short', 'p1', 'out', 'n1', 'in', '正负极直短')
      ]
    }
    const result = simulateCircuit(model)

    expect(result.shortCircuit).toBe(true)
    expect(result.closedCircuit).toBe(false)
    expect(result.totalCurrent).toBeCloseTo(0, 5)
    expect(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('短接'))).toBe(true)
  })

  it('adds low-voltage loads through the extension interface and includes them in total current', () => {
    const model = addAutoConnectedLoad(createInitialCircuit(12), 'stepper-motor', 1)
    const result = simulateCircuit(model)

    expect(result.effects.x1.active).toBe(true)
    expect(result.effects.x1.label).toBe('步进运行 100%')
    expect(result.effects.x1.current).toBeCloseTo(12 / 28, 5)
    expect(result.totalCurrent).toBeCloseTo(12 / 24 + 12 / 18 + 12 / 28, 5)
  })

  it('keeps every auto-connectable weak-current component ready for future devices and voltages', () => {
    const autoConnectable = DEVICE_PALETTE.filter(
      (definition) => definition.simulationRole === 'resistive-load'
    )

    expect(autoConnectable.length).toBeGreaterThan(20)
    autoConnectable.forEach((definition) => {
      expect(definition.terminals.map((terminal) => terminal.id)).toEqual(['in', 'out'])
      expect(definition.defaultRatedVoltage).toBeGreaterThan(0)
      expect(definition.defaultResistance).toBeGreaterThan(0)
    })
  })
})
