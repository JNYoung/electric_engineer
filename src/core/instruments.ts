import { getDeviceDefinition, isLoadKind } from './registry'
import type { CircuitDevice, CircuitModel, DeviceEffect, SimulationResult, Wire } from './types'

export type VirtualMeterMode = 'DCV' | 'DCA' | 'Ω'
export type VirtualMeterStatus = '可测' | '复测' | '危险'
export type VirtualMeterSeverity = 'success' | 'warning' | 'danger'
export type VirtualMeterWorksheetStatus = '可测量' | '待接线' | '需断电排障'

export interface VirtualMeterReading {
  id: string
  mode: VirtualMeterMode
  label: string
  value: string
  unit: string
  expected: string
  probe: string
  detail: string
  action: string
  passed: boolean
  status: VirtualMeterStatus
  severity: VirtualMeterSeverity
  deviceId?: string
  wireId?: string
}

export interface VirtualMeterWorksheet {
  status: VirtualMeterWorksheetStatus
  safeToMeasure: boolean
  passed: number
  total: number
  summary: string
  readings: VirtualMeterReading[]
  nextActions: string[]
}

export function buildVirtualMeterWorksheet(
  model: CircuitModel,
  simulation: SimulationResult
): VirtualMeterWorksheet {
  const loadDevices = model.devices.filter((device) => device.enabled !== false && isLoadKind(device.kind))
  const activeLoadEffects = getActiveLoadEffects(loadDevices, simulation)
  const readings = [
    buildSupplyVoltageReading(simulation),
    ...loadDevices.slice(0, 2).flatMap((device) => buildLoadReadings(device, simulation.effects[device.id])),
    buildKclReading(activeLoadEffects, simulation),
    buildContinuityReading(model.wires)
  ]

  if (simulation.shortCircuit) {
    readings.unshift(buildShortCircuitLockoutReading())
  }

  const passed = readings.filter((reading) => reading.passed).length
  const status = getWorksheetStatus(simulation, readings)
  const failedReadings = readings
    .filter((reading) => !reading.passed)
    .sort((left, right) => readingActionPriority(left) - readingActionPriority(right))

  return {
    status,
    safeToMeasure: simulation.hasSource && !simulation.shortCircuit,
    passed,
    total: readings.length,
    summary: getWorksheetSummary(status, passed, readings.length),
    readings,
    nextActions: uniqueText(failedReadings.map((reading) => reading.action)).slice(0, 3)
  }
}

function buildSupplyVoltageReading(simulation: SimulationResult): VirtualMeterReading {
  const passed = simulation.hasSource && simulation.supplyVoltage > 0 && !simulation.shortCircuit
  return {
    id: 'meter-supply-voltage',
    mode: 'DCV',
    label: '电源端电压',
    value: formatReading(simulation.supplyVoltage, 2),
    unit: 'V',
    expected: '训练范围 1-48V DC',
    probe: '红表笔接正极输出，黑表笔接负极回线。',
    detail: passed ? '电源读数可作为后续支路测量基准。' : '电源未形成安全可测状态。',
    action: passed ? '记录电源端电压后再测支路。' : '先确认正负极电源齐全且没有短接。',
    passed,
    status: passed ? '可测' : simulation.shortCircuit ? '危险' : '复测',
    severity: passed ? 'success' : simulation.shortCircuit ? 'danger' : 'warning'
  }
}

function buildLoadReadings(device: CircuitDevice, effect: DeviceEffect | undefined): VirtualMeterReading[] {
  const definition = getDeviceDefinition(device.kind)
  const ratedVoltage = device.ratedVoltage ?? definition.defaultRatedVoltage ?? 0
  const resistance = Math.max(0.1, device.resistance ?? definition.defaultResistance ?? 0.1)
  const voltage = effect?.voltage ?? 0
  const current = effect?.current ?? 0
  const active = Boolean(effect?.active)
  const overVoltage = ratedVoltage > 0 && voltage > ratedVoltage * 1.25
  const expectedCurrent = voltage > 0 ? voltage / resistance : 0
  const currentGap = Math.abs(current - expectedCurrent)
  const currentPassed = active && current > 0 && currentGap <= Math.max(0.02, expectedCurrent * 0.15)
  const voltagePassed = active && voltage > 0 && !overVoltage

  return [
    {
      id: `meter-voltage-${device.id}`,
      mode: 'DCV',
      label: `${device.label}端电压`,
      value: formatReading(voltage, 2),
      unit: 'V',
      expected: ratedVoltage > 0 ? `接近额定 ${formatReading(ratedVoltage, 0)}V` : '接近电源端电压',
      probe: `红表笔接 ${device.label} 进线，黑表笔接回线。`,
      detail: voltagePassed ? '负载端电压可用于判断支路是否接通。' : overVoltage ? '负载端电压明显高于额定值。' : '负载端没有形成有效电压。',
      action: voltagePassed ? '继续测量支路电流并核对额定值。' : overVoltage ? '降低电源或更换匹配额定电压的负载。' : '检查进线、回线和控制件闭合状态。',
      passed: voltagePassed,
      status: voltagePassed ? '可测' : overVoltage ? '危险' : '复测',
      severity: voltagePassed ? 'success' : overVoltage ? 'danger' : 'warning',
      deviceId: device.id
    },
    {
      id: `meter-current-${device.id}`,
      mode: 'DCA',
      label: `${device.label}支路电流`,
      value: formatReading(current, 2),
      unit: 'A',
      expected: expectedCurrent > 0 ? `约 ${formatReading(expectedCurrent, 2)}A` : '形成闭合支路后应大于 0A',
      probe: `电流档串入 ${device.label} 支路，优先在断电后改接。`,
      detail: currentPassed ? '电流读数与等效阻值计算一致。' : '支路电流不满足当前等效负载模型。',
      action: currentPassed ? '可把该读数用于欧姆定律或功率计算。' : '检查支路是否断开，或核对负载阻值/额定电压。',
      passed: currentPassed,
      status: currentPassed ? '可测' : '复测',
      severity: currentPassed ? 'success' : 'warning',
      deviceId: device.id
    }
  ]
}

