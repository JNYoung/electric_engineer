import { createBranchWires, createDevice, createInitialCircuit, wire } from './circuitFactory'
import { getDeviceDefinition, isLoadKind } from './registry'
import type { CircuitDevice, CircuitModel, DeviceKind, SimulationResult } from './types'

export type LessonStage = '入门' | '进阶' | '实训'
export type ChallengeLevel = '基础' | '进阶' | '综合'

export interface LearningLesson {
  id: string
  title: string
  stage: LessonStage
  minutes: number
  summary: string
  goals: string[]
  coreIdeas: string[]
  drills: string[]
  safetyChecks: string[]
  challengeIds: string[]
}

interface ChallengeDeviceSetup {
  kind: DeviceKind
  label?: string
  ratedVoltage?: number
  resistance?: number
  x?: number
  y?: number
}

interface ChallengeSetup {
  voltage: number
  switchClosed?: boolean
  addDevices?: ChallengeDeviceSetup[]
  disconnectedWires?: string[]
  shortSource?: boolean
}

type ChallengeRule =
  | {
      id: string
      kind: 'closed-circuit' | 'no-short-circuit' | 'no-critical-issues'
      label: string
      points: number
      help: string
    }
  | {
      id: string
      kind: 'wire-connected'
      wireId: string
      label: string
      points: number
      help: string
    }
  | {
      id: string
      kind: 'active-kind'
      deviceKind: DeviceKind
      minCount: number
      label: string
      points: number
      help: string
    }
  | {
      id: string
      kind: 'voltage-range'
      deviceKind: DeviceKind
      min: number
      max: number
      label: string
      points: number
      help: string
    }
  | {
      id: string
      kind: 'supply-range'
      min: number
      max: number
      label: string
      points: number
      help: string
    }
  | {
      id: string
      kind: 'total-current-under'
      max: number
      min?: number
      label: string
      points: number
      help: string
    }

export interface TrainingChallenge {
  id: string
  lessonId: string
  title: string
  level: ChallengeLevel
  estimatedMinutes: number
  objective: string
  scenario: string
  focus: string[]
  setup: ChallengeSetup
  rules: ChallengeRule[]
  hints: string[]
}

export interface ChallengeRuleResult {
  id: string
  label: string
  help: string
  points: number
  passed: boolean
  detail: string
}

export interface ChallengeEvaluation {
  challengeId: string
  score: number
  maxScore: number
  percent: number
  passedCount: number
  totalCount: number
  status: 'ready' | 'needs-work' | 'passed'
  ruleResults: ChallengeRuleResult[]
  nextActions: string[]
}

export interface SafetyDiagnostic {
  id: string
  severity: 'ok' | 'info' | 'warning' | 'danger'
  title: string
  detail: string
  action: string
}

export const LEARNING_LESSONS: LearningLesson[] = [
  {
    id: 'dc-basics',
    title: '直流回路基础',
    stage: '入门',
    minutes: 18,
    summary: '从正极、开关、负载、回线四个部分理解低压直流闭合回路。',
    goals: ['识别电源正负极与参考地', '判断开关断开和闭合对支路的影响', '读取电压、电流和功率'],
    coreIdeas: ['节点电位', '并联支路', '等效电阻'],
    drills: ['切换主开关观察负载状态', '断开单支路回线并定位故障', '比较灯泡与电扇电流'],
    safetyChecks: ['确认负载回线接回负极', '避免正负极直接短接', '优先使用 12V 以内低压训练'],
    challengeIds: ['lighting-fault']
  },
  {
    id: 'control-actuator',
    title: '控制与执行器',
    stage: '进阶',
    minutes: 26,
    summary: '把蜂鸣器、继电器和电机放入同一低压控制回路，训练联动负载的电流估算。',
    goals: ['建立多执行器并联支路', '判断线圈与声光负载是否吸合', '控制总电流不超过训练阈值'],
    coreIdeas: ['线圈负载', '告警支路', '总电流预算'],
    drills: ['加入蜂鸣器和继电器', '观察总电流变化', '逐根断开导线验证支路独立性'],
    safetyChecks: ['执行器支路需保留回线', '总电流异常升高时先断开电源', '继电器线圈不等同于触点输出'],
    challengeIds: ['ventilation-alarm']
  },
  {
    id: 'sensor-interface',
    title: '传感器与接口',
    stage: '实训',
    minutes: 32,
    summary: '把控制板、传感器、指示灯和显示屏接入 5V 回路，形成完整的弱电输入输出训练。',
    goals: ['为 5V 模块选择合适电源', '让传感器与显示模块同时上电', '识别过压和欠压风险'],
    coreIdeas: ['接口供电', '传感输入', '额定电压'],
    drills: ['把电源降到 5V', '检查控制板和传感器状态', '观察 LED 与显示模块亮度'],
    safetyChecks: ['5V 模块不要长期接 12V', '新增模块前先确认额定电压', '发现短路时停止继续加负载'],
    challengeIds: ['sensor-io']
  }
]

