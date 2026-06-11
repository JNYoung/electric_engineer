import {
  KNOWLEDGE_QUESTIONS,
  evaluateKnowledgeAnswer,
  getKnowledgeTrack,
  getQuestionsForTrack
} from './knowledge'
import {
  getDeviceDefinition,
  isConductiveControlKind,
  isLoadKind
} from './registry'
import type { KnowledgeQuestion, KnowledgeTrackId } from './knowledge'
import type { CircuitDevice, CircuitModel, SimulationResult } from './types'

export type AssessmentLevel = '高中测验' | '大学期中' | '电工取证'
export type AssessmentBlueprintId =
  | 'high-school-foundation-check'
  | 'university-circuit-midterm'
  | 'electrician-practice-cert'

export interface AssessmentTrackWeight {
  trackId: KnowledgeTrackId
  count: number
}

export interface AssessmentBlueprint {
  id: AssessmentBlueprintId
  title: string
  level: AssessmentLevel
  description: string
  timeLimitMinutes: number
  passingPercent: number
  trackWeights: AssessmentTrackWeight[]
  competencies: string[]
  simulationRequirements: string[]
}

export interface AssessmentQuestionItem {
  order: number
  question: KnowledgeQuestion
  points: number
}

export interface AssessmentSession {
  blueprintId: AssessmentBlueprintId
  title: string
  timeLimitMinutes: number
  passingPercent: number
  totalPoints: number
  items: AssessmentQuestionItem[]
}

export interface AssessmentScore {
  blueprintId: AssessmentBlueprintId
  answered: number
  correct: number
  total: number
  earnedPoints: number
  totalPoints: number
  percent: number
  passed: boolean
  weakTracks: KnowledgeTrackId[]
  remediation: string[]
}

export interface AssessmentSimulationCheck {
  id: string
  label: string
  detail: string
  passed: boolean
  action: string
}

export interface AssessmentSimulationReadiness {
  blueprintId: AssessmentBlueprintId
  percent: number
  passed: boolean
  passedChecks: number
  totalChecks: number
  checks: AssessmentSimulationCheck[]
  nextActions: string[]
}

export type AssessmentPracticeStatus = '未开始' | '进行中' | '待补仿真' | '未通过' | '已通过'
export type AssessmentPracticeSeverity = 'success' | 'info' | 'warning' | 'danger'

export interface AssessmentPracticeFocus {
  id: string
  title: string
  detail: string
  severity: AssessmentPracticeSeverity
}

export interface AssessmentPracticeReport {
  blueprintId: AssessmentBlueprintId
  status: AssessmentPracticeStatus
  completionPercent: number
  accuracyPercent: number
  scorePercent: number
  readinessPercent: number
  passed: boolean
  weakTracks: KnowledgeTrackId[]
  recommendedTrackIds: KnowledgeTrackId[]
  focus: AssessmentPracticeFocus[]
  nextActions: string[]
}

export type AssessmentCertificationStatus = '待完成' | '待补仿真' | '未达标' | '可提交'
export type AssessmentCertificationGateId = 'completion' | 'score' | 'simulation'

export interface AssessmentCertificationGate {
  id: AssessmentCertificationGateId
  label: string
  passed: boolean
  detail: string
  action: string
}

export interface AssessmentCertificationReadiness {
  blueprintId: AssessmentBlueprintId
  status: AssessmentCertificationStatus
  eligible: boolean
  overallPercent: number
  completedGates: number
  totalGates: number
  certificateLabel: string
  gates: AssessmentCertificationGate[]
  nextActions: string[]
}

