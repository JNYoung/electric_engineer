import {
  getDeviceDefinition,
  isConductiveControlKind,
  isLoadKind
} from './registry'
import type { CircuitDevice, DeviceEffect, CircuitModel, SimulationResult } from './types'

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

export type KnowledgeMeasurementStatus = '可测量' | '待接线' | '风险'
export type KnowledgeMeasurementSeverity = 'success' | 'warning' | 'danger'

export interface KnowledgeMeasurementItem {
  id: string
  label: string
  value: string
  detail: string
  passed: boolean
  severity: KnowledgeMeasurementSeverity
}

export interface KnowledgeMeasurementWorksheet {
  trackId: KnowledgeTrackId
  status: KnowledgeMeasurementStatus
  passed: number
  total: number
  items: KnowledgeMeasurementItem[]
  nextActions: string[]
}

export type FormulaVerificationStatus = '可验算' | '待补读数' | '风险'
export type FormulaVerificationSeverity = 'success' | 'warning' | 'danger'

export interface FormulaVerificationCard {
  id: string
  label: string
  formula: string
  knownValues: string[]
  expected: string
  observed: string
  tolerance: string
  passed: boolean
  severity: FormulaVerificationSeverity
  detail: string
}

export interface FormulaVerificationWorksheet {
  trackId: KnowledgeTrackId
  status: FormulaVerificationStatus
  passed: number
  total: number
  cards: FormulaVerificationCard[]
  nextActions: string[]
}

export type ReviewReason = 'wrong' | 'unanswered'
export type ReviewSeverity = 'danger' | 'warning'

export interface KnowledgeReviewItem {
  questionId: string
  trackId: KnowledgeTrackId
  title: string
  reason: ReviewReason
  severity: ReviewSeverity
  selectedAnswerLabel?: string
  correctAnswerLabel: string
  explanation: string
  simulationHint: string
}

export interface KnowledgeReviewTrackSummary {
  trackId: KnowledgeTrackId
  level: KnowledgeLevel
  wrong: number
  unanswered: number
  total: number
}

export interface KnowledgeReviewNotebook {
  status: '已清空' | '复训中' | '待复训'
  total: number
  wrong: number
  unanswered: number
  byTrack: KnowledgeReviewTrackSummary[]
  priorityTrackIds: KnowledgeTrackId[]
  items: KnowledgeReviewItem[]
  nextActions: string[]
}

