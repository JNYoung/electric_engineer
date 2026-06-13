import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildProviderSession, getAuthProviders } from '../../src/core/auth'
import {
  buildQuestionBankProgressPayload,
  createQuestionBank,
  mergeKnowledgeAnswers,
  recordQuestionBankAnswer,
  requestQuestionBanks,
  requestUserProgress,
  syncUserProgress
} from '../../src/core/progress'
import type { RuntimeAuthConfig } from '../../src/core/auth'

const config: RuntimeAuthConfig = {
  region: 'domestic',
  apiBaseUrl: 'http://progress.test',
  serverPort: 4317,
  appDistribution: 'production',
  internalTestUnlock: false,
  providers: getAuthProviders('domestic'),
  signInEndpoint: 'http://progress.test/api/auth/sign-in',
  linkEndpoint: 'http://progress.test/api/auth/link',
  otpEndpoint: 'http://progress.test/api/auth/otp/send',
  profileEndpoint: 'http://progress.test/api/auth/profile',
  accountDeleteEndpoint: 'http://progress.test/api/auth/account/delete',
  internalUnlockEndpoint: 'http://progress.test/api/entitlements/test-unlock'
}

describe('progress and question bank client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds question-bank progress from answer maps', () => {
    const progress = buildQuestionBankProgressPayload({
      'hs-ohm-current': 'a',
      'hs-parallel-voltage': 'a',
      unknown: 'x'
    })

    expect(progress.answered).toBe(2)
    expect(progress.correct).toBe(1)
    expect(progress.wrong).toBe(1)
    expect(progress.wrongQuestionIds).toEqual(['hs-parallel-voltage'])
    expect(progress.answers).toEqual({
      'hs-ohm-current': 'a',
      'hs-parallel-voltage': 'a'
    })
  })

  it('merges remote answers without overwriting fresh local work', () => {
    expect(mergeKnowledgeAnswers(
      { 'hs-ohm-current': 'a' },
      { 'hs-ohm-current': 'b', 'uni-kcl': 'a' }
    )).toEqual({
      'hs-ohm-current': 'a',
      'uni-kcl': 'a'
    })
  })

  it('loads and syncs account progress through the backend endpoints', async () => {
    const session = buildProviderSession(config.providers[0], 'domestic')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: session.userId,
          questionBank: {
            answered: 1,
            correct: 1,
            wrong: 0,
            answers: { 'hs-ohm-current': 'a' },
            wrongQuestionIds: []
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: session.userId,
          questionBank: {
            answered: 2,
            correct: 1,
            wrong: 1,
            answers: {
              'hs-ohm-current': 'a',
              'hs-parallel-voltage': 'a'
            },
            wrongQuestionIds: ['hs-parallel-voltage']
          }
        })
      } as Response)

    const remote = await requestUserProgress(config, session)
    const synced = await syncUserProgress(config, session, {
      'hs-ohm-current': 'a',
      'hs-parallel-voltage': 'a'
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://progress.test/api/progress?region=domestic&userId=${encodeURIComponent(session.userId!)}`
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://progress.test/api/progress/sync',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"wrongQuestionIds":["hs-parallel-voltage"]')
      })
    )
    expect(remote?.questionBank.answers['hs-ohm-current']).toBe('a')
    expect(synced?.questionBank.wrong).toBe(1)
  })

  it('creates question banks and records answers through backend endpoints', async () => {
    const session = buildProviderSession(config.providers[0], 'domestic')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: session.userId,
          banks: []
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'qb_1',
          userId: session.userId,
          title: '欧姆定律题库',
          mode: 'question-bank',
          trackId: 'high-school',
          answers: [],
          wrongQuestionIds: [],
          createdAt: '2026-06-14T00:00:00.000Z',
          updatedAt: '2026-06-14T00:00:00.000Z'
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'qb_1',
          userId: session.userId,
          title: '欧姆定律题库',
          mode: 'question-bank',
          trackId: 'high-school',
          answers: [{ questionId: 'hs-ohm-current', answerId: 'a', correct: true, answeredAt: 'now' }],
          wrongQuestionIds: [],
          createdAt: '2026-06-14T00:00:00.000Z',
          updatedAt: '2026-06-14T00:00:01.000Z'
        })
      } as Response)

    const banks = await requestQuestionBanks(config, session)
    const bank = await createQuestionBank(config, session, 'high-school', '欧姆定律题库')
    const answered = await recordQuestionBankAnswer(config, session, bank?.id, 'hs-ohm-current', 'a', true)

    expect(banks?.banks).toEqual([])
    expect(bank?.trackId).toBe('high-school')
    expect(answered?.answers[0]?.correct).toBe(true)
  })
})