export const ASSESSMENT_BLUEPRINTS: AssessmentBlueprint[] = [
  {
    id: 'high-school-foundation-check',
    title: '高中电学基础测验',
    level: '高中测验',
    description: '聚焦欧姆定律、并联支路和电功率，适合课堂随堂测和基础自测。',
    timeLimitMinutes: 12,
    passingPercent: 80,
    trackWeights: [{ trackId: 'high-school', count: 3 }],
    competencies: ['电压电流关系', '并联电路', '功率估算', '基础安全'],
    simulationRequirements: ['至少一个闭合回路', '至少两个并联负载样本', '可读取端电压和支路电流']
  },
  {
    id: 'university-circuit-midterm',
    title: '大学电路分析小考',
    level: '大学期中',
    description: '把 KCL、等效电阻和模型边界混合考查，适合电路原理入门阶段。',
    timeLimitMinutes: 20,
    passingPercent: 75,
    trackWeights: [
      { trackId: 'high-school', count: 1 },
      { trackId: 'university', count: 3 }
    ],
    competencies: ['KCL 节点电流', '等效电阻', '稳态假设', '结果校核'],
    simulationRequirements: ['支路电流合计与总电流一致', '并联端电压接近电源电压', '无短路保护状态']
  },
  {
    id: 'electrician-practice-cert',
    title: '电工实操取证模拟',
    level: '电工取证',
    description: '面向低压控制、安全排障和额定电压匹配，适合电工证与工控入门训练。',
    timeLimitMinutes: 30,
    passingPercent: 85,
    trackWeights: [
      { trackId: 'high-school', count: 1 },
      { trackId: 'university', count: 1 },
      { trackId: 'electrician', count: 3 }
    ],
    competencies: ['安全隔离', '回线排障', '额定匹配', '保护链检查', '现场判断'],
    simulationRequirements: ['低压训练电源不超过 36V', '存在开关/保护链', '无危险短路', '负载额定电压匹配']
  }
]

export function getAssessmentBlueprint(blueprintId: AssessmentBlueprintId) {
  return ASSESSMENT_BLUEPRINTS.find((blueprint) => blueprint.id === blueprintId) ?? ASSESSMENT_BLUEPRINTS[0]
}

export function buildAssessmentSession(blueprintId: AssessmentBlueprintId): AssessmentSession {
  const blueprint = getAssessmentBlueprint(blueprintId)
  const selectedQuestions = blueprint.trackWeights.flatMap((weight) =>
    getQuestionsForTrack(weight.trackId).slice(0, weight.count)
  )
  const uniqueQuestions = selectedQuestions.filter(
    (question, index, source) => source.findIndex((item) => item.id === question.id) === index
  )
  const fallbackQuestions = KNOWLEDGE_QUESTIONS.filter(
    (question) => !uniqueQuestions.some((item) => item.id === question.id)
  )
  const targetCount = blueprint.trackWeights.reduce((total, weight) => total + weight.count, 0)
  const items = [...uniqueQuestions, ...fallbackQuestions]
    .slice(0, targetCount)
    .map((question, index) => ({
      order: index + 1,
      question,
      points: question.trackId === 'electrician' ? 25 : question.trackId === 'university' ? 20 : 15
    }))

  return {
    blueprintId: blueprint.id,
    title: blueprint.title,
    timeLimitMinutes: blueprint.timeLimitMinutes,
    passingPercent: blueprint.passingPercent,
    totalPoints: items.reduce((total, item) => total + item.points, 0),
    items
  }
}

export function scoreAssessmentSession(
  session: AssessmentSession,
  answers: Record<string, string>
): AssessmentScore {
  const answeredItems = session.items.filter((item) => Boolean(answers[item.question.id]))
  const correctItems = answeredItems.filter((item) =>
    evaluateKnowledgeAnswer(item.question.id, answers[item.question.id]).correct
  )
  const earnedPoints = correctItems.reduce((total, item) => total + item.points, 0)
  const percent = session.totalPoints === 0 ? 0 : Math.round((earnedPoints / session.totalPoints) * 100)
  const weakTracks = session.items
    .filter((item) => {
      const answer = answers[item.question.id]
      return answer && !evaluateKnowledgeAnswer(item.question.id, answer).correct
    })
    .map((item) => item.question.trackId)
    .filter((trackId, index, source) => source.indexOf(trackId) === index)

  return {
    blueprintId: session.blueprintId,
    answered: answeredItems.length,
    correct: correctItems.length,
    total: session.items.length,
    earnedPoints,
    totalPoints: session.totalPoints,
    percent,
    passed: percent >= session.passingPercent && answeredItems.length === session.items.length,
    weakTracks,
    remediation: buildAssessmentRemediation(session, answers)
  }
}