export interface KnowledgeReviewNotebookOptions {
  trackIds?: KnowledgeTrackId[]
  includeUnanswered?: boolean
  limit?: number
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

export function buildKnowledgeReviewNotebook(
  answers: Record<string, string>,
  options: KnowledgeReviewNotebookOptions = {}
): KnowledgeReviewNotebook {
  const trackIds = options.trackIds ?? KNOWLEDGE_TRACKS.map((track) => track.id)
  const includeUnanswered = options.includeUnanswered ?? false
  const limit = options.limit ?? 8
  const items = trackIds.flatMap((trackId) =>
    getQuestionsForTrack(trackId)
      .map((question) => buildReviewItem(question, answers[question.id], includeUnanswered))
      .filter((item): item is KnowledgeReviewItem => Boolean(item))
  )
  const wrong = items.filter((item) => item.reason === 'wrong').length
  const unanswered = items.filter((item) => item.reason === 'unanswered').length
  const byTrack = trackIds.map((trackId) => {
    const track = getKnowledgeTrack(trackId)
    const trackItems = items.filter((item) => item.trackId === trackId)
    return {
      trackId,
      level: track.level,
      wrong: trackItems.filter((item) => item.reason === 'wrong').length,
      unanswered: trackItems.filter((item) => item.reason === 'unanswered').length,
      total: trackItems.length
    }
  })
  const priorityTrackIds = byTrack
    .filter((track) => track.total > 0)
    .sort((left, right) => right.wrong - left.wrong || right.unanswered - left.unanswered)
    .map((track) => track.trackId)
  const visibleItems = items
    .sort((left, right) => reviewPriority(left) - reviewPriority(right))
    .slice(0, limit)
  const nextActions = uniqueReviewText([
    visibleItems.find((item) => item.reason === 'wrong')?.simulationHint ?? '',
    visibleItems.find((item) => item.reason === 'unanswered')?.simulationHint ?? '',
    priorityTrackIds.length > 0
      ? `优先复训 ${priorityTrackIds.map((trackId) => getKnowledgeTrack(trackId).level).join('、')}。`
      : '当前没有错题，继续完成新题或切换更高层级。'
  ])

  return {
    status: wrong > 0 ? '待复训' : items.length > 0 ? '复训中' : '已清空',
    total: items.length,
    wrong,
    unanswered,
    byTrack,
    priorityTrackIds,
    items: visibleItems,
    nextActions
  }
}

function buildReviewItem(
  question: KnowledgeQuestion,
  selectedAnswerId: string | undefined,
  includeUnanswered: boolean
): KnowledgeReviewItem | undefined {
  const correctAnswerLabel = question.choices.find((choice) => choice.id === question.answerId)?.label ?? question.answerId

  if (!selectedAnswerId) {
    if (!includeUnanswered) return undefined
    return {
      questionId: question.id,
      trackId: question.trackId,
      title: question.title,
      reason: 'unanswered' as const,
      severity: 'warning' as const,
      correctAnswerLabel,
      explanation: question.explanation,
      simulationHint: question.simulationHint
    }
  }

  const result = evaluateKnowledgeAnswer(question.id, selectedAnswerId)
  if (result.correct) return undefined

  return {
    questionId: question.id,
    trackId: question.trackId,
    title: question.title,
    reason: 'wrong' as const,
    severity: 'danger' as const,
    selectedAnswerLabel: question.choices.find((choice) => choice.id === selectedAnswerId)?.label ?? selectedAnswerId,
    correctAnswerLabel,
    explanation: question.explanation,
    simulationHint: question.simulationHint
  }
}

function reviewPriority(item: KnowledgeReviewItem) {
  return item.reason === 'wrong' ? 0 : 1
}

function uniqueReviewText(items: string[]) {
  return items
    .filter((item) => item.trim().length > 0)
    .filter((item, index, source) => source.indexOf(item) === index)
}

export function buildKnowledgeMeasurementWorksheet(
  trackId: KnowledgeTrackId,
  model: CircuitModel,
  simulation: SimulationResult
): KnowledgeMeasurementWorksheet {
  const loadDevices = model.devices.filter((device) => device.enabled !== false && isLoadKind(device.kind))
  const activeEffects = getActiveLoadEffects(loadDevices, simulation)
  const items =
    trackId === 'university'
      ? buildUniversityMeasurements(activeEffects, simulation)
      : trackId === 'electrician'
        ? buildElectricianMeasurements(model, loadDevices, simulation)
        : buildHighSchoolMeasurements(activeEffects, simulation)
  const passed = items.filter((item) => item.passed).length

  return {
    trackId,
    status: getMeasurementStatus(items, simulation),
    passed,
    total: items.length,
    items,
    nextActions: uniqueReviewText(items.filter((item) => !item.passed).map((item) => item.detail)).slice(0, 3)
  }
}

export function buildFormulaVerificationWorksheet(
  trackId: KnowledgeTrackId,
  model: CircuitModel,
  simulation: SimulationResult
): FormulaVerificationWorksheet {
  const loadDevices = model.devices.filter((device) => device.enabled !== false && isLoadKind(device.kind))
  const activeEffects = getActiveLoadEffects(loadDevices, simulation)
  const cards =
    trackId === 'university'
      ? buildUniversityFormulaCards(activeEffects, simulation)
      : trackId === 'electrician'
        ? buildElectricianFormulaCards(model, loadDevices, simulation)
        : buildHighSchoolFormulaCards(activeEffects, simulation)
  const passed = cards.filter((card) => card.passed).length

  return {
    trackId,
    status: getFormulaStatus(cards, simulation),
    passed,
    total: cards.length,
    cards,
    nextActions: uniqueReviewText(cards.filter((card) => !card.passed).map((card) => card.detail)).slice(0, 3)
  }
}

function buildHighSchoolFormulaCards(
  activeEffects: Array<{ device: CircuitDevice; effect: DeviceEffect }>,
  simulation: SimulationResult
): FormulaVerificationCard[] {
  const first = activeEffects[0]
  const second = activeEffects[1]
  const resistance = first ? getDeviceResistance(first.device) : 0
  const expectedCurrent = first && resistance > 0 ? first.effect.voltage / resistance : 0
  const currentGap = first ? Math.abs(first.effect.current - expectedCurrent) : Number.POSITIVE_INFINITY
  const currentPassed = Boolean(first && currentGap <= Math.max(0.02, expectedCurrent * 0.15))
  const expectedPower = first ? first.effect.voltage * first.effect.current : 0
  const powerGap = first ? Math.abs(first.effect.power - expectedPower) : Number.POSITIVE_INFINITY
  const powerPassed = Boolean(first && powerGap <= Math.max(0.02, expectedPower * 0.08))
  const voltageSpread = getVoltageSpread(activeEffects)
  const parallelPassed = activeEffects.length >= 2 && voltageSpread <= 0.3

  return [
    {
      id: 'formula-ohm-current',
      label: first ? `${first.device.label}欧姆定律` : '欧姆定律',
      formula: 'I = U / R',
      knownValues: first
        ? [`U=${formatFormulaNumber(first.effect.voltage)}V`, `R=${formatFormulaNumber(resistance)}Ω`]
        : [`U=${formatFormulaNumber(simulation.supplyVoltage)}V`, 'R=待测'],
      expected: first ? `${formatFormulaNumber(expectedCurrent)}A` : '待测',
      observed: first ? `${formatFormulaNumber(first.effect.current)}A` : '0.00A',
      tolerance: '±15%',
      passed: currentPassed,
      severity: currentPassed ? 'success' : 'warning',
      detail: currentPassed ? '电流读数与 I=U/R 一致。' : '闭合回路并确认负载阻值后再验算欧姆定律。'
    },
    {
      id: 'formula-power',
      label: first ? `${first.device.label}功率` : '电功率',
      formula: 'P = U × I',
      knownValues: first
        ? [`U=${formatFormulaNumber(first.effect.voltage)}V`, `I=${formatFormulaNumber(first.effect.current)}A`]
        : ['U=待测', 'I=待测'],
      expected: first ? `${formatFormulaNumber(expectedPower)}W` : '待测',
      observed: first ? `${formatFormulaNumber(first.effect.power)}W` : '0.00W',
      tolerance: '±8%',
      passed: powerPassed,
      severity: powerPassed ? 'success' : 'warning',
      detail: powerPassed ? '功率读数可用于高中电功率判断。' : '先形成可测电压和电流，再用 P=UI 复算。'
    },
    {
      id: 'formula-parallel-voltage',
      label: '并联端电压',
      formula: 'U1 ≈ U2',
      knownValues: [
        first ? `U1=${formatFormulaNumber(first.effect.voltage)}V` : 'U1=待测',
        second ? `U2=${formatFormulaNumber(second.effect.voltage)}V` : 'U2=待测'
      ],
      expected: `压差 ≤ 0.30V`,
      observed: activeEffects.length >= 2 ? `${formatFormulaNumber(voltageSpread)}V` : '待测',
      tolerance: '0.30V',
      passed: parallelPassed,
      severity: parallelPassed ? 'success' : 'warning',
      detail: parallelPassed ? '并联支路端电压在训练容差内。' : '接通两个并联负载后再比较端电压。'
    }
  ]
}

function buildUniversityFormulaCards(
  activeEffects: Array<{ device: CircuitDevice; effect: DeviceEffect }>,
  simulation: SimulationResult
): FormulaVerificationCard[] {
  const branchCurrentSum = activeEffects.reduce((total, item) => total + item.effect.current, 0)
  const currentGap = Math.abs(branchCurrentSum - simulation.totalCurrent)
  const kclPassed = activeEffects.length >= 2 && currentGap <= 0.03 && !simulation.shortCircuit
  const equivalentResistance = getParallelResistance(activeEffects.map((item) => getDeviceResistance(item.device)))
  const observedResistance = simulation.totalCurrent > 0 ? simulation.supplyVoltage / simulation.totalCurrent : 0
  const resistanceGap = Math.abs(observedResistance - equivalentResistance)
  const resistancePassed = activeEffects.length >= 1 &&
    simulation.totalCurrent > 0 &&
    resistanceGap <= Math.max(0.5, equivalentResistance * 0.15)
  const voltageSpread = getVoltageSpread(activeEffects)
  const voltagePassed = activeEffects.length >= 2 && voltageSpread <= 0.3

  return [
    {
      id: 'formula-kcl',
      label: 'KCL 节点电流',
      formula: 'ΣI支路 = I总',
      knownValues: activeEffects.length > 0
        ? activeEffects.slice(0, 4).map((item) => `${item.device.label}:${formatFormulaNumber(item.effect.current)}A`)
        : ['支路电流=待测'],
      expected: `${formatFormulaNumber(simulation.totalCurrent)}A`,
      observed: `${formatFormulaNumber(branchCurrentSum)}A`,
      tolerance: '0.03A',
      passed: kclPassed,
      severity: kclPassed ? 'success' : 'warning',
      detail: kclPassed ? '支路电流和与总电流一致。' : '恢复至少两个工作的并联支路后再验算 KCL。'
    },
    {
      id: 'formula-equivalent-resistance',
      label: '并联等效电阻',
      formula: 'Req = U / I总',
      knownValues: [
        `U=${formatFormulaNumber(simulation.supplyVoltage)}V`,
        `I总=${formatFormulaNumber(simulation.totalCurrent)}A`
      ],
      expected: activeEffects.length > 0 ? `${formatFormulaNumber(equivalentResistance)}Ω` : '待测',
      observed: simulation.totalCurrent > 0 ? `${formatFormulaNumber(observedResistance)}Ω` : '待测',
      tolerance: '±15%',
      passed: resistancePassed,
      severity: resistancePassed ? 'success' : 'warning',
      detail: resistancePassed ? '等效电阻与并联负载模型一致。' : '需要可测总电流和至少一个工作负载后再计算 Req。'
    },
    {
      id: 'formula-node-voltage',
      label: '并联节点电压',
      formula: 'ΔU节点 ≈ 0',
      knownValues: activeEffects.slice(0, 4).map((item) => `${item.device.label}:${formatFormulaNumber(item.effect.voltage)}V`),
      expected: '≤ 0.30V',
      observed: activeEffects.length >= 2 ? `${formatFormulaNumber(voltageSpread)}V` : '待测',
      tolerance: '0.30V',
      passed: voltagePassed,
      severity: voltagePassed ? 'success' : 'warning',
      detail: voltagePassed ? '节点电压差可作为大学电路校核证据。' : '恢复两个并联负载后再观察节点电压。'
    }
  ]
}

function buildElectricianFormulaCards(
  model: CircuitModel,
  loadDevices: CircuitDevice[],
  simulation: SimulationResult
): FormulaVerificationCard[] {
  const activeEffects = getActiveLoadEffects(loadDevices, simulation)
  const protectionCount = model.devices.filter((device) =>
    device.enabled !== false &&
    (isConductiveControlKind(device.kind) ||
      ['fuse', 'thermal-overload', 'emergency-stop'].includes(device.kind))
  ).length
  const ratedMargins = activeEffects.map((item) => {
    const ratedVoltage = getDeviceRatedVoltage(item.device)
    return {
      label: item.device.label,
      ratedVoltage,
      voltage: item.effect.voltage,
      margin: ratedVoltage - item.effect.voltage
    }
  }).filter((item) => item.ratedVoltage > 0)
  const worstMargin = ratedMargins.sort((left, right) => left.margin - right.margin)[0]
  const ratedPassed = ratedMargins.length > 0 && ratedMargins.every((item) => item.voltage <= item.ratedVoltage * 1.25)
  const safeVoltagePassed = simulation.hasSource && simulation.supplyVoltage > 0 && simulation.supplyVoltage <= 36 && !simulation.shortCircuit
  const currentBudgetPassed = simulation.hasSource && !simulation.shortCircuit && simulation.totalCurrent > 0 && simulation.totalCurrent <= 5
  const totalPower = simulation.supplyVoltage * simulation.totalCurrent
  const protectionPassed = protectionCount > 0 && !simulation.shortCircuit

  return [
    {
      id: 'formula-safe-voltage',
      label: '低压训练电源',
      formula: 'U电源 ≤ 36V',
      knownValues: [`U=${formatFormulaNumber(simulation.supplyVoltage)}V`],
      expected: '≤ 36V',
      observed: `${formatFormulaNumber(simulation.supplyVoltage)}V`,
      tolerance: '36V',
      passed: safeVoltagePassed,
      severity: safeVoltagePassed ? 'success' : simulation.shortCircuit ? 'danger' : 'warning',
      detail: safeVoltagePassed ? '电源满足低压训练验算。' : '把电源控制在 36V 内并排除短路后再做实操。'
    },
    {
      id: 'formula-rated-margin',
      label: '额定电压余量',
      formula: 'U实测 ≤ 1.25 × U额定',
      knownValues: worstMargin
        ? [`${worstMargin.label}: ${formatFormulaNumber(worstMargin.voltage)}V/${formatFormulaNumber(worstMargin.ratedVoltage)}V`]
        : ['负载=待测'],
      expected: '不过压',
      observed: worstMargin ? `${formatFormulaNumber(worstMargin.margin)}V 余量` : '待测',
      tolerance: '25%',
      passed: ratedPassed,
      severity: ratedPassed ? 'success' : ratedMargins.length === 0 ? 'warning' : 'danger',
      detail: ratedPassed ? '接入负载未发现额定电压越界。' : '检查过压负载并重新匹配电源或额定规格。'
    },
    {
      id: 'formula-current-budget',
      label: '训练电流预算',
      formula: 'P总 = U × I总',
      knownValues: [
        `U=${formatFormulaNumber(simulation.supplyVoltage)}V`,
        `I总=${formatFormulaNumber(simulation.totalCurrent)}A`
      ],
      expected: 'I总 ≤ 5A',
      observed: `${formatFormulaNumber(totalPower)}W`,
      tolerance: '5A',
      passed: currentBudgetPassed,
      severity: currentBudgetPassed ? 'success' : simulation.shortCircuit ? 'danger' : 'warning',
      detail: currentBudgetPassed ? '总电流处于训练预算内。' : '先恢复可测工作电流，并控制总电流在训练预算内。'
    },
    {
      id: 'formula-protection-chain',
      label: '保护链计数',
      formula: '保护链 ≥ 1',
      knownValues: [`保护/控制器件=${protectionCount}`],
      expected: '≥ 1',
      observed: `${protectionCount}`,
      tolerance: '无短路',
      passed: protectionPassed,
      severity: protectionPassed ? 'success' : simulation.shortCircuit ? 'danger' : 'warning',
      detail: protectionPassed ? '回路具备可验收的保护/控制链。' : '加入开关、保险、热继或急停，并先排除短路。'
    }
  ]
}

function buildHighSchoolMeasurements(
  activeEffects: Array<{ device: CircuitDevice; effect: DeviceEffect }>,
  simulation: SimulationResult
): KnowledgeMeasurementItem[] {
  const first = activeEffects[0]
  const voltageSpread = getVoltageSpread(activeEffects)

  return [
    {
      id: 'hs-supply-voltage',
      label: '电源电压',
      value: `${formatMeasurement(simulation.supplyVoltage)}V`,
      passed: simulation.hasSource && simulation.supplyVoltage > 0,
      severity: simulation.hasSource ? 'success' : 'warning',
      detail: simulation.hasSource ? '电源可作为欧姆定律计算的电压样本。' : '放置正负极电源后再测量电压。'
    },
    {
      id: 'hs-load-current',
      label: first ? `${first.device.label}电流` : '负载电流',
      value: first ? `${formatMeasurement(first.effect.current)}A` : '0.00A',
      passed: Boolean(first && first.effect.current > 0),
      severity: first ? 'success' : 'warning',
      detail: first ? '至少一个负载形成电压、电流、功率观测样本。' : '闭合开关并恢复回线，让至少一个负载通电。'
    },
    {
      id: 'hs-parallel-voltage-spread',
      label: '并联压差',
      value: activeEffects.length >= 2 ? `${formatMeasurement(voltageSpread)}V` : '待测',
      passed: activeEffects.length >= 2 && voltageSpread <= 0.3,
      severity: activeEffects.length >= 2 && voltageSpread <= 0.3 ? 'success' : 'warning',
      detail: activeEffects.length >= 2 ? '多个支路端电压接近，可验证并联电压相等。' : '接通两个并联负载后比较端电压。'
    }
  ]
}

function buildUniversityMeasurements(
  activeEffects: Array<{ device: CircuitDevice; effect: DeviceEffect }>,
  simulation: SimulationResult
): KnowledgeMeasurementItem[] {
  const branchCurrentSum = activeEffects.reduce((total, item) => total + item.effect.current, 0)
  const currentGap = Math.abs(branchCurrentSum - simulation.totalCurrent)
  const voltageSpread = getVoltageSpread(activeEffects)

  return [
    {
      id: 'uni-current-sum',
      label: '支路电流和',
      value: `${formatMeasurement(branchCurrentSum)}A`,
      passed: activeEffects.length >= 2 && currentGap <= 0.03,
      severity: activeEffects.length >= 2 && currentGap <= 0.03 ? 'success' : 'warning',
      detail: activeEffects.length >= 2 ? '支路电流和接近总电流，可作为 KCL 样本。' : '接通两个以上并联负载后再验证 KCL。'
    },
    {
      id: 'uni-kcl-gap',
      label: 'KCL 误差',
      value: `${formatMeasurement(currentGap)}A`,
      passed: activeEffects.length >= 2 && currentGap <= 0.03,
      severity: activeEffects.length >= 2 && currentGap <= 0.03 ? 'success' : 'warning',
      detail: currentGap <= 0.03 ? '误差在训练容差内。' : '检查是否存在断线、短路或未工作的支路。'
    },
    {
      id: 'uni-voltage-spread',
      label: '节点压差',
      value: activeEffects.length >= 2 ? `${formatMeasurement(voltageSpread)}V` : '待测',
      passed: activeEffects.length >= 2 && voltageSpread <= 0.3,
      severity: activeEffects.length >= 2 && voltageSpread <= 0.3 ? 'success' : 'warning',
      detail: activeEffects.length >= 2 ? '并联节点电压差可用于大学电路校核。' : '恢复两个并联负载后再比较节点电压。'
    }
  ]
}

function buildElectricianMeasurements(
  model: CircuitModel,
  loadDevices: CircuitDevice[],
  simulation: SimulationResult
): KnowledgeMeasurementItem[] {
  const protectionCount = model.devices.filter((device) =>
    device.enabled !== false &&
    (isConductiveControlKind(device.kind) ||
      ['fuse', 'thermal-overload', 'emergency-stop'].includes(device.kind))
  ).length
  const mismatchedLoads = loadDevices.filter((device) => {
    const ratedVoltage = device.ratedVoltage ?? getDeviceDefinition(device.kind).defaultRatedVoltage
    return typeof ratedVoltage === 'number' && ratedVoltage > 0 && simulation.supplyVoltage > ratedVoltage * 1.25
  })
  const dangerIssues = simulation.issues.filter((issue) => issue.severity === 'error')
  const safeSupplyPassed = simulation.hasSource && simulation.supplyVoltage > 0 && simulation.supplyVoltage <= 36

  return [
    {
      id: 'pro-safe-voltage',
      label: '训练电源',
      value: `${formatMeasurement(simulation.supplyVoltage)}V`,
      passed: safeSupplyPassed,
      severity: !simulation.hasSource ? 'warning' : simulation.supplyVoltage <= 36 ? 'success' : 'danger',
      detail: !simulation.hasSource
        ? '放置正负极电源后再做实操验证。'
        : simulation.supplyVoltage <= 36
          ? '电源处于低压训练范围。'
          : '把训练电源降到 36V 以内再进行实操验证。'
    },
    {
      id: 'pro-protection-count',
      label: '保护器件',
      value: `${protectionCount} 个`,
      passed: protectionCount > 0,
      severity: protectionCount > 0 ? 'success' : 'warning',
      detail: protectionCount > 0 ? '当前回路具备可隔离的控制/保护链。' : '加入主开关、保险、热继或急停后再验收。'
    },
    {
      id: 'pro-risk-count',
      label: '危险项',
      value: `${dangerIssues.length + (simulation.shortCircuit ? 1 : 0)} 项`,
      passed: !simulation.shortCircuit && dangerIssues.length === 0,
      severity: !simulation.shortCircuit && dangerIssues.length === 0 ? 'success' : 'danger',
      detail: simulation.shortCircuit || dangerIssues.length > 0 ? '先排除短路或严重错误，再恢复训练。' : '未发现短路级危险。'
    },
    {
      id: 'pro-rated-mismatch',
      label: '过压负载',
      value: `${mismatchedLoads.length} 个`,
      passed: mismatchedLoads.length === 0,
      severity: mismatchedLoads.length === 0 ? 'success' : 'danger',
      detail: mismatchedLoads.length === 0 ? '负载额定电压未发现明显过压。' : `${mismatchedLoads.map((device) => device.label).join('、')} 需要重新匹配额定电压。`
    }
  ]
}

function getActiveLoadEffects(loadDevices: CircuitDevice[], simulation: SimulationResult) {
  return loadDevices
    .map((device) => ({ device, effect: simulation.effects[device.id] }))
    .filter((item): item is { device: CircuitDevice; effect: DeviceEffect } =>
      Boolean(item.effect?.active)
    )
}

function getVoltageSpread(activeEffects: Array<{ effect: DeviceEffect }>) {
  if (activeEffects.length < 2) return 0
  const voltages = activeEffects.map((item) => item.effect.voltage)
  return Math.max(...voltages) - Math.min(...voltages)
}

function getDeviceResistance(device: CircuitDevice) {
  return Math.max(0.1, device.resistance ?? getDeviceDefinition(device.kind).defaultResistance ?? 0.1)
}

function getDeviceRatedVoltage(device: CircuitDevice) {
  return Math.max(0, device.ratedVoltage ?? getDeviceDefinition(device.kind).defaultRatedVoltage ?? 0)
}

function getParallelResistance(resistances: number[]) {
  const conductance = resistances
    .filter((value) => value > 0)
    .reduce((total, value) => total + 1 / value, 0)
  return conductance > 0 ? 1 / conductance : 0
}

function getMeasurementStatus(items: KnowledgeMeasurementItem[], simulation: SimulationResult): KnowledgeMeasurementStatus {
  if (simulation.shortCircuit || items.some((item) => item.severity === 'danger' && !item.passed)) return '风险'
  return items.every((item) => item.passed) ? '可测量' : '待接线'
}

function getFormulaStatus(cards: FormulaVerificationCard[], simulation: SimulationResult): FormulaVerificationStatus {
  if (simulation.shortCircuit || cards.some((card) => card.severity === 'danger' && !card.passed)) return '风险'
  return cards.every((card) => card.passed) ? '可验算' : '待补读数'
}

function formatMeasurement(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function formatFormulaNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
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
