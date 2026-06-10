export type DeviceKind =
  | 'power-positive'
  | 'power-negative'
  | 'switch'
  | 'push-button'
  | 'dip-switch'
  | 'lamp'
  | 'led'
  | 'rgb-led'
  | 'fan'
  | 'dc-motor'
  | 'stepper-motor'
  | 'servo-motor'
  | 'buzzer'
  | 'relay'
  | 'solenoid'
  | 'resistor'
  | 'potentiometer'
  | 'diode'
  | 'capacitor'
  | 'fuse'
  | 'transistor-driver'
  | 'microcontroller'
  | 'display'
  | 'seven-segment'
  | 'photoresistor'
  | 'thermistor'
  | 'pir-sensor'
  | 'ultrasonic-sensor'
  | 'hall-sensor'
  | 'humidity-sensor'
  | 'extension-load'

export type TerminalRole = 'positive' | 'negative' | 'input' | 'output'
export type DeviceCategory =
  | 'source'
  | 'control'
  | 'input'
  | 'passive'
  | 'indicator'
  | 'actuator'
  | 'motor'
  | 'sensor'
  | 'driver'
  | 'display'
  | 'interface'

export type SimulationRole =
  | 'fixed-source'
  | 'reference'
  | 'conductive-control'
  | 'resistive-load'
  | 'display-only'

export type EffectKind =
  | 'none'
  | 'glow'
  | 'multi-glow'
  | 'spin'
  | 'step'
  | 'sweep'
  | 'tone'
  | 'pull'
  | 'relay'
  | 'resist'
  | 'adjust'
  | 'pass'
  | 'store'
  | 'protect'
  | 'drive'
  | 'compute'
  | 'display'
  | 'sense'
  | 'logic'
  | 'interface'

export interface TerminalDefinition {
  id: string
  label: string
  role: TerminalRole
}

export interface DeviceDefinition {
  kind: DeviceKind
  name: string
  category: DeviceCategory
  group: string
  terminals: TerminalDefinition[]
  simulationRole: SimulationRole
  effectKind: EffectKind
  defaultRatedVoltage?: number
  defaultResistance?: number
  description: string
}

export interface CircuitDevice {
  id: string
  kind: DeviceKind
  label: string
  x: number
  y: number
  ratedVoltage?: number
  resistance?: number
  isClosed?: boolean
  sourceVoltage?: number
  enabled?: boolean
}

export interface Endpoint {
  deviceId: string
  terminalId: string
}

export type WirePathMode = 'orthogonal' | 'smooth'

export interface Wire {
  id: string
  from: Endpoint
  to: Endpoint
  connected: boolean
  label: string
  pathMode: WirePathMode
}

export interface CircuitModel {
  devices: CircuitDevice[]
  wires: Wire[]
}

export interface DeviceEffect {
  deviceId: string
  voltage: number
  current: number
  power: number
  intensity: number
  active: boolean
  label: string
}

export interface WireEffect {
  wireId: string
  energized: boolean
  voltage: number | null
}

export interface SimulationIssue {
  severity: 'info' | 'warning' | 'error'
  message: string
}

export interface SimulationResult {
  hasSource: boolean
  closedCircuit: boolean
  shortCircuit: boolean
  supplyVoltage: number
  totalCurrent: number
  nodeVoltages: Record<string, number>
  effects: Record<string, DeviceEffect>
  wires: Record<string, WireEffect>
  issues: SimulationIssue[]
}