export function buildAssessmentRemediation(
  session: AssessmentSession,
  answers: Record<string, string>
) {
  return session.items
    .filter((item) => {
      const answer = answers[item.question.id]
      return !answer || !evaluateKnowledgeAnswer(item.question.id, answer).correct
    })
    .slice(0, 3)
    .map((item) => `${item.question.title}：${item.question.simulationHint}`)
}

export function buildAssessmentPracticeReport(
  session: AssessmentSession,
  answers: Record<string, string>,
  readiness: AssessmentSimulationReadiness
): AssessmentPracticeReport {
  const score = scoreAssessmentSession(session, answers)
  const completionPercent = session.items.length === 0
    ? 0
    : Math.round((score.answered / session.items.length) * 100)
  const accuracyPercent = score.answered === 0
    ? 0
    : Math.round((score.correct / score.answered) * 100)
  const recommendedTrackIds = getRecommendedTracks(session, answers, score.weakTracks)
  const status = getPracticeStatus(score, readiness, completionPercent)
  const focus = buildPracticeFocus(session, score, readiness, completionPercent, accuracyPercent, recommendedTrackIds)
  const nextActions = uniqueText([
    ...readiness.nextActions.slice(0, 2),
    ...score.remediation.slice(0, 2),
    completionPercent < 100 ? '完成剩余题目后再生成最终通过判断。' : '',
    recommendedTrackIds.length > 0
      ? `优先回到 ${recommendedTrackIds.map((trackId) => getKnowledgeTrack(trackId).level).join('、')} 题组复训。`
      : ''
  ]).slice(0, 4)

  return {
    blueprintId: session.blueprintId,
    status,
    completionPercent,
    accuracyPercent,
    scorePercent: score.percent,
    readinessPercent: readiness.percent,
    passed: score.passed && readiness.passed,
    weakTracks: score.weakTracks,
    recommendedTrackIds,
    focus,
    nextActions
  }
}

export function buildAssessmentCertificationReadiness(
  session: AssessmentSession,
  answers: Record<string, string>,
  readiness: AssessmentSimulationReadiness
): AssessmentCertificationReadiness {
  const score = scoreAssessmentSession(session, answers)
  const report = buildAssessmentPracticeReport(session, answers, readiness)
  const gates: AssessmentCertificationGate[] = [
    {
      id: 'completion',
      label: '题目完成',
      passed: score.answered === session.items.length,
      detail: `已完成 ${score.answered}/${session.items.length} 题。`,
      action: '完成剩余题目后再提交认证判断。'
    },
    {
      id: 'score',
      label: '成绩达线',
      passed: score.passed,
      detail: `当前成绩 ${score.percent}%，通过线 ${session.passingPercent}%。`,
      action: report.recommendedTrackIds.length > 0
        ? `先复训 ${report.recommendedTrackIds.map((trackId) => getKnowledgeTrack(trackId).level).join('、')}。`
        : '复盘错题并重新完成本套试卷。'
    },
    {
      id: 'simulation',
      label: '仿真验收',
      passed: readiness.passed,
      detail: `仿真通过 ${readiness.passedChecks}/${readiness.totalChecks} 项。`,
      action: readiness.nextActions[0] ?? '保持当前仿真电路满足考试验证条件。'
    }
  ]
  const completedGates = gates.filter((gate) => gate.passed).length
  const eligible = completedGates === gates.length
  const overallPercent = Math.round(
    (report.completionPercent + Math.min(100, score.percent) + readiness.percent) / 3
  )
  const status = getCertificationStatus(gates)
  const nextActions = uniqueText([
    ...gates.filter((gate) => !gate.passed).map((gate) => gate.action),
    ...report.nextActions
  ]).slice(0, 4)

  return {
    blueprintId: session.blueprintId,
    status,
    eligible,
    overallPercent,
    completedGates,
    totalGates: gates.length,
    certificateLabel: `${getAssessmentBlueprint(session.blueprintId).level}准入`,
    gates,
    nextActions
  }
}

