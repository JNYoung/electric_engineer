import { isLoadKind } from './registry'
import type { CircuitModel, SimulationResult } from './types'

export type KnowledgeTrackId = 'high-school' | 'university' | 'electrician'
export type KnowledgeLevel = '高中基础' | '大学电路' | '电工实操'

export interface KnowledgeChoice {
  id: string
  label: string
}

export interface KnowledgeQuestion {
  id: string
  trackId: KnowledgeTrackId
  title: string
  prompt: string
  choices: KnowledgeChoice[]
  answerId: string
  explanation: string
  formula?: string
  simulationHint: string
}

export interface KnowledgeTrack {
  id: KnowledgeTrackId
  level: KnowledgeLevel
  title: string
  target: string
  summary: string
  requiredIdeas: string[]
  labFocus: string[]
  questionIds: string[]
}

export interface KnowledgeAnswerResult {
  questionId: string
  selectedAnswerId: string
  correctAnswerId: string
  correct: boolean
  explanation: string
}

export interface KnowledgeTrackProgress {
  trackId: KnowledgeTrackId
  answered: number
  correct: number
  total: number
  percent: number
  status: '待练习' | '训练中' | '已掌握'
}

export interface KnowledgeSimulationCheck {
  id: string
  label: string
  detail: string
  passed: boolean
}

export const KNOWLEDGE_TRACKS: KnowledgeTrack[] = [
  {
    id: 'high-school',
    level: '高中基础',
    title: '欧姆定律与电功率',
    target: '面向高中物理电学基础',
    summary: '训练电压、电流、电阻、电功率和并联支路的常用判断。',
    requiredIdeas: ['欧姆定律', '并联电压相等', '电功率 P=UI', '短路风险'],
    labFocus: ['读取负载端电压', '比较支路电流', '改变电源电压观察亮度'],
    questionIds: ['hs-ohm-current', 'hs-parallel-voltage', 'hs-power']
  },
  {
    id: 'university',
    level: '大学电路',
    title: '节点法与线性电路',
    target: '面向大学电路分析入门',
    summary: '把 KCL、支路电流、等效负载和电源约束映射到实时仿真结果。',
    requiredIdeas: ['KCL 节点电流', 'KVL 电压约束', '等效电阻', '稳态模型边界'],
    labFocus: ['验证总电流等于各支路电流之和', '观察并联节点电压', '识别模型不覆盖暂态过程'],
    questionIds: ['uni-kcl', 'uni-equivalent-resistance', 'uni-steady-state']
  },
  {
    id: 'electrician',
    level: '电工实操',
    title: '低压控制与安全排障',
    target: '面向电工证、工控和装修弱电实训',
    summary: '覆盖低压控制回路、保护器件、故障定位、额定电压和现场接线安全。',
    requiredIdeas: ['先断电后排障', '保护与急停链', '额定电压匹配', '支路回线完整'],
    labFocus: ['查短路和断线', '检查保护/开关链', '判断负载是否过压'],
    questionIds: ['pro-lockout', 'pro-rated-voltage', 'pro-return-wire']
  }
]

