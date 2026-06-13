import type { RuntimeAuthConfig } from './auth'
import type { AuthSession } from './commercial'
import {
  KNOWLEDGE_QUESTIONS,
  evaluateKnowledgeAnswer,
  type KnowledgeTrackId
} from './knowledge'

export type KnowledgeAnswerMap = Record<string, string>
export type ProgressSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

export interface QuestionBankProgressPayload {
  answered: number
  correct: number
  wrong: number
  total: number
  answers: KnowledgeAnswerMap
  wrongQuestionIds: string[]
}

export interface UserProgressSnapshot {
  userId: string
  courseProgress: Record<string, unknown>
  questionBank: QuestionBankProgressPayload
  updatedAt?: string
}

export interface SyncedQuestionBank {
  id: string
  userId: string
  title: string
  mode: 'question-bank' | 'wrong'
  trackId: KnowledgeTrackId
  answers: Array<{
    questionId: string
    answerId: string
    correct: boolean
    answeredAt: string
  }>
  wrongQuestionIds: string[]
  createdAt: string
  updatedAt: string
}

export interface QuestionBankListResult {
  userId: string
  banks: SyncedQuestionBank[]
}

export function buildQuestionBankProgressPayload(
  answers: KnowledgeAnswerMap
): QuestionBankProgressPayload {
  const answeredEntries = Object.entries(answers).filter(([questionId]) =>
    KNOWLEDGE_QUESTIONS.some((question) => question.id === questionId)
  )
  const wrongQuestionIds: string[] = []
  let correct = 0

  for (const [questionId, answerId] of answeredEntries) {
    const result = evaluateKnowledgeAnswer(questionId, answerId)
    if (result.correct) {
      correct += 1
    } else {
      wrongQuestionIds.push(questionId)
    }
  }

  return {
    answered: answeredEntries.length,
    correct,
    wrong: wrongQuestionIds.length,
    total: KNOWLEDGE_QUESTIONS.length,
    answers: Object.fromEntries(answeredEntries),
    wrongQuestionIds
  }
}

export function mergeKnowledgeAnswers(
  localAnswers: KnowledgeAnswerMap,
  remoteAnswers: KnowledgeAnswerMap | undefined
): KnowledgeAnswerMap {
  return {
    ...(remoteAnswers ?? {}),
    ...localAnswers
  }
}

export async function requestUserProgress(
  config: RuntimeAuthConfig,
  session: AuthSession
): Promise<UserProgressSnapshot | null> {
  if (session.status !== 'authenticated' || !session.userId) return null

  try {
    const url = new URL(`${config.apiBaseUrl}/api/progress`)
    url.searchParams.set('region', config.region)
    url.searchParams.set('userId', session.userId)
    const progress = await getJson<Partial<UserProgressSnapshot>>(url.toString())

    return normalizeUserProgress(progress, session.userId)
  } catch {
    return null
  }
}

export async function syncUserProgress(
  config: RuntimeAuthConfig,
  session: AuthSession,
  answers: KnowledgeAnswerMap,
  courseProgress: Record<string, unknown> = {}
): Promise<UserProgressSnapshot | null> {
  if (session.status !== 'authenticated' || !session.userId) return null

  try {
    const progress = await postJson<Partial<UserProgressSnapshot>>(`${config.apiBaseUrl}/api/progress/sync`, {
      region: config.region,
      userId: session.userId,
      progress: {
        courseProgress,
        questionBank: buildQuestionBankProgressPayload(answers)
      }
    })

    return normalizeUserProgress(progress, session.userId)
  } catch {
    return null
  }
}

export async function requestQuestionBanks(
  config: RuntimeAuthConfig,
  session: AuthSession
): Promise<QuestionBankListResult | null> {
  if (session.status !== 'authenticated' || !session.userId) return null

  try {
    const url = new URL(`${config.apiBaseUrl}/api/question-banks`)
    url.searchParams.set('region', config.region)
    url.searchParams.set('userId', session.userId)
    const response = await getJson<QuestionBankListResult>(url.toString())

    return {
      userId: response.userId ?? session.userId,
      banks: normalizeQuestionBanks(response.banks)
    }
  } catch {
    return null
  }
}

export async function createQuestionBank(
  config: RuntimeAuthConfig,
  session: AuthSession,
  trackId: KnowledgeTrackId,
  title: string,
  mode: 'question-bank' | 'wrong' = 'question-bank'
): Promise<SyncedQuestionBank | null> {
  if (session.status !== 'authenticated' || !session.userId) return null

  try {
    const bank = await postJson<SyncedQuestionBank>(`${config.apiBaseUrl}/api/question-banks`, {
      region: config.region,
      userId: session.userId,
      title,
      trackId,
      mode
    })

    return normalizeQuestionBanks([bank])[0] ?? null
  } catch {
    return null
  }
}

export async function recordQuestionBankAnswer(
  config: RuntimeAuthConfig,
  session: AuthSession,
  bankId: string | undefined,
  questionId: string,
  answerId: string,
  correct: boolean
): Promise<SyncedQuestionBank | null> {
  if (session.status !== 'authenticated' || !session.userId || !bankId) return null

  try {
    const bank = await postJson<SyncedQuestionBank>(
      `${config.apiBaseUrl}/api/question-banks/${encodeURIComponent(bankId)}/answer`,
      {
        region: config.region,
        userId: session.userId,
        questionId,
        answerId,
        correct
      }
    )

    return normalizeQuestionBanks([bank])[0] ?? null
  } catch {
    return null
  }
}

function normalizeUserProgress(
  progress: Partial<UserProgressSnapshot>,
  fallbackUserId: string
): UserProgressSnapshot {
  return {
    userId: progress.userId ?? fallbackUserId,
    courseProgress: progress.courseProgress ?? {},
    questionBank: {
      ...buildQuestionBankProgressPayload({}),
      ...(progress.questionBank ?? {}),
      answers: progress.questionBank?.answers ?? {},
      wrongQuestionIds: progress.questionBank?.wrongQuestionIds ?? []
    },
    updatedAt: progress.updatedAt
  }
}

function normalizeQuestionBanks(banks: SyncedQuestionBank[] | undefined): SyncedQuestionBank[] {
  return (banks ?? []).filter((bank): bank is SyncedQuestionBank =>
    Boolean(bank?.id && bank.trackId && bank.title)
  )
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return response.json() as Promise<T>
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return response.json() as Promise<T>
}