export const TRAINING_CHALLENGES: TrainingChallenge[] = [
  {
    id: 'lighting-fault',
    lessonId: 'dc-basics',
    title: '照明支路排障',
    level: '基础',
    estimatedMinutes: 8,
    objective: '定位灯泡不亮的原因，让照明和排风两个并联支路恢复运行。',
    scenario: '灯泡回线被断开，排风扇仍然运行。学员需要接回故障导线并确认回路健康。',
    focus: ['闭合回路', '并联支路', '导线排障'],
    setup: {
      voltage: 12,
      switchClosed: true,
      disconnectedWires: ['w-lamp-neg']
    },
    rules: [
      {
        id: 'lamp-return',
        kind: 'wire-connected',
        wireId: 'w-lamp-neg',
        label: '灯泡回线已接回负极',
        points: 20,
        help: '在导线列表中找到“灯泡回负极”，把它切换为接入。'
      },
      {
        id: 'closed',
        kind: 'closed-circuit',
        label: '主回路处于闭合状态',
        points: 20,
        help: '确认主开关为闭合，并且至少一个负载形成正负极通路。'
      },
      {
        id: 'lamp-active',
        kind: 'active-kind',
        deviceKind: 'lamp',
        minCount: 1,
        label: '照明灯点亮',
        points: 25,
        help: '灯泡需要同时接入正极支路和负极回线。'
      },
      {
        id: 'fan-active',
        kind: 'active-kind',
        deviceKind: 'fan',
        minCount: 1,
        label: '排风支路保持运行',
        points: 15,
        help: '排风支路不应因为维修照明支路而被断开。'
      },
      {
        id: 'safe',
        kind: 'no-short-circuit',
        label: '无正负极短接',
        points: 20,
        help: '正极母线不能直接接到负极回线。'
      }
    ],
    hints: ['先看哪一个负载没有电压', '并联支路故障不会必然影响其他支路', '回线断开时导线会显示“已断开”']
  },
  {
    id: 'ventilation-alarm',
    lessonId: 'control-actuator',
    title: '排风告警联动',
    level: '进阶',
    estimatedMinutes: 12,
    objective: '在排风回路中加入蜂鸣器与继电器线圈，并保持总电流处于低压训练范围。',
    scenario: '模拟机房排风与告警同时启动：风扇、蜂鸣器、继电器线圈应全部上电。',
    focus: ['执行器', '总电流', '并联扩展'],
    setup: {
      voltage: 12,
      switchClosed: true,
      addDevices: [
        { kind: 'buzzer', label: '声光蜂鸣器', x: 462, y: 430 },
        { kind: 'relay', label: '告警继电器', x: 462, y: 556 }
      ]
    },
    rules: [
      {
        id: 'closed',
        kind: 'closed-circuit',
        label: '联动回路已闭合',
        points: 15,
        help: '主开关、正极进线和负极回线都需要接通。'
      },
      {
        id: 'fan-active',
        kind: 'active-kind',
        deviceKind: 'fan',
        minCount: 1,
        label: '排风扇运行',
        points: 20,
        help: '排风扇是本任务的基础执行器。'
      },
      {
        id: 'buzzer-active',
        kind: 'active-kind',
        deviceKind: 'buzzer',
        minCount: 1,
        label: '蜂鸣器鸣响',
        points: 20,
        help: '蜂鸣器支路必须完整接到开关输出和负极。'
      },
      {
        id: 'relay-active',
        kind: 'active-kind',
        deviceKind: 'relay',
        minCount: 1,
        label: '继电器线圈吸合',
        points: 20,
        help: '继电器线圈按等效负载参与电流计算。'
      },
      {
        id: 'current-budget',
        kind: 'total-current-under',
        min: 0.5,
        max: 2,
        label: '总电流低于 2A',
        points: 15,
        help: '训练回路的总电流应留出余量。'
      },
      {
        id: 'safe',
        kind: 'no-critical-issues',
        label: '无错误或告警',
        points: 10,
        help: '处理短路、断线和电源缺失后再提交。'
      }
    ],
    hints: ['新增执行器会增加总电流', '继电器线圈吸合不代表触点侧已经建模', '先保证每个新增负载都有两根支路导线']
  },
  {
    id: 'sensor-io',
    lessonId: 'sensor-interface',
    title: '5V 传感接口训练',
    level: '综合',
    estimatedMinutes: 15,
    objective: '把控制板、人体感应、LED 与显示屏接入 5V 训练回路，检查模块额定电压。',
    scenario: '模拟门禁状态采集：控制板读取 PIR 传感器，并通过 LED 和显示屏显示状态。',
    focus: ['5V 供电', '传感器', '显示接口', '过压诊断'],
    setup: {
      voltage: 5,
      switchClosed: true,
      addDevices: [
        { kind: 'microcontroller', label: '门禁控制板', x: 462, y: 430 },
        { kind: 'pir-sensor', label: '人体感应模块', x: 462, y: 556 },
        { kind: 'led', label: '状态 LED', x: 462, y: 682 },
        { kind: 'display', label: '门禁显示屏', x: 462, y: 808 }
      ]
    },
    rules: [
      {
        id: 'voltage',
        kind: 'supply-range',
        min: 4.8,
        max: 5.2,
        label: '电源保持在 5V 范围',
        points: 20,
        help: '使用电压步进按钮把训练电源调到 5V。'
      },
      {
        id: 'controller-active',
        kind: 'active-kind',
        deviceKind: 'microcontroller',
        minCount: 1,
        label: '控制板运行',
        points: 20,
        help: '控制板需要完整的供电支路。'
      },
      {
        id: 'sensor-active',
        kind: 'active-kind',
        deviceKind: 'pir-sensor',
        minCount: 1,
        label: '人体感应模块上电',
        points: 20,
        help: '传感器支路需要同时接到正极和负极。'
      },
      {
        id: 'indicator-active',
        kind: 'active-kind',
        deviceKind: 'led',
        minCount: 1,
        label: '状态 LED 点亮',
        points: 15,
        help: 'LED 额定电压较低，重点观察安全诊断。'
      },
      {
        id: 'display-voltage',
        kind: 'voltage-range',
        deviceKind: 'display',
        min: 4.5,
        max: 5.5,
        label: '显示屏端电压合适',
        points: 15,
        help: '显示屏应接近 5V 工作。'
      },
      {
        id: 'safe',
        kind: 'no-short-circuit',
        label: '无短路风险',
        points: 10,
        help: '任何正负极短接都会让训练失败。'
      }
    ],
    hints: ['这个任务看重额定电压匹配', '5V 模块上 12V 会触发过压诊断', '显示屏端电压可以在属性面板查看']
  }
]

