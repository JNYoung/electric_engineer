import type { DeviceDefinition, DeviceKind, EffectKind } from './types'

const twoTerminal = [
  { id: 'in', label: '进线', role: 'input' as const },
  { id: 'out', label: '回线', role: 'output' as const }
]

export const DEVICE_REGISTRY: Record<DeviceKind, DeviceDefinition> = {
  'power-positive': {
    kind: 'power-positive',
    name: '直流正极',
    category: 'source',
    group: '电源与母线',
    description: '提供可调直流正电位，默认与负极形成一组电源。',
    simulationRole: 'fixed-source',
    effectKind: 'none',
    terminals: [{ id: 'out', label: '正极输出', role: 'positive' }]
  },
  'power-negative': {
    kind: 'power-negative',
    name: '直流负极',
    category: 'source',
    group: '电源与母线',
    description: '电源回路负极，作为仿真参考地。',
    simulationRole: 'reference',
    effectKind: 'none',
    terminals: [{ id: 'in', label: '负极回线', role: 'negative' }]
  },
  switch: {
    kind: 'switch',
    name: '开关',
    category: 'control',
    group: '输入与开关',
    description: '闭合时导通，断开时切断当前支路。',
    simulationRole: 'conductive-control',
    effectKind: 'logic',
    terminals: [
      { id: 'a', label: '进线', role: 'input' },
      { id: 'b', label: '出线', role: 'output' }
    ]
  },
  'push-button': {
    kind: 'push-button',
    name: '按钮开关',
    category: 'input',
    group: '输入与开关',
    description: '低压控制按钮，可作为启停、复位、触发输入。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 5,
    defaultResistance: 120,
    terminals: twoTerminal
  },
  'dip-switch': {
    kind: 'dip-switch',
    name: '拨码开关',
    category: 'input',
    group: '输入与开关',
    description: '多位拨码输入，常用于地址、模式和参数配置。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 5,
    defaultResistance: 180,
    terminals: twoTerminal
  },
  lamp: {
    kind: 'lamp',
    name: '灯泡',
    category: 'indicator',
    group: '指示与显示',
    description: '阻性照明负载，按端电压计算亮度。',
    simulationRole: 'resistive-load',
    effectKind: 'glow',
    defaultRatedVoltage: 12,
    defaultResistance: 24,
    terminals: twoTerminal
  },
  led: {
    kind: 'led',
    name: '发光二极管',
    category: 'indicator',
    group: '指示与显示',
    description: '低压指示灯，适合状态、告警和通电提示。',
    simulationRole: 'resistive-load',
    effectKind: 'glow',
    defaultRatedVoltage: 3,
    defaultResistance: 36,
    terminals: twoTerminal
  },
  'rgb-led': {
    kind: 'rgb-led',
    name: '三色指示灯',
    category: 'indicator',
    group: '指示与显示',
    description: '多色状态指示，可扩展为红绿蓝独立通道。',
    simulationRole: 'resistive-load',
    effectKind: 'multi-glow',
    defaultRatedVoltage: 5,
    defaultResistance: 40,
    terminals: twoTerminal
  },
  display: {
    kind: 'display',
    name: '字符显示屏',
    category: 'display',
    group: '指示与显示',
    description: 'LCD/OLED 类低压显示模块，通电后显示运行状态。',
    simulationRole: 'resistive-load',
    effectKind: 'display',
    defaultRatedVoltage: 5,
    defaultResistance: 90,
    terminals: twoTerminal
  },
  'seven-segment': {
    kind: 'seven-segment',
    name: '数码管',
    category: 'display',
    group: '指示与显示',
    description: '七段式数字显示器，适合计数、电压和模式显示。',
    simulationRole: 'resistive-load',
    effectKind: 'display',
    defaultRatedVoltage: 5,
    defaultResistance: 70,
    terminals: twoTerminal
  },
  buzzer: {
    kind: 'buzzer',
    name: '蜂鸣器',
    category: 'actuator',
    group: '执行器',
    description: '声光告警常用器件，通电后按电压强度鸣响。',
    simulationRole: 'resistive-load',
    effectKind: 'tone',
    defaultRatedVoltage: 5,
    defaultResistance: 35,
    terminals: twoTerminal
  },
  relay: {
    kind: 'relay',
    name: '继电器线圈',
    category: 'actuator',
    group: '执行器',
    description: '低压线圈吸合后可扩展控制大电流触点。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 12,
    defaultResistance: 60,
    terminals: twoTerminal
  },
  solenoid: {
    kind: 'solenoid',
    name: '电磁铁',
    category: 'actuator',
    group: '执行器',
    description: '通电后产生吸力，可模拟锁扣、阀门和推拉机构。',
    simulationRole: 'resistive-load',
    effectKind: 'pull',
    defaultRatedVoltage: 12,
    defaultResistance: 20,
    terminals: twoTerminal
  },
  fan: {
    kind: 'fan',
    name: '电扇',
    category: 'motor',
    group: '电机',
    description: '风扇电机负载，按端电压计算转速。',
    simulationRole: 'resistive-load',
    effectKind: 'spin',
    defaultRatedVoltage: 12,
    defaultResistance: 18,
    terminals: twoTerminal
  },
  'dc-motor': {
    kind: 'dc-motor',
    name: '直流电机',
    category: 'motor',
    group: '电机',
    description: '普通直流电机，可扩展正反转和调速控制。',
    simulationRole: 'resistive-load',
    effectKind: 'spin',
    defaultRatedVoltage: 12,
    defaultResistance: 16,
    terminals: twoTerminal
  },
  'stepper-motor': {
    kind: 'stepper-motor',
    name: '步进电机',
    category: 'motor',
    group: '电机',
    description: '按脉冲步进运动的电机，适合多相驱动和定位控制训练。',
    simulationRole: 'resistive-load',
    effectKind: 'step',
    defaultRatedVoltage: 12,
    defaultResistance: 28,
    terminals: twoTerminal
  },
  'servo-motor': {
    kind: 'servo-motor',
    name: '舵机',
    category: 'motor',
    group: '电机',
    description: '三线舵机模块，适合角度控制、机构联动和低压供电训练。',
    simulationRole: 'resistive-load',
    effectKind: 'sweep',
    defaultRatedVoltage: 5,
    defaultResistance: 22,
    terminals: twoTerminal
  },
  resistor: {
    kind: 'resistor',
    name: '电阻',
    category: 'passive',
    group: '基础无源件',
    description: '限流、分压和负载模拟的基础元件。',
    simulationRole: 'resistive-load',
    effectKind: 'resist',
    defaultRatedVoltage: 12,
    defaultResistance: 100,
    terminals: twoTerminal
  },
  potentiometer: {
    kind: 'potentiometer',
    name: '电位器',
    category: 'passive',
    group: '基础无源件',
    description: '可调电阻输入，常用于调光、调速和模拟量设定。',
    simulationRole: 'resistive-load',
    effectKind: 'adjust',
    defaultRatedVoltage: 5,
    defaultResistance: 120,
    terminals: twoTerminal
  },
  diode: {
    kind: 'diode',
    name: '二极管',
    category: 'passive',
    group: '基础无源件',
    description: '单向导通保护器件，适合极性、防反接和保护回路训练。',
    simulationRole: 'resistive-load',
    effectKind: 'pass',
    defaultRatedVoltage: 5,
    defaultResistance: 55,
    terminals: twoTerminal
  },
  capacitor: {
    kind: 'capacitor',
    name: '电容',
    category: 'passive',
    group: '基础无源件',
    description: '储能、滤波和延时元件，适合电源平滑和启动过程训练。',
    simulationRole: 'resistive-load',
    effectKind: 'store',
    defaultRatedVoltage: 16,
    defaultResistance: 300,
    terminals: twoTerminal
  },
  fuse: {
    kind: 'fuse',
    name: '熔断器',
    category: 'passive',
    group: '保护与驱动',
    description: '1P/2P/3P/4P 过流保护器件，适合熔断保护、分断和故障排查训练。',
    simulationRole: 'resistive-load',
    effectKind: 'protect',
    defaultRatedVoltage: 12,
    defaultResistance: 1000,
    terminals: twoTerminal
  },
  'circuit-breaker': {
    kind: 'circuit-breaker',
    name: '断路器',
    category: 'passive',
    group: '电柜保护',
    description: '1P/2P/3P/4P 小型断路器，用于隔离、短路和过载保护训练。',
    simulationRole: 'resistive-load',
    effectKind: 'protect',
    defaultRatedVoltage: 220,
    defaultResistance: 1000,
    terminals: twoTerminal
  },
  'ac-contactor': {
    kind: 'ac-contactor',
    name: '交流接触器',
    category: 'actuator',
    group: '电柜控制',
    description: '220V/380V 交流线圈接触器，模拟线圈吸合、主触点闭合和电机控制侧。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 220,
    defaultResistance: 1200,
    terminals: twoTerminal
  },
  'dc-contactor': {
    kind: 'dc-contactor',
    name: '直流接触器',
    category: 'actuator',
    group: '电柜控制',
    description: '24V 直流线圈接触器，适合 PLC 输出驱动、联锁和低压控制柜训练。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 24,
    defaultResistance: 80,
    terminals: twoTerminal
  },
  'auxiliary-contact': {
    kind: 'auxiliary-contact',
    name: '接触器辅助触头',
    category: 'input',
    group: '电柜控制',
    description: '接触器常开/常闭辅助触点，用于自锁、互锁和状态反馈。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 160,
    terminals: twoTerminal
  },
  'ac-time-relay': {
    kind: 'ac-time-relay',
    name: '交流时间继电器',
    category: 'actuator',
    group: '电柜控制',
    description: '220V/380V 延时继电器，模拟通电延时、断电延时和顺序控制。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 220,
    defaultResistance: 1800,
    terminals: twoTerminal
  },
  'dc-time-relay': {
    kind: 'dc-time-relay',
    name: '直流时间继电器',
    category: 'actuator',
    group: '电柜控制',
    description: '24V 直流延时继电器，用于 PLC 辅助延时、顺序启动和保护链训练。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 24,
    defaultResistance: 120,
    terminals: twoTerminal
  },
  'ac-intermediate-relay': {
    kind: 'ac-intermediate-relay',
    name: '交流中间继电器',
    category: 'actuator',
    group: '电柜控制',
    description: '220V/380V 中间继电器，扩展触点容量并隔离控制逻辑。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 220,
    defaultResistance: 1600,
    terminals: twoTerminal
  },
  'dc-intermediate-relay': {
    kind: 'dc-intermediate-relay',
    name: '直流中间继电器',
    category: 'actuator',
    group: '电柜控制',
    description: '24V 中间继电器，常用于 PLC 输出隔离、信号转接和触点扩展。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 24,
    defaultResistance: 100,
    terminals: twoTerminal
  },
  'switching-power-supply': {
    kind: 'switching-power-supply',
    name: '开关电源',
    category: 'interface',
    group: '电源与母线',
    description: '控制柜常用 AC-DC 电源模块，典型输出 24V DC，为 PLC、继电器和传感器供电。',
    simulationRole: 'resistive-load',
    effectKind: 'interface',
    defaultRatedVoltage: 220,
    defaultResistance: 900,
    terminals: twoTerminal
  },
  'self-reset-button': {
    kind: 'self-reset-button',
    name: '自复位按钮',
    category: 'input',
    group: '输入与开关',
    description: '黄/绿/红等常用颜色的瞬时按钮，松手后回到初始状态。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 140,
    terminals: twoTerminal
  },
  'self-lock-button': {
    kind: 'self-lock-button',
    name: '自锁按钮',
    category: 'input',
    group: '输入与开关',
    description: '黄/绿/红等常用颜色的保持按钮，按下后维持闭合状态直到再次释放。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 130,
    terminals: twoTerminal
  },
  'rotary-switch': {
    kind: 'rotary-switch',
    name: '旋转开关',
    category: 'input',
    group: '输入与开关',
    description: '两位/三位选择开关，用于手自动、正反转和模式选择。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 150,
    terminals: twoTerminal
  },
  'pilot-light': {
    kind: 'pilot-light',
    name: '指示灯',
    category: 'indicator',
    group: '指示与显示',
    description: '黄/绿/红等面板指示灯，用于电源、运行、故障和状态反馈。',
    simulationRole: 'resistive-load',
    effectKind: 'glow',
    defaultRatedVoltage: 24,
    defaultResistance: 160,
    terminals: twoTerminal
  },
  voltmeter: {
    kind: 'voltmeter',
    name: '电压表',
    category: 'display',
    group: '指示与显示',
    description: '面板电压表，通电后显示回路电压，适合量程判断和交直流识别训练。',
    simulationRole: 'resistive-load',
    effectKind: 'display',
    defaultRatedVoltage: 24,
    defaultResistance: 10000,
    terminals: twoTerminal
  },
  ammeter: {
    kind: 'ammeter',
    name: '电流表',
    category: 'display',
    group: '指示与显示',
    description: '面板电流表，用于观察回路通电和电流变化，适合负载与保护训练。',
    simulationRole: 'resistive-load',
    effectKind: 'display',
    defaultRatedVoltage: 24,
    defaultResistance: 1000,
    terminals: twoTerminal
  },
  'gray-terminal': {
    kind: 'gray-terminal',
    name: '灰色端子',
    category: 'interface',
    group: '端子与配线',
    description: '控制柜通用直通端子，常用于相线、信号线和普通回路转接。',
    simulationRole: 'resistive-load',
    effectKind: 'interface',
    defaultRatedVoltage: 24,
    defaultResistance: 1000,
    terminals: twoTerminal
  },
  'pe-terminal': {
    kind: 'pe-terminal',
    name: '黄绿色端子',
    category: 'interface',
    group: '端子与配线',
    description: '保护接地端子，用黄绿色标识保护地，训练接地和安全隔离意识。',
    simulationRole: 'resistive-load',
    effectKind: 'protect',
    defaultRatedVoltage: 24,
    defaultResistance: 1000,
    terminals: twoTerminal
  },
  'three-phase-motor': {
    kind: 'three-phase-motor',
    name: '三相异步电动机',
    category: 'motor',
    group: '电机',
    description: '三相鼠笼式异步电机，用于接触器、热继和动力回路训练。',
    simulationRole: 'resistive-load',
    effectKind: 'spin',
    defaultRatedVoltage: 380,
    defaultResistance: 45,
    terminals: twoTerminal
  },
  'heating-tube': {
    kind: 'heating-tube',
    name: '加热管',
    category: 'actuator',
    group: '执行器',
    description: '阻性加热负载，用于温控、过载保护和功率估算训练。',
    simulationRole: 'resistive-load',
    effectKind: 'heat',
    defaultRatedVoltage: 220,
    defaultResistance: 80,
    terminals: twoTerminal
  },
  'transistor-driver': {
    kind: 'transistor-driver',
    name: '三极管/MOS 驱动',
    category: 'driver',
    group: '保护与驱动',
    description: '小信号控制大电流负载的驱动级接口。',
    simulationRole: 'resistive-load',
    effectKind: 'drive',
    defaultRatedVoltage: 5,
    defaultResistance: 90,
    terminals: twoTerminal
  },
  microcontroller: {
    kind: 'microcontroller',
    name: '控制器模块',
    category: 'interface',
    group: '控制与接口',
    description: '单片机或小型控制板，用于 I/O 采集、继电器驱动和程序控制训练。',
    simulationRole: 'resistive-load',
    effectKind: 'compute',
    defaultRatedVoltage: 5,
    defaultResistance: 85,
    terminals: twoTerminal
  },
  photoresistor: {
    kind: 'photoresistor',
    name: '光敏电阻',
    category: 'sensor',
    group: '传感器',
    description: '检测环境光强，可扩展为光控开关或模拟量输入。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 160,
    terminals: twoTerminal
  },
  thermistor: {
    kind: 'thermistor',
    name: '热敏电阻',
    category: 'sensor',
    group: '传感器',
    description: '检测温度变化，可扩展为过温告警或温控回路。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 150,
    terminals: twoTerminal
  },
  'pir-sensor': {
    kind: 'pir-sensor',
    name: '人体感应',
    category: 'sensor',
    group: '传感器',
    description: 'PIR 感应模块，适合门禁、照明和安防触发。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 140,
    terminals: twoTerminal
  },
  'ultrasonic-sensor': {
    kind: 'ultrasonic-sensor',
    name: '超声波测距',
    category: 'sensor',
    group: '传感器',
    description: '发射和接收超声波脉冲，用于测距和避障。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 95,
    terminals: twoTerminal
  },
  'hall-sensor': {
    kind: 'hall-sensor',
    name: '霍尔传感器',
    category: 'sensor',
    group: '传感器',
    description: '检测磁场或转速，可扩展为限位、测速和位置反馈。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 130,
    terminals: twoTerminal
  },
  'humidity-sensor': {
    kind: 'humidity-sensor',
    name: '温湿度传感器',
    category: 'sensor',
    group: '传感器',
    description: '采集环境温湿度，可扩展为通风或告警控制。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 5,
    defaultResistance: 125,
    terminals: twoTerminal
  },
  'plc-controller': {
    kind: 'plc-controller',
    name: 'PLC 控制器',
    category: 'interface',
    group: '工程工控',
    description: '工业控制核心模块，用于 24V 控制电源、I/O 状态和联锁逻辑训练。',
    simulationRole: 'resistive-load',
    effectKind: 'compute',
    defaultRatedVoltage: 24,
    defaultResistance: 220,
    terminals: twoTerminal
  },
  'vfd-drive': {
    kind: 'vfd-drive',
    name: '变频器控制端',
    category: 'driver',
    group: '工程工控',
    description: '电机变频器的低压控制端，适合训练启停、联锁和调速链路。',
    simulationRole: 'resistive-load',
    effectKind: 'drive',
    defaultRatedVoltage: 24,
    defaultResistance: 180,
    terminals: twoTerminal
  },
  'contactor-coil': {
    kind: 'contactor-coil',
    name: '接触器线圈',
    category: 'actuator',
    group: '工程工控',
    description: '接触器低压线圈，用于模拟电机或大功率回路的控制侧吸合。',
    simulationRole: 'resistive-load',
    effectKind: 'relay',
    defaultRatedVoltage: 24,
    defaultResistance: 70,
    terminals: twoTerminal
  },
  'thermal-overload': {
    kind: 'thermal-overload',
    name: '热继保护触点',
    category: 'passive',
    group: '工程工控',
    description: '过载保护反馈触点，用于电机保护、故障停机和复位流程训练。',
    simulationRole: 'resistive-load',
    effectKind: 'protect',
    defaultRatedVoltage: 24,
    defaultResistance: 160,
    terminals: twoTerminal
  },
  'emergency-stop': {
    kind: 'emergency-stop',
    name: '急停按钮',
    category: 'input',
    group: '工程工控',
    description: '急停回路训练模块，用于安全联锁、停机和风险排查。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 120,
    terminals: twoTerminal
  },
  'limit-switch': {
    kind: 'limit-switch',
    name: '行程限位',
    category: 'input',
    group: '工程工控',
    description: '机械限位反馈输入，适合门机、升降和输送设备训练。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 24,
    defaultResistance: 140,
    terminals: twoTerminal
  },
  'proximity-sensor': {
    kind: 'proximity-sensor',
    name: '接近开关',
    category: 'sensor',
    group: '工程工控',
    description: '电感/电容式接近检测，适合工位到位、计数和联锁输入。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 24,
    defaultResistance: 150,
    terminals: twoTerminal
  },
  'stack-light': {
    kind: 'stack-light',
    name: '三色塔灯',
    category: 'indicator',
    group: '工程工控',
    description: '红黄绿设备状态指示灯，适合运行、待机、故障状态训练。',
    simulationRole: 'resistive-load',
    effectKind: 'multi-glow',
    defaultRatedVoltage: 24,
    defaultResistance: 95,
    terminals: twoTerminal
  },
  'solenoid-valve': {
    kind: 'solenoid-valve',
    name: '电磁阀线圈',
    category: 'actuator',
    group: '工程工控',
    description: '气动或水路阀门线圈，通电后模拟阀门动作。',
    simulationRole: 'resistive-load',
    effectKind: 'pull',
    defaultRatedVoltage: 24,
    defaultResistance: 60,
    terminals: twoTerminal
  },
  'pressure-transmitter': {
    kind: 'pressure-transmitter',
    name: '压力变送器',
    category: 'sensor',
    group: '工程工控',
    description: '过程量采集模块，用于 24V 传感器供电、信号采集和联锁判断训练。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 24,
    defaultResistance: 210,
    terminals: twoTerminal
  },
  'smart-gateway': {
    kind: 'smart-gateway',
    name: '智能网关',
    category: 'interface',
    group: '装修工控',
    description: '户内总线、蓝牙或 Zigbee 网关，作为家装控制系统通信核心。',
    simulationRole: 'resistive-load',
    effectKind: 'interface',
    defaultRatedVoltage: 12,
    defaultResistance: 110,
    terminals: twoTerminal
  },
  'smart-switch-panel': {
    kind: 'smart-switch-panel',
    name: '智能开关面板',
    category: 'input',
    group: '装修工控',
    description: '照明与场景控制面板，适合回路分区、联动和弱电供电训练。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 12,
    defaultResistance: 130,
    terminals: twoTerminal
  },
  'dimmer-module': {
    kind: 'dimmer-module',
    name: '调光模块',
    category: 'driver',
    group: '装修工控',
    description: '照明调光执行模块，训练灯带、筒灯和情景照明控制。',
    simulationRole: 'resistive-load',
    effectKind: 'adjust',
    defaultRatedVoltage: 12,
    defaultResistance: 80,
    terminals: twoTerminal
  },
  'curtain-motor': {
    kind: 'curtain-motor',
    name: '窗帘电机',
    category: 'motor',
    group: '装修工控',
    description: '低压窗帘执行器，适合家装场景联动和限位反馈训练。',
    simulationRole: 'resistive-load',
    effectKind: 'spin',
    defaultRatedVoltage: 12,
    defaultResistance: 24,
    terminals: twoTerminal
  },
  'floor-heating-thermostat': {
    kind: 'floor-heating-thermostat',
    name: '地暖温控器',
    category: 'interface',
    group: '装修工控',
    description: '温控面板与执行器联动模块，适合暖通与温度控制训练。',
    simulationRole: 'resistive-load',
    effectKind: 'display',
    defaultRatedVoltage: 12,
    defaultResistance: 120,
    terminals: twoTerminal
  },
  'leak-detector': {
    kind: 'leak-detector',
    name: '漏水探测器',
    category: 'sensor',
    group: '装修工控',
    description: '厨卫漏水告警传感器，可联动电磁阀或声光提示。',
    simulationRole: 'resistive-load',
    effectKind: 'sense',
    defaultRatedVoltage: 12,
    defaultResistance: 150,
    terminals: twoTerminal
  },
  'scene-panel': {
    kind: 'scene-panel',
    name: '情景面板',
    category: 'input',
    group: '装修工控',
    description: '一键回家、离家、观影等场景触发面板，适合多回路联动训练。',
    simulationRole: 'resistive-load',
    effectKind: 'logic',
    defaultRatedVoltage: 12,
    defaultResistance: 145,
    terminals: twoTerminal
  },
  'access-control': {
    kind: 'access-control',
    name: '门禁控制器',
    category: 'interface',
    group: '装修工控',
    description: '门锁、读卡器和开门按钮控制核心，适合弱电安防训练。',
    simulationRole: 'resistive-load',
    effectKind: 'compute',
    defaultRatedVoltage: 12,
    defaultResistance: 95,
    terminals: twoTerminal
  },
  'extension-load': {
    kind: 'extension-load',
    name: '扩展接入点',
    category: 'interface',
    group: '控制与接口',
    description: '面向更多电器、电压等级和传感器的通用接入点。',
    simulationRole: 'resistive-load',
    effectKind: 'interface',
    defaultRatedVoltage: 12,
    defaultResistance: 30,
    terminals: twoTerminal
  }
}