export function getBlueprintsForTrack(trackId: KnowledgeTrackId) {
  return ASSESSMENT_BLUEPRINTS.filter((blueprint) =>
    blueprint.trackWeights.some((weight) => weight.trackId === trackId)
  )
}

function getCertificationStatus(gates: AssessmentCertificationGate[]): AssessmentCertificationStatus {
  if (gates.every((gate) => gate.passed)) return '可提交'
  if (!gates.find((gate) => gate.id === 'completion')?.passed) return '待完成'
  if (!gates.find((gate) => gate.id === 'score')?.passed) return '未达标'
  return '待补仿真'
}

function getPracticeStatus(
  score: AssessmentScore,
  readiness: AssessmentSimulationReadiness,
  completionPercent: number
): AssessmentPracticeStatus {
  if (score.passed && readiness.passed) return '已通过'
  if (score.passed && !readiness.passed) return '待补仿真'
  if (score.answered === 0) return '未开始'
  if (completionPercent < 100) return '进行中'
  return '未通过'
}

function buildPracticeFocus(
  session: AssessmentSession,
  score: AssessmentScore,
  readiness: AssessmentSimulationReadiness,
  completionPercent: number,
  accuracyPercent: number,
  recommendedTrackIds: KnowledgeTrackId[]
): AssessmentPracticeFocus[] {
  const focus: AssessmentPracticeFocus[] = [
    {
      id: 'completion',
      title: '答题完成度',
      detail: completionPercent === 100
        ? '本套试卷已经完成，可用于通过判断。'
        : `已完成 ${score.answered}/${score.total} 题，还剩 ${score.total - score.answered} 题。`,
      severity: completionPercent === 100 ? 'success' : score.answered === 0 ? 'info' : 'warning'
    },
    {
      id: 'score',
      title: '成绩表现',
      detail: score.answered === 0
        ? `通过线 ${session.passingPercent}%，先完成题目后再看成绩。`
        : `当前得分 ${score.percent}%，答题正确率 ${accuracyPercent}%。`,
      severity: score.passed ? 'success' : score.answered === 0 ? 'info' : 'warning'
    },
    {
      id: 'readiness',
      title: '仿真环境',
      detail: readiness.passed
        ? '当前电路满足本套考试的仿真验证条件。'
        : `仿真准备度 ${readiness.percent}%，需补齐 ${readiness.totalChecks - readiness.passedChecks} 项条件。`,
      severity: readiness.passed ? 'success' : 'danger'
    }
  ]

  if (recommendedTrackIds.length > 0) {
    focus.push({
      id: 'recommended-tracks',
      title: '优先复训',
      detail: recommendedTrackIds.map((trackId) => getKnowledgeTrack(trackId).level).join('、'),
      severity: score.weakTracks.length > 0 ? 'danger' : 'warning'
    })
  }

  return focus
}

function getRecommendedTracks(
  session: AssessmentSession,
  answers: Record<string, string>,
  weakTracks: KnowledgeTrackId[]
) {
  const incompleteTracks = session.items
    .filter((item) => {
      const answer = answers[item.question.id]
      return !answer || !evaluateKnowledgeAnswer(item.question.id, answer).correct
    })
    .map((item) => item.question.trackId)

  return uniqueTrackIds([...weakTracks, ...incompleteTracks])
}