export function getLessonById(lessonId: string) {
  return LEARNING_LESSONS.find((lesson) => lesson.id === lessonId) ?? LEARNING_LESSONS[0]
}

export function getChallengeById(challengeId: string) {
  return TRAINING_CHALLENGES.find((challenge) => challenge.id === challengeId) ?? TRAINING_CHALLENGES[0]
}

function patchDevice(model: CircuitModel, deviceId: string, patch: Partial<CircuitDevice>): CircuitModel {
  return {
    ...model,
    devices: model.devices.map((device) =>
      device.id === deviceId ? { ...device, ...patch } : device
    )
  }
}

function patchWireConnected(model: CircuitModel, wireId: string, connected: boolean): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((item) => (item.id === wireId ? { ...item, connected } : item))
  }
}

function countDevicesByKind(model: CircuitModel, kind: DeviceKind) {
  return model.devices.filter((device) => device.kind === kind).length
}

export function createTrainingCircuit(challengeId: string): CircuitModel {
  const challenge = getChallengeById(challengeId)
  let model = createInitialCircuit(challenge.setup.voltage)

  if (challenge.setup.switchClosed !== undefined) {
    model = patchDevice(model, 's1', { isClosed: challenge.setup.switchClosed })
  }

  challenge.setup.addDevices?.forEach((item, offset) => {
    const index = offset + 1
    const sameKindIndex = countDevicesByKind(model, item.kind) + 1
    const nextDevice = {
      ...createDevice(item.kind, index, sameKindIndex),
      label: item.label ?? createDevice(item.kind, index, sameKindIndex).label,
      ratedVoltage: item.ratedVoltage ?? getDeviceDefinition(item.kind).defaultRatedVoltage,
      resistance: item.resistance ?? getDeviceDefinition(item.kind).defaultResistance,
      x: item.x ?? 430,
      y: item.y ?? 420 + offset * 126
    }

    model = {
      devices: [...model.devices, nextDevice],
      wires: [...model.wires, ...createBranchWires(nextDevice.id, index, nextDevice.label)]
    }
  })

  challenge.setup.disconnectedWires?.forEach((wireId) => {
    model = patchWireConnected(model, wireId, false)
  })

  if (challenge.setup.shortSource) {
    model = {
      ...model,
      wires: [...model.wires, wire('w-training-short', 'p1', 'out', 'n1', 'in', '训练短接线')]
    }
  }

  return model
}

