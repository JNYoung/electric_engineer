import {
  KNOWLEDGE_QUESTIONS,
  evaluateKnowledgeAnswer,
  getQuestionsForTrack
} from './knowledge'
import type { KnowledgeQuestion, KnowledgeTrackId } from './knowledge'

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

export function getBlueprintsForTrack(trackId: KnowledgeTrackId) {
  return ASSESSMENT_BLUEPRINTS.filter((blueprint) =>
    blueprint.trackWeights.some((weight) => weight.trackId === trackId)
  )
}
