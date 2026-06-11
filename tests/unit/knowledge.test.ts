import { describe, expect, it } from 'vitest'
import { createInitialCircuit } from '../../src/core/circuitFactory'
import {
  KNOWLEDGE_TRACKS,
  buildFormulaVerificationWorksheet,
  buildKnowledgeMeasurementWorksheet,
  buildKnowledgeReviewNotebook,
  buildKnowledgeSimulationChecks,
  buildKnowledgeTrackProgress,
  evaluateKnowledgeAnswer,
  getQuestionsForTrack
} from '../../src/core/knowledge'
import { simulateCircuit } from '../../src/core/simulator'

describe('knowledge verification library', () => {
  it('covers high school, university, and professional electrician tracks', () => {
    expect(KNOWLEDGE_TRACKS.map((track) => track.id)).toEqual([
      'high-school',
      'university',
      'electrician'
    ])
    expect(getQuestionsForTrack('high-school').length).toBeGreaterThanOrEqual(3)
    expect(getQuestionsForTrack('university').length).toBeGreaterThanOrEqual(3)
    expect(getQuestionsForTrack('electrician').length).toBeGreaterThanOrEqual(3)
  })

  it('grades answers and summarizes mastery progress', () => {
    const correct = evaluateKnowledgeAnswer('hs-ohm-current', 'a')
    const incorrect = evaluateKnowledgeAnswer('hs-ohm-current', 'b')
    const progress = buildKnowledgeTrackProgress('high-school', {
      'hs-ohm-current': 'a',
      'hs-parallel-voltage': 'b',
      'hs-power': 'a'
    })

    expect(correct.correct).toBe(true)
    expect(incorrect.correct).toBe(false)
    expect(progress.percent).toBe(100)
    expect(progress.status).toBe('已掌握')
  })

  it('builds a review notebook for wrong and unfinished questions', () => {
    const wrongOnly = buildKnowledgeReviewNotebook(
      {
        'hs-ohm-current': 'b',
        'hs-parallel-voltage': 'b'
      },
      { trackIds: ['high-school'] }
    )

    expect(wrongOnly.status).toBe('待复训')
    expect(wrongOnly.wrong).toBe(1)
    expect(wrongOnly.unanswered).toBe(0)
    expect(wrongOnly.items[0].title).toBe('欧姆定律计算')
    expect(wrongOnly.items[0].selectedAnswerLabel).toBe('2A')
    expect(wrongOnly.priorityTrackIds).toEqual(['high-school'])

    const withUnanswered = buildKnowledgeReviewNotebook(
      {
        'pro-lockout': 'a'
      },
      { trackIds: ['electrician'], includeUnanswered: true }
    )

    expect(withUnanswered.status).toBe('复训中')
    expect(withUnanswered.wrong).toBe(0)
    expect(withUnanswered.unanswered).toBe(2)
    expect(withUnanswered.nextActions.some((item) => item.includes('电工实操'))).toBe(true)
  })

  it('maps a simulated circuit to knowledge checks for each learning level', () => {
    const model = createInitialCircuit(12)
    const result = simulateCircuit(model)

    expect(buildKnowledgeSimulationChecks('high-school', model, result).every((check) => check.passed)).toBe(true)
    expect(buildKnowledgeSimulationChecks('university', model, result).some((check) => check.id === 'kcl-balance')).toBe(true)
    expect(buildKnowledgeSimulationChecks('electrician', model, result).find((check) => check.id === 'no-danger')?.passed).toBe(true)
  })

  it('builds measurement worksheets from live simulation results', () => {
    const model = createInitialCircuit(12)
    const result = simulateCircuit(model)
    const highSchool = buildKnowledgeMeasurementWorksheet('high-school', model, result)
    const university = buildKnowledgeMeasurementWorksheet('university', model, result)
    const proModel = createInitialCircuit(48)
    const pro = buildKnowledgeMeasurementWorksheet('electrician', proModel, simulateCircuit(proModel))

    expect(highSchool.status).toBe('可测量')
    expect(highSchool.items.find((item) => item.id === 'hs-load-current')?.value).toContain('A')
    expect(highSchool.passed).toBe(highSchool.total)
    expect(university.items.find((item) => item.id === 'uni-kcl-gap')?.passed).toBe(true)
    expect(pro.status).toBe('风险')
    expect(pro.items.find((item) => item.id === 'pro-safe-voltage')?.passed).toBe(false)
    expect(pro.nextActions.some((action) => action.includes('36V'))).toBe(true)
  })

  it('builds formula verification cards from live simulation readings', () => {
    const model = createInitialCircuit(12)
    const result = simulateCircuit(model)
    const highSchool = buildFormulaVerificationWorksheet('high-school', model, result)
    const university = buildFormulaVerificationWorksheet('university', model, result)
    const proModel = createInitialCircuit(48)
    const pro = buildFormulaVerificationWorksheet('electrician', proModel, simulateCircuit(proModel))

    expect(highSchool.status).toBe('可验算')
    expect(highSchool.cards.find((card) => card.id === 'formula-ohm-current')?.passed).toBe(true)
    expect(highSchool.cards.find((card) => card.id === 'formula-power')?.formula).toBe('P = U × I')
    expect(university.cards.find((card) => card.id === 'formula-kcl')?.passed).toBe(true)
    expect(university.cards.find((card) => card.id === 'formula-equivalent-resistance')?.observed).toContain('Ω')
    expect(pro.status).toBe('风险')
    expect(pro.cards.find((card) => card.id === 'formula-safe-voltage')?.passed).toBe(false)
    expect(pro.nextActions.some((action) => action.includes('36V'))).toBe(true)
  })
})
