import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_BLUEPRINTS,
  buildAssessmentSession,
  getBlueprintsForTrack,
  scoreAssessmentSession
} from '../../src/core/assessment'

describe('assessment blueprints', () => {
  it('builds deterministic sessions from professional exam blueprints', () => {
    const session = buildAssessmentSession('electrician-practice-cert')

    expect(session.items).toHaveLength(5)
    expect(session.totalPoints).toBeGreaterThan(0)
    expect(session.items.some((item) => item.question.trackId === 'electrician')).toBe(true)
    expect(ASSESSMENT_BLUEPRINTS.every((blueprint) => blueprint.simulationRequirements.length > 0)).toBe(true)
  })

  it('scores completed sessions and reports weak tracks', () => {
    const session = buildAssessmentSession('high-school-foundation-check')
    const perfectAnswers = Object.fromEntries(session.items.map((item) => [item.question.id, item.question.answerId]))
    const perfectScore = scoreAssessmentSession(session, perfectAnswers)
    const missedScore = scoreAssessmentSession(session, {
      [session.items[0].question.id]: 'wrong'
    })

    expect(perfectScore.passed).toBe(true)
    expect(perfectScore.percent).toBe(100)
    expect(missedScore.passed).toBe(false)
    expect(missedScore.weakTracks).toContain('high-school')
    expect(missedScore.remediation.length).toBeGreaterThan(0)
  })

  it('indexes blueprints by knowledge track', () => {
    expect(getBlueprintsForTrack('electrician').map((item) => item.id)).toContain('electrician-practice-cert')
    expect(getBlueprintsForTrack('university').map((item) => item.id)).toContain('university-circuit-midterm')
  })
})