function activeDeviceCount(model: CircuitModel, simulation: SimulationResult, kind: DeviceKind) {
  return model.devices.filter((device) => device.kind === kind && simulation.effects[device.id]?.active).length
}

function voltagesForKind(model: CircuitModel, simulation: SimulationResult, kind: DeviceKind) {
  return model.devices
    .filter((device) => device.kind === kind)
    .map((device) => simulation.effects[device.id]?.voltage ?? 0)
}

function evaluateRule(
  rule: ChallengeRule,
  model: CircuitModel,
  simulation: SimulationResult
): ChallengeRuleResult {
  switch (rule.kind) {
    case 'closed-circuit':
      return {
        ...rule,
        passed: simulation.closedCircuit,
        detail: simulation.closedCircuit ? '已经形成有效电流回路。' : '当前还没有形成完整回路。'
      }
    case 'no-short-circuit':
      return {
        ...rule,
        passed: !simulation.shortCircuit,
        detail: simulation.shortCircuit ? '检测到正负极短接。' : '未检测到电源短接。'
      }
    case 'no-critical-issues': {
      const criticalIssues = simulation.issues.filter((issue) => issue.severity !== 'info')
      return {
        ...rule,
        passed: criticalIssues.length === 0,
        detail: criticalIssues.length === 0 ? '未发现错误或告警。' : criticalIssues[0]?.message ?? '存在待处理告警。'
      }
    }
    case 'wire-connected': {
      const targetWire = model.wires.find((item) => item.id === rule.wireId)
      return {
        ...rule,
        passed: Boolean(targetWire?.connected),
        detail: targetWire?.connected ? `${targetWire.label} 已接入。` : `${targetWire?.label ?? rule.wireId} 仍处于断开状态。`
      }
    }
    case 'active-kind': {
      const count = activeDeviceCount(model, simulation, rule.deviceKind)
      const name = getDeviceDefinition(rule.deviceKind).name
      return {
        ...rule,
        passed: count >= rule.minCount,
        detail: `${name} 工作数量 ${count}/${rule.minCount}。`
      }
    }
    case 'voltage-range': {
      const voltages = voltagesForKind(model, simulation, rule.deviceKind)
      const matched = voltages.some((voltage) => voltage >= rule.min && voltage <= rule.max)
      const name = getDeviceDefinition(rule.deviceKind).name
      const valueText = voltages.length > 0 ? voltages.map((voltage) => `${voltage.toFixed(1)}V`).join('、') : '未接入'
      return {
        ...rule,
        passed: matched,
        detail: `${name} 端电压：${valueText}。`
      }
    }
    case 'supply-range':
      return {
        ...rule,
        passed: simulation.supplyVoltage >= rule.min && simulation.supplyVoltage <= rule.max,
        detail: `当前电源 ${simulation.supplyVoltage.toFixed(1)}V，目标 ${rule.min}-${rule.max}V。`
      }
    case 'total-current-under': {
      const aboveMin = rule.min === undefined || simulation.totalCurrent >= rule.min
      const underMax = simulation.totalCurrent <= rule.max
      return {
        ...rule,
        passed: aboveMin && underMax,
        detail: `当前总电流 ${simulation.totalCurrent.toFixed(2)}A，上限 ${rule.max.toFixed(2)}A。`
      }
    }
  }
}

