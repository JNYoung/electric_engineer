import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_BLUEPRINTS,
  buildAssessmentCertificationReadiness,
  buildAssessmentPracticeReport,
  buildAssessmentSession,
  buildAssessmentSkillStation,
  evaluateAssessmentSimulationReadiness,
  getBlueprintsForTrack,
  scoreAssessmentSession
} from '../../src/core/assessment'
import { createInitialCircuit } from '../../src/core/circuitFactory'
import { buildVirtualMeterWorksheet } from '../../src/core/instruments'
import { simulateCircuit } from '../../src/core/simulator'

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

  it('evaluates simulation readiness for school and university exam environments', () => {
    const model = createInitialCircuit(12)
    const simulation = simulateCircuit(model)
    const highSchoolReadiness = evaluateAssessmentSimulationReadiness(
      'high-school-foundation-check',
      model,
      simulation
    )
    const universityReadiness = evaluateAssessmentSimulationReadiness(
      'university-circuit-midterm',
      model,
      simulation
    )

    expect(highSchoolReadiness.passed).toBe(true)
    expect(highSchoolReadiness.percent).toBe(100)
    expect(universityReadiness.checks.find((check) => check.id === 'uni-kcl')?.passed).toBe(true)
    expect(universityReadiness.checks.find((check) => check.id === 'uni-parallel-voltage')?.passed).toBe(true)
  })

  it('reports actionable readiness gaps when the circuit is not suitable for a blueprint', () => {
    const baseCircuit = createInitialCircuit(12)
    const openCircuit = {
      ...baseCircuit,
      wires: baseCircuit.wires.map((wire) =>
        wire.id === 'w-lamp-neg' || wire.id === 'w-fan-neg'
          ? { ...wire, connected: false }
          : wire
      )
    }
    const openReadiness = evaluateAssessmentSimulationReadiness(
      'high-school-foundation-check',
      openCircuit,
      simulateCircuit(openCircuit)
    )
    const overVoltage = createInitialCircuit(48)
    const electricianReadiness = evaluateAssessmentSimulationReadiness(
      'electrician-practice-cert',
      overVoltage,
      simulateCircuit(overVoltage)
    )

    expect(openReadiness.passed).toBe(false)
    expect(openReadiness.nextActions.some((action) => action.includes('闭合主开关'))).toBe(true)
    expect(electricianReadiness.passed).toBe(false)
    expect(electricianReadiness.checks.find((check) => check.id === 'pro-low-voltage')?.passed).toBe(false)
    expect(electricianReadiness.checks.find((check) => check.id === 'pro-rated-match')?.passed).toBe(false)
  })

  it('builds practice reports for progress, pass, and simulation-gap states', () => {
    const session = buildAssessmentSession('high-school-foundation-check')
    const model = createInitialCircuit(12)
    const readiness = evaluateAssessmentSimulationReadiness(
      'high-school-foundation-check',
      model,
      simulateCircuit(model)
    )
    const emptyReport = buildAssessmentPracticeReport(session, {}, readiness)
    const perfectAnswers = Object.fromEntries(session.items.map((item) => [item.question.id, item.question.answerId]))
    const passedReport = buildAssessmentPracticeReport(session, perfectAnswers, readiness)
    const openModel = {
      ...model,
      wires: model.wires.map((wire) =>
        wire.id === 'w-lamp-neg' || wire.id === 'w-fan-neg'
          ? { ...wire, connected: false }
          : wire
      )
    }
    const openReadiness = evaluateAssessmentSimulationReadiness(
      'high-school-foundation-check',
      openModel,
      simulateCircuit(openModel)
    )
    const simulationGapReport = buildAssessmentPracticeReport(session, perfectAnswers, openReadiness)

    expect(emptyReport.status).toBe('未开始')
    expect(emptyReport.completionPercent).toBe(0)
    expect(emptyReport.recommendedTrackIds).toContain('high-school')
    expect(passedReport.status).toBe('已通过')
    expect(passedReport.passed).toBe(true)
    expect(passedReport.focus.some((item) => item.title === '成绩表现' && item.severity === 'success')).toBe(true)
    expect(simulationGapReport.status).toBe('待补仿真')
    expect(simulationGapReport.passed).toBe(false)
    expect(simulationGapReport.nextActions.some((action) => action.includes('闭合主开关'))).toBe(true)
  })

  it('builds certification readiness gates for submission decisions', () => {
    const session = buildAssessmentSession('high-school-foundation-check')
    const model = createInitialCircuit(12)
    const readiness = evaluateAssessmentSimulationReadiness(
      session.blueprintId,
      model,
      simulateCircuit(model)
    )
    const emptyReadiness = buildAssessmentCertificationReadiness(session, {}, readiness)
    const perfectAnswers = Object.fromEntries(session.items.map((item) => [item.question.id, item.question.answerId]))
    const passedReadiness = buildAssessmentCertificationReadiness(session, perfectAnswers, readiness)
    const openModel = {
      ...model,
      wires: model.wires.map((wire) =>
        wire.id === 'w-lamp-neg' || wire.id === 'w-fan-neg'
          ? { ...wire, connected: false }
          : wire
      )
    }
    const simulationGapReadiness = buildAssessmentCertificationReadiness(
      session,
      perfectAnswers,
      evaluateAssessmentSimulationReadiness(session.blueprintId, openModel, simulateCircuit(openModel))
    )

    expect(emptyReadiness.status).toBe('待完成')
    expect(emptyReadiness.eligible).toBe(false)
    expect(emptyReadiness.gates.map((gate) => gate.id)).toEqual(['completion', 'score', 'simulation'])
    expect(passedReadiness.status).toBe('可提交')
    expect(passedReadiness.eligible).toBe(true)
    expect(passedReadiness.completedGates).toBe(3)
    expect(simulationGapReadiness.status).toBe('待补仿真')
    expect(simulationGapReadiness.nextActions.some((action) => action.includes('闭合主开关'))).toBe(true)
  })

  it('builds assessment station gates from theory, simulation, and meter evidence', () => {
    const session = buildAssessmentSession('high-school-foundation-check')
    const model = createInitialCircuit(12)
    const simulation = simulateCircuit(model)
    const readiness = evaluateAssessmentSimulationReadiness(session.blueprintId, model, simulation)
    const meter = buildVirtualMeterWorksheet(model, simulation)
    const perfectAnswers = Object.fromEntries(session.items.map((item) => [item.question.id, item.question.answerId]))
    const emptyStation = buildAssessmentSkillStation(session, {}, readiness, meter)
    const readyStation = buildAssessmentSkillStation(session, perfectAnswers, readiness, meter)
    const dangerModel = createInitialCircuit(48)
    const dangerSimulation = simulateCircuit(dangerModel)
    const dangerStation = buildAssessmentSkillStation(
      session,
      perfectAnswers,
      evaluateAssessmentSimulationReadiness(session.blueprintId, dangerModel, dangerSimulation),
      buildVirtualMeterWorksheet(dangerModel, dangerSimulation)
    )

    expect(emptyStation.status).toBe('待补证据')
    expect(emptyStation.gates.find((gate) => gate.id === 'theory')?.passed).toBe(false)
    expect(emptyStation.gates.find((gate) => gate.id === 'meter')?.passed).toBe(true)
    expect(readyStation.status).toBe('可提交')
    expect(readyStation.ready).toBe(true)
    expect(readyStation.completedGates).toBe(3)
    expect(dangerStation.status).toBe('需排障')
    expect(dangerStation.gates.find((gate) => gate.id === 'meter')?.severity).toBe('danger')
    expect(dangerStation.nextActions.some((action) => action.includes('降低电源'))).toBe(true)
  })
})