function buildKclReading(
  activeLoadEffects: Array<{ device: CircuitDevice; effect: DeviceEffect }>,
  simulation: SimulationResult
): VirtualMeterReading {
  const branchCurrent = activeLoadEffects.reduce((total, item) => total + item.effect.current, 0)
  const gap = Math.abs(branchCurrent - simulation.totalCurrent)
  const passed = activeLoadEffects.length >= 2 && gap <= 0.03 && !simulation.shortCircuit

  return {
    id: 'meter-kcl-current',
    mode: 'DCA',
    label: '支路电流和',
    value: formatReading(branchCurrent, 2),
    unit: 'A',
    expected: `总电流 ${formatReading(simulation.totalCurrent, 2)}A`,
    probe: '分别串测各并联支路，再与总回线电流比较。',
    detail: passed ? '支路电流和与总电流一致，可作为 KCL 训练证据。' : '需要两个以上工作的并联支路才能完成 KCL 校验。',
    action: passed ? '记录支路电流和，可进入大学电路节点法验证。' : '恢复至少两个并联负载后再做 KCL 测试。',
    passed,
    status: passed ? '可测' : '复测',
    severity: passed ? 'success' : 'warning'
  }
}

function buildContinuityReading(wires: Wire[]): VirtualMeterReading {
  const disconnected = wires.find((wire) => !wire.connected)
  const wire = disconnected ?? wires[0]

  if (!wire) {
    return {
      id: 'meter-continuity-empty',
      mode: 'Ω',
      label: '导线通断',
      value: '待接线',
      unit: '',
      expected: '断电后低阻导通',
      probe: '断电后测量目标导线两端。',
      detail: '当前没有导线可做通断测试。',
      action: '先添加或恢复导线，再做通断测量。',
      passed: false,
      status: '复测',
      severity: 'warning'
    }
  }

  const passed = !disconnected
  return {
    id: `meter-continuity-${wire.id}`,
    mode: 'Ω',
    label: `${wire.label}通断`,
    value: passed ? '0.0' : 'OL',
    unit: passed ? 'Ω' : '',
    expected: '断电后约 0Ω',
    probe: `${wire.from.deviceId}.${wire.from.terminalId} 与 ${wire.to.deviceId}.${wire.to.terminalId} 两端。`,
    detail: passed ? '导线处于接入状态，断电后应接近低阻导通。' : '导线已断开，断电通断档应显示开路。',
    action: passed ? '可继续选择其他导线做排障抽检。' : `接回 ${wire.label} 后再复测通断。`,
    passed,
    status: passed ? '可测' : '复测',
    severity: passed ? 'success' : 'warning',
    wireId: wire.id
  }
}

function buildShortCircuitLockoutReading(): VirtualMeterReading {
  return {
    id: 'meter-short-lockout',
    mode: 'Ω',
    label: '短路隔离',
    value: '禁止带电测量',
    unit: '',
    expected: '先断电再排障',
    probe: '断开电源，确认正负极不再直连。',
    detail: '检测到短路保护，带电测量会破坏训练流程。',
    action: '先断开正负极直短或控制链，再恢复电源测量。',
    passed: false,
    status: '危险',
    severity: 'danger'
  }
}

function getActiveLoadEffects(loadDevices: CircuitDevice[], simulation: SimulationResult) {
  return loadDevices
    .map((device) => ({ device, effect: simulation.effects[device.id] }))
    .filter((item): item is { device: CircuitDevice; effect: DeviceEffect } =>
      Boolean(item.effect?.active)
    )
}

function getWorksheetStatus(
  simulation: SimulationResult,
  readings: VirtualMeterReading[]
): VirtualMeterWorksheetStatus {
  if (simulation.shortCircuit || readings.some((reading) => reading.severity === 'danger' && !reading.passed)) {
    return '需断电排障'
  }
  return readings.every((reading) => reading.passed) ? '可测量' : '待接线'
}

function getWorksheetSummary(status: VirtualMeterWorksheetStatus, passed: number, total: number) {
  if (status === '需断电排障') return '存在短路或过压风险，先完成隔离后再恢复仪表测量。'
  if (status === '可测量') return `当前 ${passed}/${total} 个测点可作为训练读数证据。`
  return `当前 ${passed}/${total} 个测点达标，剩余测点需要补接或复测。`
}

function readingActionPriority(reading: VirtualMeterReading) {
  if (reading.severity === 'danger') return 0
  if (reading.wireId) return 1
  if (reading.id === 'meter-kcl-current') return 3
  return 2
}

function formatReading(value: number, digits: number) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00'
}

function uniqueText(items: string[]) {
  return items
    .filter((item) => item.trim().length > 0)
    .filter((item, index, source) => source.indexOf(item) === index)
}
