import {
  formatEffectLabel,
  getDeviceDefinition,
  isConductiveControlKind,
  isLoadKind
} from './registry'
import type {
  CircuitDevice,
  CircuitModel,
  DeviceEffect,
  Endpoint,
  SimulationResult,
  Wire
} from './types'

class DisjointSet {
  private parent = new Map<string, string>()

  add(value: string) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value)
    }
  }

  find(value: string): string {
    this.add(value)
    const parent = this.parent.get(value)
    if (parent === value || !parent) return value
    const root = this.find(parent)
    this.parent.set(value, root)
    return root
  }

  union(a: string, b: string) {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA)
    }
  }
}

interface LoadEdge {
  device: CircuitDevice
  a: string
  b: string
  resistance: number
}

const EPSILON = 1e-6

export function terminalKey(endpoint: Endpoint) {
  return `${endpoint.deviceId}.${endpoint.terminalId}`
}

function endpointVoltageKey(endpoint: Endpoint, dsu: DisjointSet) {
  return dsu.find(terminalKey(endpoint))
}

function terminalEndpoint(deviceId: string, terminalId: string): Endpoint {
  return { deviceId, terminalId }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = vector.length
  const a = matrix.map((row, index) => [...row, vector[index]])

  for (let column = 0; column < n; column += 1) {
    let pivot = column
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) {
        pivot = row
      }
    }

    if (Math.abs(a[pivot][column]) < EPSILON) {
      continue
    }

    if (pivot !== column) {
      const swap = a[column]
      a[column] = a[pivot]
      a[pivot] = swap
    }

    const divisor = a[column][column]
    for (let col = column; col <= n; col += 1) {
      a[column][col] /= divisor
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue
      const factor = a[row][column]
      if (Math.abs(factor) < EPSILON) continue
      for (let col = column; col <= n; col += 1) {
        a[row][col] -= factor * a[column][col]
      }
    }
  }

  return a.map((row) => (Number.isFinite(row[n]) ? row[n] : 0))
}

function createDeviceEffect(device: CircuitDevice): DeviceEffect {
  return {
    deviceId: device.id,
    voltage: 0,
    current: 0,
    power: 0,
    intensity: 0,
    active: false,
    label: '未通电'
  }
}

function collectSourceVoltages(devices: CircuitDevice[], dsu: DisjointSet) {
  const fixedVoltages = new Map<string, number>()
  const issues: SimulationResult['issues'] = []
  let supplyVoltage = 0
  let positiveCount = 0
  let negativeCount = 0

  devices.forEach((device) => {
    if (device.enabled === false) return
    if (device.kind === 'power-positive') {
      positiveCount += 1
      const node = endpointVoltageKey(terminalEndpoint(device.id, 'out'), dsu)
      const voltage = Math.max(0, device.sourceVoltage ?? 12)
      supplyVoltage = Math.max(supplyVoltage, voltage)
      const previous = fixedVoltages.get(node)
      if (previous !== undefined && Math.abs(previous - voltage) > EPSILON) {
        issues.push({
          severity: 'error',
          message: '同一节点连接了不同电压的电源正极'
        })
      }
      fixedVoltages.set(node, voltage)
    }

    if (device.kind === 'power-negative') {
      negativeCount += 1
      const node = endpointVoltageKey(terminalEndpoint(device.id, 'in'), dsu)
      const previous = fixedVoltages.get(node)
      if (previous !== undefined && Math.abs(previous) > EPSILON) {
        issues.push({
          severity: 'error',
          message: '正负电源被导线或闭合开关直接短接'
        })
      }
      fixedVoltages.set(node, 0)
    }
  })

  if (positiveCount === 0 || negativeCount === 0) {
    issues.push({
      severity: 'warning',
      message: '需要同时放置正极和负极电源才能仿真'
    })
  }

  return {
    fixedVoltages,
    issues,
    hasSource: positiveCount > 0 && negativeCount > 0,
    supplyVoltage
  }
}

function buildElectricalNetwork(model: CircuitModel) {
  const dsu = new DisjointSet()
  const deviceById = new Map(model.devices.map((device) => [device.id, device]))

  model.devices.forEach((device) => {
    const definition = getDeviceDefinition(device.kind)
    definition.terminals.forEach((terminal) => {
      dsu.add(terminalKey(terminalEndpoint(device.id, terminal.id)))
    })
  })

  model.wires.forEach((wire) => {
    if (wire.connected) {
      dsu.union(terminalKey(wire.from), terminalKey(wire.to))
    }
  })

  model.devices.forEach((device) => {
    if (isConductiveControlKind(device.kind) && device.isClosed && device.enabled !== false) {
      dsu.union(
        terminalKey(terminalEndpoint(device.id, 'a')),
        terminalKey(terminalEndpoint(device.id, 'b'))
      )
    }
  })

  const loads: LoadEdge[] = []
  model.devices.forEach((device) => {
    if (!isLoadKind(device.kind) || device.enabled === false) return
    const definition = getDeviceDefinition(device.kind)
    const [firstTerminal, secondTerminal] = definition.terminals
    if (!firstTerminal || !secondTerminal) return
    loads.push({
      device,
      a: endpointVoltageKey(terminalEndpoint(device.id, firstTerminal.id), dsu),
      b: endpointVoltageKey(terminalEndpoint(device.id, secondTerminal.id), dsu),
      resistance: Math.max(0.1, device.resistance ?? definition.defaultResistance ?? 24)
    })
  })

  return { dsu, loads, deviceById }
}