export const DEVICE_PALETTE = Object.values(DEVICE_REGISTRY)

export function getDeviceDefinition(kind: DeviceKind) {
  return DEVICE_REGISTRY[kind]
}

export function isLoadKind(kind: DeviceKind) {
  return DEVICE_REGISTRY[kind].simulationRole === 'resistive-load'
}

export function isConductiveControlKind(kind: DeviceKind) {
  return DEVICE_REGISTRY[kind].simulationRole === 'conductive-control'
}

export function canAutoConnect(kind: DeviceKind) {
  const definition = DEVICE_REGISTRY[kind]
  return definition.simulationRole === 'resistive-load'
}

export function formatEffectLabel(kind: DeviceKind, effectKind: EffectKind, intensity: number, active: boolean) {
  if (!active) return '未通电'

  const percent = Math.round(Math.max(0, Math.min(1, intensity)) * 100)

  switch (effectKind) {
    case 'glow':
      return `亮度 ${percent}%`
    case 'multi-glow':
      return `三色点亮 ${percent}%`
    case 'spin':
      return `转速 ${percent}%`
    case 'step':
      return `步进运行 ${percent}%`
    case 'sweep':
      return `舵角响应 ${percent}%`
    case 'tone':
      return `鸣响 ${percent}%`
    case 'pull':
      return `吸合 ${percent}%`
    case 'relay':
      return `线圈吸合 ${percent}%`
    case 'resist':
      return `限流 ${percent}%`
    case 'heat':
      return `发热 ${percent}%`
    case 'adjust':
      return `可调输入 ${percent}%`
    case 'pass':
      return `导通 ${percent}%`
    case 'store':
      return `充电 ${percent}%`
    case 'protect':
      return `保护在线 ${percent}%`
    case 'drive':
      return `驱动就绪 ${percent}%`
    case 'compute':
      return `控制器运行 ${percent}%`
    case 'display':
      return `显示点亮 ${percent}%`
    case 'sense':
      return `采集上电 ${percent}%`
    case 'logic':
      return `输入有效 ${percent}%`
    case 'interface':
      return kind === 'extension-load' ? `接口供电 ${percent}%` : `接口就绪 ${percent}%`
    default:
      return `工作 ${percent}%`
  }
}