export function evaluateTrainingChallenge(
  model: CircuitModel,
  simulation: SimulationResult,
  challengeId: string
): ChallengeEvaluation {
  const challenge = getChallengeById(challengeId)
  const ruleResults = challenge.rules.map((rule) => evaluateRule(rule, model, simulation))
  const maxScore = ruleResults.reduce((sum, rule) => sum + rule.points, 0)
  const score = ruleResults.reduce((sum, rule) => sum + (rule.passed ? rule.points : 0), 0)
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const failed = ruleResults.filter((rule) => !rule.passed)

  return {
    challengeId: challenge.id,
    score,
    maxScore,
    percent,
    passedCount: ruleResults.length - failed.length,
    totalCount: ruleResults.length,
    status: percent >= 90 ? 'passed' : percent >= 45 ? 'needs-work' : 'ready',
    ruleResults,
    nextActions: failed.slice(0, 3).map((rule) => rule.help)
  }
}

export function buildSafetyDiagnostics(
  model: CircuitModel,
  simulation: SimulationResult
): SafetyDiagnostic[] {
  const diagnostics: SafetyDiagnostic[] = []

  if (simulation.shortCircuit) {
    diagnostics.push({
      id: 'short-circuit',
      severity: 'danger',
      title: '检测到短路',
      detail: '正极和负极处于直接导通状态，仿真已进入保护状态。',
      action: '立即断开电源支路，逐根检查新增导线。'
    })
  }

  if (!simulation.hasSource) {
    diagnostics.push({
      id: 'source-missing',
      severity: 'warning',
      title: '电源不完整',
      detail: '训练回路需要同时存在直流正极和直流负极。',
      action: '补齐电源端子后再进行训练评分。'
    })
  }

  const disconnected = model.wires.filter((item) => !item.connected)
  if (disconnected.length > 0) {
    diagnostics.push({
      id: 'open-wires',
      severity: 'info',
      title: '存在断开的导线',
      detail: `${disconnected.length} 根导线未接入：${disconnected.slice(0, 2).map((item) => item.label).join('、')}`,
      action: '确认这些断线是训练故障还是误操作。'
    })
  }

  model.devices.forEach((device) => {
    if (!isLoadKind(device.kind)) return
    const definition = getDeviceDefinition(device.kind)
    const ratedVoltage = device.ratedVoltage ?? definition.defaultRatedVoltage
    const effect = simulation.effects[device.id]
    if (!ratedVoltage || !effect?.active) return
    if (effect.voltage > ratedVoltage * 1.1) {
      diagnostics.push({
        id: `over-voltage-${device.id}`,
        severity: 'warning',
        title: `${device.label} 可能过压`,
        detail: `端电压 ${effect.voltage.toFixed(1)}V，高于额定 ${ratedVoltage}V 的 110%。`,
        action: '降低电源电压，或增加限流/驱动级后再训练。'
      })
    }
  })

  if (simulation.totalCurrent > 3) {
    diagnostics.push({
      id: 'high-current',
      severity: 'warning',
      title: '总电流偏高',
      detail: `当前总电流 ${simulation.totalCurrent.toFixed(2)}A，已经超过低压训练建议值。`,
      action: '减少并联负载，或提高负载等效阻值。'
    })
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      id: 'healthy',
      severity: 'ok',
      title: '训练回路健康',
      detail: '未发现短路、过压或异常断线。',
      action: '可以继续观察负载效果或切换到下一项训练。'
    })
  }

  return diagnostics
}