export const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  {
    id: 'hs-ohm-current',
    trackId: 'high-school',
    title: '欧姆定律计算',
    prompt: '12V 电源接入 24Ω 电阻，理想情况下支路电流是多少？',
    choices: [
      { id: 'a', label: '0.5A' },
      { id: 'b', label: '2A' },
      { id: 'c', label: '12A' }
    ],
    answerId: 'a',
    formula: 'I = U / R',
    explanation: '电流等于电压除以电阻，12V / 24Ω = 0.5A。',
    simulationHint: '在画布中选择负载，可直接查看端电压和电流是否符合 I=U/R。'
  },
  {
    id: 'hs-parallel-voltage',
    trackId: 'high-school',
    title: '并联支路判断',
    prompt: '两个负载并联在同一 12V 电源上，正常接线时每个支路端电压应接近多少？',
    choices: [
      { id: 'a', label: '各约 6V' },
      { id: 'b', label: '各约 12V' },
      { id: 'c', label: '由电阻小的支路独占' }
    ],
    answerId: 'b',
    formula: 'U1 = U2 = Us',
    explanation: '并联支路两端接在同一对节点上，端电压相等并接近电源电压。',
    simulationHint: '当前默认灯泡和排风扇就是并联支路，可比较二者端电压。'
  },
  {
    id: 'hs-power',
    trackId: 'high-school',
    title: '电功率意义',
    prompt: '同一负载电压升高且电流也升高时，功率会怎样变化？',
    choices: [
      { id: 'a', label: '通常增大' },
      { id: 'b', label: '一定变为 0' },
      { id: 'c', label: '只和导线长度有关' }
    ],
    answerId: 'a',
    formula: 'P = U * I',
    explanation: '功率等于电压与电流乘积，二者同时升高时功率通常增大。',
    simulationHint: '调节顶部电压步进按钮，观察负载功率和亮度/转速变化。'
  },
  {
    id: 'uni-kcl',
    trackId: 'university',
    title: 'KCL 节点电流',
    prompt: '一个节点流出的并联支路电流分别为 0.6A 与 0.4A，电源总电流约为多少？',
    choices: [
      { id: 'a', label: '0.2A' },
      { id: 'b', label: '1.0A' },
      { id: 'c', label: '2.4A' }
    ],
    answerId: 'b',
    formula: 'ΣIin = ΣIout',
    explanation: '节点电流守恒，总电流等于并联支路电流之和，0.6A + 0.4A = 1.0A。',
    simulationHint: '仿真结果的总电流会与各接入负载电流之和保持一致。'
  },
  {
    id: 'uni-equivalent-resistance',
    trackId: 'university',
    title: '并联等效电阻',
    prompt: '两个相同电阻并联后，总等效电阻与单个电阻相比如何？',
    choices: [
      { id: 'a', label: '变为一半' },
      { id: 'b', label: '变为两倍' },
      { id: 'c', label: '保持不变' }
    ],
    answerId: 'a',
    formula: '1 / Req = 1 / R1 + 1 / R2',
    explanation: '两个相同电阻并联时等效电阻减半，因此同电压下总电流增大。',
    simulationHint: '添加多个等效负载后，总电流会上升。'
  },
  {
    id: 'uni-steady-state',
    trackId: 'university',
    title: '模型边界',
    prompt: '当前仿真器主要覆盖哪类电路行为？',
    choices: [
      { id: 'a', label: '直流稳态与等效负载' },
      { id: 'b', label: '高频电磁辐射' },
      { id: 'c', label: '三相异步电机完整磁场' }
    ],
    answerId: 'a',
    explanation: '当前求解器以直流稳态为核心，适合教学、支路判断和低压控制回路验证。',
    simulationHint: '暂态、电机磁场和高频问题可作为后续专业模块扩展。'
  },
  {
    id: 'pro-lockout',
    trackId: 'electrician',
    title: '排障流程',
    prompt: '现场发现控制回路疑似短路，第一优先动作是什么？',
    choices: [
      { id: 'a', label: '先断电并确认无危险' },
      { id: 'b', label: '直接用手调整裸露导线' },
      { id: 'c', label: '继续加大电源电压' }
    ],
    answerId: 'a',
    explanation: '电工实操中排障前应先断电、隔离危险并确认安全状态。',
    simulationHint: '短路时仿真会进入保护状态，并在安全诊断中给出危险提示。'
  },
  {
    id: 'pro-rated-voltage',
    trackId: 'electrician',
    title: '额定电压',
    prompt: '5V 模块长期接在 12V 电源上，最可能出现什么问题？',
    choices: [
      { id: 'a', label: '过压损坏风险' },
      { id: 'b', label: '完全没有影响' },
      { id: 'c', label: '电流必然为 0' }
    ],
    answerId: 'a',
    explanation: '低压模块必须匹配额定电压，过压会带来损坏和安全风险。',
    simulationHint: '安全诊断会提示额定电压低于电源电压的模块。'
  },
  {
    id: 'pro-return-wire',
    trackId: 'electrician',
    title: '回线完整性',
    prompt: '灯具正极已接入但回线断开，通常会出现什么现象？',
    choices: [
      { id: 'a', label: '灯具不亮' },
      { id: 'b', label: '灯具更亮' },
      { id: 'c', label: '电源电压变成 0V' }
    ],
    answerId: 'a',
    explanation: '负载需要完整的正极和回线路径，回线断开时无法形成工作电流。',
    simulationHint: '断开“灯泡回负极”导线即可观察照明支路掉电。'
  }
]

export function getKnowledgeTrack(trackId: KnowledgeTrackId) {
  return KNOWLEDGE_TRACKS.find((track) => track.id === trackId) ?? KNOWLEDGE_TRACKS[0]
}

export function getKnowledgeQuestion(questionId: string) {
  const question = KNOWLEDGE_QUESTIONS.find((item) => item.id === questionId)
  if (!question) {
    throw new Error(`Unknown knowledge question: ${questionId}`)
  }
  return question
}

export function getQuestionsForTrack(trackId: KnowledgeTrackId) {
  return KNOWLEDGE_QUESTIONS.filter((question) => question.trackId === trackId)
}

export function evaluateKnowledgeAnswer(questionId: string, selectedAnswerId: string): KnowledgeAnswerResult {
  const question = getKnowledgeQuestion(questionId)
  return {
    questionId,
    selectedAnswerId,
    correctAnswerId: question.answerId,
    correct: selectedAnswerId === question.answerId,
    explanation: question.explanation
  }
}

