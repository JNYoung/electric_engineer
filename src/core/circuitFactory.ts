import { DEVICE_REGISTRY } from './registry'
import type { CircuitDevice, CircuitModel, DeviceKind, Wire } from './types'

export function createInitialCircuit(voltage = 12): CircuitModel {
  return {
    devices: [
      {
        id: 'p1',
        kind: 'power-positive',
        label: '直流正极',
        x: 64,
        y: 102,
        sourceVoltage: voltage
      },
      {
        id: 'n1',
        kind: 'power-negative',
        label: '直流负极',
        x: 64,
        y: 360
      },
      {
        id: 's1',
        kind: 'switch',
        label: '主开关',
        x: 236,
        y: 100,
        isClosed: true
      },
      {
        id: 'l1',
        kind: 'lamp',
        label: '照明灯',
        x: 460,
        y: 78,
        ratedVoltage: 12,
        resistance: DEVICE_REGISTRY.lamp.defaultResistance
      },
      {
        id: 'f1',
        kind: 'fan',
        label: '排风扇',
        x: 462,
        y: 256,
        ratedVoltage: 12,
        resistance: DEVICE_REGISTRY.fan.defaultResistance
      }
    ],
    wires: [
      wire('w-pos-switch', 'p1', 'out', 's1', 'a', '正极到主开关'),
      wire('w-switch-lamp', 's1', 'b', 'l1', 'in', '开关到灯泡'),
      wire('w-switch-fan', 's1', 'b', 'f1', 'in', '开关到电扇'),
      wire('w-lamp-neg', 'l1', 'out', 'n1', 'in', '灯泡回负极'),
      wire('w-fan-neg', 'f1', 'out', 'n1', 'in', '电扇回负极')
    ]
  }
}

export function wire(
  id: string,
  fromDeviceId: string,
  fromTerminalId: string,
  toDeviceId: string,
  toTerminalId: string,
  label: string
): Wire {
  return {
    id,
    from: { deviceId: fromDeviceId, terminalId: fromTerminalId },
    to: { deviceId: toDeviceId, terminalId: toTerminalId },
    connected: true,
    label
  }
}

export function createDevice(kind: DeviceKind, index: number, sameKindIndex = 1): CircuitDevice {
  const definition = DEVICE_REGISTRY[kind]
  return {
    id: `x${index}`,
    kind,
    label: `${definition.name} ${sameKindIndex}`,
    x: 430,
    y: 420 + (index - 1) * 108,
    ratedVoltage: definition.defaultRatedVoltage,
    resistance: definition.defaultResistance,
    enabled: true
  }
}

export function createBranchWires(deviceId: string, index: number, label: string) {
  return [
    wire(
      `w-branch-${index}-pos`,
      's1',
      'b',
      deviceId,
      'in',
      `${label} 进线`
    ),
    wire(
      `w-branch-${index}-neg`,
      deviceId,
      'out',
      'n1',
      'in',
      `${label} 回线`
    )
  ]
}