function uniqueTrackIds(trackIds: KnowledgeTrackId[]) {
  return trackIds.filter((trackId, index, source) => source.indexOf(trackId) === index)
}

function uniqueText(items: string[]) {
  return items
    .filter((item) => item.trim().length > 0)
    .filter((item, index, source) => source.indexOf(item) === index)
}

export function evaluateAssessmentSimulationReadiness(
  blueprintId: AssessmentBlueprintId,
  model: CircuitModel,
  simulation: SimulationResult
): AssessmentSimulationReadiness {
  const checks =
    blueprintId === 'university-circuit-midterm'
      ? buildUniversitySimulationChecks(model, simulation)
      : blueprintId === 'electrician-practice-cert'
        ? buildElectricianSimulationChecks(model, simulation)
        : buildHighSchoolSimulationChecks(model, simulation)
  const passedChecks = checks.filter((check) => check.passed).length
  const percent = checks.length === 0 ? 0 : Math.round((passedChecks / checks.length) * 100)

  return {
    blueprintId,
    percent,
    passed: passedChecks === checks.length,
    passedChecks,
    totalChecks: checks.length,
    checks,
    nextActions: checks.filter((check) => !check.passed).map((check) => check.action)
  }
}

function buildHighSchoolSimulationChecks(
  model: CircuitModel,
  simulation: SimulationResult
): AssessmentSimulationCheck[] {
  const loads = getLoadDevices(model)
  const measurableLoads = getMeasurableLoadCount(loads, simulation)

  return [
    {
      id: 'hs-closed-loop',
      label: '闭合回路',
      detail: simulation.closedCircuit ? '当前电路已形成工作电流。' : '当前没有形成可测工作电流。',
      passed: simulation.closedCircuit && !simulation.shortCircuit,
      action: '闭合主开关，并确认正极、负载、回线到负极都已接通。'
    },
    {
      id: 'hs-parallel-samples',
      label: '并联样本',
      detail: `当前可比较 ${loads.length} 个负载支路。`,
      passed: loads.length >= 2,
      action: '至少保留两个负载支路，例如照明灯和排风扇，用于比较并联端电压。'
    },
    {
      id: 'hs-measurement',
      label: '测量读数',
      detail: `已有 ${measurableLoads} 个负载可读取端电压和电流。`,
      passed: measurableLoads >= 1 && simulation.totalCurrent > 0,
      action: '让至少一个负载通电，再在属性面板读取端电压、电流和功率。'
    }
  ]
}

function buildUniversitySimulationChecks(
  model: CircuitModel,
  simulation: SimulationResult
): AssessmentSimulationCheck[] {
  const loads = getLoadDevices(model)
  const workingEffects = getWorkingLoadEffects(loads, simulation)
  const currentSum = workingEffects.reduce((total, effect) => total + effect.current, 0)
  const currentTolerance = Math.max(0.02, simulation.totalCurrent * 0.03)
  const kclPassed =
    simulation.closedCircuit &&
    workingEffects.length >= 2 &&
    Math.abs(currentSum - simulation.totalCurrent) <= currentTolerance
  const parallelVoltagePassed =
    workingEffects.length >= 2 &&
    workingEffects.every(
      (effect) => Math.abs(effect.voltage - simulation.supplyVoltage) <= Math.max(0.3, simulation.supplyVoltage * 0.05)
    )

  return [
    {
      id: 'uni-kcl',
      label: 'KCL 电流守恒',
      detail: `支路电流合计 ${formatAmp(currentSum)}A，总电流 ${formatAmp(simulation.totalCurrent)}A。`,
      passed: kclPassed,
      action: '接通两个以上并联负载，并比较各支路电流之和与总电流。'
    },
    {
      id: 'uni-parallel-voltage',
      label: '并联端电压',
      detail: `当前电源 ${formatVolt(simulation.supplyVoltage)}V，工作负载 ${workingEffects.length} 个。`,
      passed: parallelVoltagePassed,
      action: '保持两个工作负载并联在同一电源节点上，使端电压接近电源电压。'
    },
    {
      id: 'uni-no-short',
      label: '无短路保护',
      detail: simulation.shortCircuit ? '仿真器检测到正负极短接。' : '当前未触发短路保护。',
      passed: !simulation.shortCircuit,
      action: '断开正负极直连导线，避免绕过负载形成短路。'
    }
  ]
}