export function buildKnowledgeTrackProgress(
  trackId: KnowledgeTrackId,
  answers: Record<string, string>
): KnowledgeTrackProgress {
  const questions = getQuestionsForTrack(trackId)
  const results = questions
    .filter((question) => Boolean(answers[question.id]))
    .map((question) => evaluateKnowledgeAnswer(question.id, answers[question.id]))
  const correct = results.filter((result) => result.correct).length
  const percent = questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100)

  return {
    trackId,
    answered: results.length,
    correct,
    total: questions.length,
    percent,
    status: results.length === 0 ? '待练习' : percent >= 80 ? '已掌握' : '训练中'
  }
}

export function buildKnowledgeSimulationChecks(
  trackId: KnowledgeTrackId,
  model: CircuitModel,
  simulation: SimulationResult
): KnowledgeSimulationCheck[] {
  const loadDevices = model.devices.filter((device) => isLoadKind(device.kind))
  const activeEffects = loadDevices
    .map((device) => simulation.effects[device.id])
    .filter((effect) => effect?.active)
  const branchCurrentSum = activeEffects.reduce((total, effect) => total + effect.current, 0)
  const currentBalanceOk = Math.abs(branchCurrentSum - simulation.totalCurrent) < 0.02
  const hasControlProtection = model.devices.some((device) =>
    ['switch', 'push-button', 'fuse', 'thermal-overload', 'emergency-stop'].includes(device.kind)
  )
  const hasVoltageMismatch = loadDevices.some((device) =>
    typeof device.ratedVoltage === 'number' &&
    device.ratedVoltage > 0 &&
    simulation.supplyVoltage > device.ratedVoltage * 1.25
  )

  if (trackId === 'university') {
    return [
      {
        id: 'kcl-balance',
        label: 'KCL 电流守恒',
        passed: activeEffects.length > 0 && currentBalanceOk,
        detail: `支路电流合计 ${branchCurrentSum.toFixed(2)}A，总电流 ${simulation.totalCurrent.toFixed(2)}A。`
      },
      {
        id: 'parallel-voltage',
        label: '并联节点电压',
        passed: activeEffects.length >= 2 && activeEffects.every((effect) => Math.abs(effect.voltage - simulation.supplyVoltage) < 0.2),
        detail: activeEffects.length >= 2 ? '多个支路端电压接近电源电压。' : '添加或恢复至少两个并联负载后可验证。'
      },
      {
        id: 'solver-domain',
        label: '稳态求解范围',
        passed: !simulation.shortCircuit,
        detail: simulation.shortCircuit ? '短路状态下求解器进入保护，不适合作为线性支路样本。' : '当前电路可用于直流稳态支路分析。'
      }
    ]
  }

  if (trackId === 'electrician') {
    return [
      {
        id: 'safe-supply',
        label: '低压训练电源',
        passed: simulation.supplyVoltage > 0 && simulation.supplyVoltage <= 36,
        detail: `${simulation.supplyVoltage}V DC，适合低压教学/实训范围。`
      },
      {
        id: 'protection-chain',
        label: '保护/控制链存在',
        passed: hasControlProtection,
        detail: hasControlProtection ? '电路包含开关、按钮或保护器件。' : '建议加入开关、保险、热继或急停链。'
      },
      {
        id: 'rated-voltage',
        label: '额定电压匹配',
        passed: !hasVoltageMismatch,
        detail: hasVoltageMismatch ? '存在负载额定电压明显低于电源电压。' : '当前接入负载未发现明显过压。'
      },
      {
        id: 'no-danger',
        label: '无危险故障',
        passed: !simulation.shortCircuit && !simulation.issues.some((issue) => issue.severity === 'error'),
        detail: simulation.shortCircuit ? '检测到正负极短接风险。' : '未检测到短路级危险。'
      }
    ]
  }

  return [
    {
      id: 'closed-loop',
      label: '闭合回路',
      passed: simulation.closedCircuit && simulation.totalCurrent > 0,
      detail: simulation.closedCircuit ? '当前回路已接通，可读取电流。' : '闭合开关并恢复回线后可验证。'
    },
    {
      id: 'ohm-observable',
      label: '欧姆定律可观测',
      passed: activeEffects.length > 0,
      detail: activeEffects.length > 0 ? '至少一个负载有端电压、电流和功率数据。' : '当前没有工作的负载样本。'
    },
    {
      id: 'parallel-sample',
      label: '并联样本',
      passed: activeEffects.length >= 2,
      detail: activeEffects.length >= 2 ? '可比较多个并联支路。' : '添加或恢复第二个负载后可比较并联关系。'
    }
  ]
}