export function simulateCircuit(model: CircuitModel): SimulationResult {
  const { dsu, loads } = buildElectricalNetwork(model)
  const sourceState = collectSourceVoltages(model.devices, dsu)
  const fixedVoltages = sourceState.fixedVoltages
  const nodeSet = new Set<string>()

  model.devices.forEach((device) => {
    getDeviceDefinition(device.kind).terminals.forEach((terminal) => {
      nodeSet.add(dsu.find(terminalKey(terminalEndpoint(device.id, terminal.id))))
    })
  })

  loads.forEach((load) => {
    nodeSet.add(load.a)
    nodeSet.add(load.b)
  })

  const shortCircuit = loads.some((load) => load.a === load.b)
    ? false
    : sourceState.issues.some((issue) => issue.message.includes('短接'))

  const unknownNodes = [...nodeSet].filter((node) => !fixedVoltages.has(node))
  const unknownIndex = new Map(unknownNodes.map((node, index) => [node, index]))
  const matrix = unknownNodes.map(() => unknownNodes.map(() => 0))
  const vector = unknownNodes.map(() => 0)

  loads.forEach((load) => {
    if (load.a === load.b) return
    const conductance = 1 / load.resistance
    const endpoints = [
      [load.a, load.b],
      [load.b, load.a]
    ] as const

    endpoints.forEach(([node, otherNode]) => {
      const row = unknownIndex.get(node)
      if (row === undefined) return
      matrix[row][row] += conductance
      const otherColumn = unknownIndex.get(otherNode)
      if (otherColumn !== undefined) {
        matrix[row][otherColumn] -= conductance
      } else {
        vector[row] += conductance * (fixedVoltages.get(otherNode) ?? 0)
      }
    })
  })

  const solvedVoltages = solveLinearSystem(matrix, vector)
  const nodeVoltages: Record<string, number> = {}

  fixedVoltages.forEach((voltage, node) => {
    nodeVoltages[node] = voltage
  })
  unknownNodes.forEach((node, index) => {
    nodeVoltages[node] = solvedVoltages[index] ?? 0
  })

  const effects: Record<string, DeviceEffect> = {}
  model.devices.forEach((device) => {
    effects[device.id] = createDeviceEffect(device)
  })

  let totalCurrent = 0
  loads.forEach((load) => {
    const voltageA = nodeVoltages[load.a] ?? 0
    const voltageB = nodeVoltages[load.b] ?? 0
    const voltage = Math.abs(voltageA - voltageB)
    const current = voltage / load.resistance
    const power = voltage * current
    const definition = getDeviceDefinition(load.device.kind)
    const ratedVoltage = Math.max(1, load.device.ratedVoltage ?? definition.defaultRatedVoltage ?? 12)
    const intensity = clamp(voltage / ratedVoltage, 0, 1.25)
    const active = intensity >= 0.12 && current > EPSILON

    if (current > EPSILON) {
      totalCurrent += current
    }

    effects[load.device.id] = {
      deviceId: load.device.id,
      voltage,
      current,
      power,
      intensity,
      active,
      label: formatEffectLabel(load.device.kind, definition.effectKind, intensity, active)
    }
  })

  const closedCircuit = totalCurrent > EPSILON && !shortCircuit
  const wireEffects: SimulationResult['wires'] = {}
  model.wires.forEach((wire) => {
    const fromNode = endpointVoltageKey(wire.from, dsu)
    const toNode = endpointVoltageKey(wire.to, dsu)
    const fromVoltage = nodeVoltages[fromNode]
    const toVoltage = nodeVoltages[toNode]
    const voltage =
      fromVoltage !== undefined && toVoltage !== undefined
        ? Math.max(fromVoltage, toVoltage)
        : null
    wireEffects[wire.id] = {
      wireId: wire.id,
      energized:
        wire.connected &&
        closedCircuit &&
        voltage !== null &&
        Math.abs(voltage) > EPSILON,
      voltage
    }
  })

  const issues: SimulationResult['issues'] = [...sourceState.issues]
  if (!shortCircuit && sourceState.hasSource && !closedCircuit) {
    issues.push({
      severity: 'warning',
      message: '回路未闭合：请检查开关状态和导线连接'
    })
  }
  if (closedCircuit) {
    issues.push({
      severity: 'info',
      message: '回路已接通，正在根据电压与负载阻值计算效果'
    })
  }

  return {
    hasSource: sourceState.hasSource,
    closedCircuit,
    shortCircuit,
    supplyVoltage: sourceState.supplyVoltage,
    totalCurrent,
    nodeVoltages,
    effects,
    wires: wireEffects,
    issues
  }
}