function buildElectricianSimulationChecks(
  model: CircuitModel,
  simulation: SimulationResult
): AssessmentSimulationCheck[] {
  const loads = getLoadDevices(model)
  const protectionDevices = getProtectionDevices(model)
  const mismatchedLoads = getRatedVoltageMismatches(loads, simulation)
  const hasDangerIssue = simulation.shortCircuit || simulation.issues.some((issue) => issue.severity === 'error')

  return [
    {
      id: 'pro-low-voltage',
      label: '低压训练电源',
      detail: `当前电源 ${formatVolt(simulation.supplyVoltage)}V。`,
      passed: simulation.hasSource && simulation.supplyVoltage > 0 && simulation.supplyVoltage <= 36,
      action: '把训练电源调到 36V 以内，优先使用 12V 或 24V 低压回路。'
    },
    {
      id: 'pro-protection-chain',
      label: '开关/保护链',
      detail: `当前检测到 ${protectionDevices.length} 个开关或保护器件。`,
      passed: protectionDevices.length > 0,
      action: '加入主开关、保险丝、急停或热继保护触点，形成可隔离的安全链。'
    },
    {
      id: 'pro-no-danger',
      label: '无危险短路',
      detail: hasDangerIssue ? '当前存在短路或严重仿真错误。' : '当前没有严重短路风险。',
      passed: !hasDangerIssue,
      action: '先断开电源并排查正负极短接，再恢复训练。'
    },
    {
      id: 'pro-rated-match',
      label: '额定电压匹配',
      detail:
        mismatchedLoads.length === 0
          ? '负载额定电压与当前电源匹配。'
          : `${mismatchedLoads.map((device) => device.label).join('、')} 存在过压风险。`,
      passed: loads.length > 0 && mismatchedLoads.length === 0,
      action: '降低电源电压，或改用额定电压匹配的负载/控制模块。'
    }
  ]
}

function getLoadDevices(model: CircuitModel) {
  return model.devices.filter((device) => device.enabled !== false && isLoadKind(device.kind))
}

function getWorkingLoadEffects(loads: CircuitDevice[], simulation: SimulationResult) {
  return loads
    .map((device) => simulation.effects[device.id])
    .filter((effect): effect is NonNullable<typeof effect> => Boolean(effect?.active && effect.current > 0))
}

function getMeasurableLoadCount(loads: CircuitDevice[], simulation: SimulationResult) {
  return loads.filter((device) => {
    const effect = simulation.effects[device.id]
    return Boolean(effect && (effect.voltage > 0.2 || effect.current > 0.001))
  }).length
}

function getProtectionDevices(model: CircuitModel) {
  return model.devices.filter((device) => {
    if (device.enabled === false) return false
    return (
      isConductiveControlKind(device.kind) ||
      device.kind === 'fuse' ||
      device.kind === 'emergency-stop' ||
      device.kind === 'thermal-overload'
    )
  })
}

function getRatedVoltageMismatches(loads: CircuitDevice[], simulation: SimulationResult) {
  if (simulation.supplyVoltage <= 0) return []

  return loads.filter((device) => {
    const ratedVoltage = device.ratedVoltage ?? getDeviceDefinition(device.kind).defaultRatedVoltage
    return ratedVoltage !== undefined && ratedVoltage < simulation.supplyVoltage * 0.9
  })
}

function formatAmp(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function formatVolt(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0'
}
