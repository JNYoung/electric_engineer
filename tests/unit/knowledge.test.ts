import { describe, expect, it } from 'vitest'
import { createInitialCircuit } from '../../src/core/circuitFactory'
import {
  KNOWLEDGE_TRACKS,
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

  it('maps a simulated circuit to knowledge checks for each learning level', () => {
    const model = createInitialCircuit(12)
    const result = simulateCircuit(model)

    expect(buildKnowledgeSimulationChecks('high-school', model, result).every((check) => check.passed)).toBe(true)
    expect(buildKnowledgeSimulationChecks('university', model, result).some((check) => check.id === 'kcl-balance')).toBe(true)
    expect(buildKnowledgeSimulationChecks('electrician', model, result).find((check) => check.id === 'no-danger')?.passed).toBe(true)
  })
})
