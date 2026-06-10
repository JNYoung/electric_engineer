import { useMemo, useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import './index.scss'
import { createBranchWires, createDevice, createInitialCircuit } from '@/core/circuitFactory'
import {
  canAutoConnect,
  getDeviceDefinition,
  isConductiveControlKind,
  isLoadKind
} from '@/core/registry'
import { simulateCircuit } from '@/core/simulator'
import {
  BILLING_PLANS,
  COMMERCIAL_API_CONTRACT,
  DEFAULT_AUTH_SESSION,
  DOMAIN_PROFILES,
  canUseCatalogEntry,
  createAuthenticatedSession,
  getCatalogEntries,
  getCatalogEntriesByCategory,
  getCatalogSummary,
  getDomainProfile,
  hasTierAccess
} from '@/core/commercial'
import {
  buildSafetyDiagnostics,
  createTrainingCircuit,
  evaluateTrainingChallenge,
  getChallengeById,
  getLessonById,
  LEARNING_LESSONS,
  TRAINING_CHALLENGES
} from '@/core/training'
import {
  KNOWLEDGE_TRACKS,
  buildKnowledgeSimulationChecks,
  buildKnowledgeTrackProgress,
  evaluateKnowledgeAnswer,
  getKnowledgeTrack,
  getQuestionsForTrack
} from '@/core/knowledge'
import type { CircuitDevice, CircuitModel, DeviceKind, SimulationResult, Wire } from '@/core/types'
import type {
  ChallengeEvaluation,
  LearningLesson,
  SafetyDiagnostic,
  TrainingChallenge
} from '@/core/training'
import type {
  KnowledgeSimulationCheck,
  KnowledgeTrackId,
  KnowledgeTrackProgress
} from '@/core/knowledge'
import type {
  AuthSession,
  BillingPlan,
  ComponentCatalogEntry,
  SubscriptionTier,
  WorkbenchDomain
} from '@/core/commercial'

const visualParts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
type MobileTabId = 'learn' | 'simulate' | 'bank' | 'library' | 'account'

const MOBILE_NAV_ITEMS: Array<{ id: MobileTabId; label: string }> = [
  { id: 'learn', label: '学习' },
  { id: 'simulate', label: '仿真' },
  { id: 'bank', label: '题库' },
  { id: 'library', label: '素材' },
  { id: 'account', label: '账号' }
]

function ComponentIllustration({ kind, compact = false }: { kind: DeviceKind; compact?: boolean }) {
  return (
    <View className={['component-visual', `visual-${kind}`, compact ? 'is-compact' : ''].filter(Boolean).join(' ')}>
      {visualParts.map((part) => (
        <View key={part} className={`visual-part part-${part}`} />
      ))}
    </View>
  )
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00'
}

function terminalPoint(device: CircuitDevice, terminalId: string) {
  const nodeWidth = 136
  const nodeHeight = 74
  const centerY = device.y + nodeHeight / 2

  if (device.kind === 'power-positive') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  if (device.kind === 'power-negative') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  if (terminalId === 'out' || terminalId === 'b') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  return { x: device.x, y: centerY }
}

function routeWire(wire: Wire, devicesById: Map<string, CircuitDevice>) {
  const fromDevice = devicesById.get(wire.from.deviceId)
  const toDevice = devicesById.get(wire.to.deviceId)
  if (!fromDevice || !toDevice) return []

  const from = terminalPoint(fromDevice, wire.from.terminalId)
  const to = terminalPoint(toDevice, wire.to.terminalId)
  const midX = Math.round((from.x + to.x) / 2)

  return [
    horizontalSegment(from.x, from.y, midX),
    verticalSegment(midX, from.y, to.y),
    horizontalSegment(midX, to.y, to.x)
  ].filter((segment) => segment.w > 0 && segment.h > 0)
}

function horizontalSegment(x1: number, y: number, x2: number) {
  const height = 6
  return {
    x: Math.min(x1, x2),
    y: y - height / 2,
    w: Math.abs(x2 - x1),
    h: height
  }
}

function verticalSegment(x: number, y1: number, y2: number) {
  const width = 6
  return {
    x: x - width / 2,
    y: Math.min(y1, y2),
    w: width,
    h: Math.abs(y2 - y1)
  }
}

function updateDevice(model: CircuitModel, id: string, patch: Partial<CircuitDevice>): CircuitModel {
  return {
    ...model,
    devices: model.devices.map((device) =>
      device.id === id ? { ...device, ...patch } : device
    )
  }
}

function updateWire(model: CircuitModel, id: string, connected: boolean): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((wire) =>
      wire.id === id ? { ...wire, connected } : wire
    )
  }
}

function setAllWires(model: CircuitModel, connected: boolean): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((wire) => ({ ...wire, connected }))
  }
}

function statusLabel(status: ChallengeEvaluation['status']) {
  if (status === 'passed') return '达标'
  if (status === 'needs-work') return '训练中'
  return '待完成'
}

function tierLabel(tier: SubscriptionTier) {
  if (tier === 'team') return '团队'
  if (tier === 'pro') return '专业'
  return '免费'
}

function DomainSwitcher({
  activeDomain,
  onChange
}: {
  activeDomain: WorkbenchDomain
  onChange: (domain: WorkbenchDomain) => void
}) {
  return (
    <View className='domain-switcher'>
      {DOMAIN_PROFILES.map((profile) => (
        <Button
          key={profile.id}
          className={`domain-tab ${profile.id === activeDomain ? 'is-active' : ''}`}
          onClick={() => onChange(profile.id)}
        >
          {profile.label}
        </Button>
      ))}
    </View>
  )
}

function CommercialDashboard({
  activeDomain,
  session,
  onChangeDomain
}: {
  activeDomain: WorkbenchDomain
  session: AuthSession
  onChangeDomain: (domain: WorkbenchDomain) => void
}) {
  const profile = getDomainProfile(activeDomain)
  const summary = getCatalogSummary(activeDomain)
  const plan = BILLING_PLANS.find((item) => item.id === profile.recommendedTier) ?? BILLING_PLANS[0]

  return (
    <View className='commercial-dashboard'>
      <View className='commercial-copy'>
        <Text className='training-kicker'>商业化行业工作台</Text>
        <Text className='commercial-title'>{profile.headline}</Text>
        <Text className='commercial-desc'>{profile.description}</Text>
      </View>
      <View className='commercial-actions'>
        <DomainSwitcher activeDomain={activeDomain} onChange={onChangeDomain} />
        <View className='commercial-metrics'>
          <View>
            <Text className='metric-label'>行业元件</Text>
            <Text className='metric-value'>{summary.total}</Text>
          </View>
          <View>
            <Text className='metric-label'>建议电压</Text>
            <Text className='metric-value'>{profile.recommendedVoltage}V</Text>
          </View>
          <View>
            <Text className='metric-label'>账号档位</Text>
            <Text className='metric-value'>{tierLabel(session.tier)}</Text>
          </View>
        </View>
        <Text className='commercial-plan'>
          推荐套餐：{plan.name} · 高级元件 {summary.proCount} 个
        </Text>
      </View>
    </View>
  )
}

function CategoryFilter({
  activeDomain,
  activeCategoryId,
  onSelect
}: {
  activeDomain: WorkbenchDomain
  activeCategoryId: string
  onSelect: (categoryId: string) => void
}) {
  const profile = getDomainProfile(activeDomain)
  const allCount = getCatalogEntries(activeDomain).length

  return (
    <View className='category-filter'>
      <Button
        className={`category-filter-button ${activeCategoryId === 'all' ? 'is-active' : ''}`}
        onClick={() => onSelect('all')}
      >
        全部 {allCount}
      </Button>
      {profile.categories.map((category) => {
        const count = getCatalogEntriesByCategory(activeDomain, category.id).length
        return (
          <Button
            key={category.id}
            className={`category-filter-button ${activeCategoryId === category.id ? 'is-active' : ''}`}
            onClick={() => onSelect(category.id)}
          >
            {category.label} {count}
          </Button>
        )
      })}
    </View>
  )
}

function CatalogEntryRow({
  entry,
  session,
  onAdd,
  onLocked
}: {
  entry: ComponentCatalogEntry
  session: AuthSession
  onAdd: (kind: DeviceKind) => void
  onLocked: (tier: SubscriptionTier) => void
}) {
  const definition = getDeviceDefinition(entry.kind)
  const accessible = canUseCatalogEntry(session, entry)

  return (
    <View className={`palette-item catalog-entry ${accessible ? '' : 'is-locked'}`}>
      <View className={`palette-icon palette-${entry.kind}`}>
        <ComponentIllustration kind={entry.kind} compact />
      </View>
      <View className='palette-text'>
        <View className='catalog-title-row'>
          <Text className='palette-name'>{definition.name}</Text>
          <Text className={`tier-badge tier-${entry.tier}`}>{tierLabel(entry.tier)}</Text>
        </View>
        <Text className='palette-desc'>{entry.useCase}</Text>
        <View className='catalog-tags'>
          <Text>{entry.complexity}</Text>
          {entry.tags.map((tag) => (
            <Text key={tag}>{tag}</Text>
          ))}
        </View>
      </View>
      <Button
        className='small-action'
        onClick={() => {
          if (accessible) {
            onAdd(entry.kind)
          } else {
            onLocked(entry.tier)
          }
        }}
      >
        {accessible ? '添加' : '套餐'}
      </Button>
    </View>
  )
}

function CommercePanel({
  session,
  selectedPlanId,
  onSignIn,
  onSignOut,
  onSelectPlan
}: {
  session: AuthSession
  selectedPlanId: SubscriptionTier
  onSignIn: () => void
  onSignOut: () => void
  onSelectPlan: (tier: SubscriptionTier) => void
}) {
  return (
    <View className='commerce-panel'>
      <View className='training-card-head'>
        <View>
          <Text className='summary-title'>账号与付费接口</Text>
          <Text className='commerce-user'>{session.displayName}</Text>
        </View>
        <Text className={`tier-badge tier-${session.tier}`}>{tierLabel(session.tier)}</Text>
      </View>
      <View className='commerce-actions-row'>
        {session.status === 'authenticated' ? (
          <Button className='small-action' onClick={onSignOut}>退出演示</Button>
        ) : (
          <Button className='small-action' onClick={onSignIn}>模拟登录</Button>
        )}
        <Text className='commerce-status'>
          {session.status === 'authenticated' ? '已连接账号接口' : '等待接入真实登录'}
        </Text>
      </View>

      <View className='plan-list'>
        {BILLING_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            active={plan.id === selectedPlanId}
            owned={hasTierAccess(session.tier, plan.id)}
            onSelect={onSelectPlan}
          />
        ))}
      </View>

      <View className='api-contract'>
        <Text className='note-title'>接口合约</Text>
        <Text className='api-row'>登录：{COMMERCIAL_API_CONTRACT.auth.signInEndpoint}</Text>
        <Text className='api-row'>支付：{COMMERCIAL_API_CONTRACT.billing.checkoutEndpoint}</Text>
        <Text className='api-row'>账户中心：{COMMERCIAL_API_CONTRACT.billing.portalEndpoint}</Text>
        <Text className='api-row'>Webhook：{COMMERCIAL_API_CONTRACT.billing.webhookEndpoint}</Text>
      </View>
    </View>
  )
}

function PlanCard({
  plan,
  active,
  owned,
  onSelect
}: {
  plan: BillingPlan
  active: boolean
  owned: boolean
  onSelect: (tier: SubscriptionTier) => void
}) {
  return (
    <View className={`plan-card ${active ? 'is-active' : ''}`}>
      <View className='plan-head'>
        <Text className='plan-name'>{plan.name}</Text>
        <Text className='plan-price'>{plan.monthlyPrice === 0 ? '免费' : `¥${plan.monthlyPrice}/月`}</Text>
      </View>
      <Text className='plan-target'>{plan.target}</Text>
      <Text className='plan-feature'>{plan.features[0]}</Text>
      <Button className={`small-action plan-action ${owned ? 'is-owned' : ''}`} onClick={() => onSelect(plan.id)}>
        {owned ? '已具备' : '模拟开通'}
      </Button>
    </View>
  )
}

function LessonCard({
  lesson,
  active,
  onSelect
}: {
  lesson: LearningLesson
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    <View className={`lesson-card ${active ? 'is-active' : ''}`} onClick={() => onSelect(lesson.id)}>
      <View className='lesson-card-head'>
        <Text className='lesson-stage'>{lesson.stage}</Text>
        <Text className='lesson-time'>{lesson.minutes} 分钟</Text>
      </View>
      <Text className='lesson-title'>{lesson.title}</Text>
      <Text className='lesson-summary'>{lesson.summary}</Text>
      <View className='lesson-tags'>
        {lesson.coreIdeas.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </View>
    </View>
  )
}

function ChallengeCard({
  challenge,
  active,
  onStart
}: {
  challenge: TrainingChallenge
  active: boolean
  onStart: (id: string) => void
}) {
  return (
    <View className={`challenge-card ${active ? 'is-active' : ''}`}>
      <View className='challenge-card-head'>
        <Text className='challenge-level'>{challenge.level}</Text>
        <Text className='lesson-time'>{challenge.estimatedMinutes} 分钟</Text>
      </View>
      <Text className='challenge-title'>{challenge.title}</Text>
      <Text className='challenge-objective'>{challenge.objective}</Text>
      <View className='challenge-focus'>
        {challenge.focus.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </View>
      <Button className='small-action challenge-action' onClick={() => onStart(challenge.id)}>
        载入训练
      </Button>
    </View>
  )
}

function LearningDashboard({
  lesson,
  challenge,
  evaluation,
  onSelectLesson,
  onStartChallenge
}: {
  lesson: LearningLesson
  challenge: TrainingChallenge
  evaluation: ChallengeEvaluation
  onSelectLesson: (id: string) => void
  onStartChallenge: (id: string) => void
}) {
  return (
    <View className='learning-dashboard'>
      <View className='training-summary'>
        <View>
          <Text className='training-kicker'>当前学习路径</Text>
          <Text className='training-title'>{lesson.title}</Text>
          <Text className='training-copy'>{lesson.summary}</Text>
        </View>
        <View className={`score-meter score-${evaluation.status}`}>
          <Text className='score-value'>{evaluation.percent}%</Text>
          <Text className='score-label'>{statusLabel(evaluation.status)}</Text>
        </View>
      </View>

      <View className='learning-grid'>
        <View className='learning-column'>
          <View className='section-head'>
            <Text className='section-title'>课程模块</Text>
            <Text className='section-meta'>{LEARNING_LESSONS.length} 个阶段</Text>
          </View>
          <View className='lesson-list'>
            {LEARNING_LESSONS.map((item) => (
              <LessonCard
                key={item.id}
                lesson={item}
                active={item.id === lesson.id}
                onSelect={onSelectLesson}
              />
            ))}
          </View>
        </View>

        <View className='learning-column'>
          <View className='section-head'>
            <Text className='section-title'>训练挑战</Text>
            <Text className='section-meta'>当前：{challenge.title}</Text>
          </View>
          <View className='challenge-list'>
            {TRAINING_CHALLENGES.map((item) => (
              <ChallengeCard
                key={item.id}
                challenge={item}
                active={item.id === challenge.id}
                onStart={onStartChallenge}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function KnowledgeValidationBoard({
  activeTrackId,
  answers,
  simulationChecks,
  onSelectTrack,
  onAnswer
}: {
  activeTrackId: KnowledgeTrackId
  answers: Record<string, string>
  simulationChecks: KnowledgeSimulationCheck[]
  onSelectTrack: (trackId: KnowledgeTrackId) => void
  onAnswer: (questionId: string, answerId: string) => void
}) {
  const track = getKnowledgeTrack(activeTrackId)
  const questions = getQuestionsForTrack(activeTrackId)
  const progress = buildKnowledgeTrackProgress(activeTrackId, answers)

  return (
    <View className='knowledge-board'>
      <View className='knowledge-head'>
        <View>
          <Text className='training-kicker'>知识验证题库</Text>
          <Text className='knowledge-title'>{track.title}</Text>
          <Text className='knowledge-copy'>{track.summary}</Text>
        </View>
        <View className={`knowledge-score score-${progress.status === '已掌握' ? 'passed' : progress.answered > 0 ? 'needs-work' : 'ready'}`}>
          <Text>{progress.percent}%</Text>
          <Text>{progress.correct}/{progress.total}</Text>
        </View>
      </View>

      <View className='knowledge-track-tabs'>
        {KNOWLEDGE_TRACKS.map((item) => (
          <Button
            key={item.id}
            className={`knowledge-track-tab ${item.id === activeTrackId ? 'is-active' : ''}`}
            onClick={() => onSelectTrack(item.id)}
          >
            {item.level}
          </Button>
        ))}
      </View>

      <View className='knowledge-grid'>
        <View className='knowledge-column'>
          <View className='section-head'>
            <Text className='section-title'>{track.target}</Text>
            <Text className='section-meta'>{progress.status}</Text>
          </View>
          <View className='knowledge-ideas'>
            {track.requiredIdeas.map((idea) => (
              <Text key={idea}>{idea}</Text>
            ))}
          </View>
          <View className='knowledge-question-list'>
            {questions.map((question) => {
              const selectedAnswerId = answers[question.id]
              const result = selectedAnswerId
                ? evaluateKnowledgeAnswer(question.id, selectedAnswerId)
                : undefined

              return (
                <View key={question.id} className='knowledge-question'>
                  <View className='question-head'>
                    <Text className='question-title'>{question.title}</Text>
                    {question.formula && <Text className='formula-chip'>{question.formula}</Text>}
                  </View>
                  <Text className='question-prompt'>{question.prompt}</Text>
                  <View className='choice-list'>
                    {question.choices.map((choice) => {
                      const selected = selectedAnswerId === choice.id
                      const correct = choice.id === question.answerId
                      const className = [
                        'choice-button',
                        selected ? 'is-selected' : '',
                        selected && correct ? 'is-correct' : '',
                        selected && !correct ? 'is-wrong' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <Button key={choice.id} className={className} onClick={() => onAnswer(question.id, choice.id)}>
                          {choice.label}
                        </Button>
                      )
                    })}
                  </View>
                  {result && (
                    <Text className={`answer-feedback ${result.correct ? 'is-correct' : 'is-wrong'}`}>
                      {result.correct ? '回答正确' : '需要复盘'}：{result.explanation}
                    </Text>
                  )}
                  <Text className='simulation-hint'>{question.simulationHint}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className='knowledge-column simulation-knowledge'>
          <View className='section-head'>
            <Text className='section-title'>当前电路可验证</Text>
            <Text className='section-meta'>{simulationChecks.filter((check) => check.passed).length}/{simulationChecks.length}</Text>
          </View>
          <View className='simulation-check-list'>
            {simulationChecks.map((check) => (
              <View key={check.id} className={`simulation-check ${check.passed ? 'is-passed' : ''}`}>
                <Text className='check-dot'>{check.passed ? '✓' : '·'}</Text>
                <View>
                  <Text className='check-title'>{check.label}</Text>
                  <Text className='check-detail'>{check.detail}</Text>
                </View>
              </View>
            ))}
          </View>
          <View className='lab-focus'>
            <Text className='note-title'>实训观察点</Text>
            {track.labFocus.map((item) => (
              <Text key={item} className='note-copy'>{item}</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function TrainingScoreCard({
  challenge,
  evaluation
}: {
  challenge: TrainingChallenge
  evaluation: ChallengeEvaluation
}) {
  return (
    <View className='training-card'>
      <View className='training-card-head'>
        <View>
          <Text className='summary-title'>训练评分</Text>
          <Text className='training-card-title'>{challenge.title}</Text>
        </View>
        <View className={`mini-score score-${evaluation.status}`}>
          <Text>{evaluation.percent}%</Text>
        </View>
      </View>
      <Text className='challenge-scenario'>{challenge.scenario}</Text>
      <View className='rule-list'>
        {evaluation.ruleResults.map((rule) => (
          <View key={rule.id} className={`rule-row ${rule.passed ? 'is-passed' : ''}`}>
            <Text className='rule-status'>{rule.passed ? '✓' : '·'}</Text>
            <View>
              <Text className='rule-label'>{rule.label}</Text>
              <Text className='rule-detail'>{rule.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      {evaluation.nextActions.length > 0 && (
        <View className='coach-note'>
          <Text className='note-title'>下一步建议</Text>
          {evaluation.nextActions.map((item) => (
            <Text key={item} className='note-copy'>{item}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function SafetyDiagnosticsCard({ diagnostics }: { diagnostics: SafetyDiagnostic[] }) {
  return (
    <View className='safety-card'>
      <Text className='summary-title'>安全诊断</Text>
      {diagnostics.map((item) => (
        <View key={item.id} className={`diagnostic diagnostic-${item.severity}`}>
          <Text className='diagnostic-title'>{item.title}</Text>
          <Text className='diagnostic-detail'>{item.detail}</Text>
          <Text className='diagnostic-action'>{item.action}</Text>
        </View>
      ))}
    </View>
  )
}

function BoardDevice({
  device,
  selected,
  effect,
  onSelect,
  onToggleSwitch
}: {
  device: CircuitDevice
  selected: boolean
  effect?: SimulationResult['effects'][string]
  onSelect: (id: string) => void
  onToggleSwitch: (id: string) => void
}) {
  const definition = getDeviceDefinition(device.kind)
  const active = Boolean(effect?.active)
  const className = [
    'device-node',
    `device-${device.kind}`,
    selected ? 'is-selected' : '',
    active ? 'is-active' : '',
    device.kind === 'switch' && device.isClosed ? 'is-closed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={className}
      style={{ left: `${device.x}px`, top: `${device.y}px` }}
      onClick={() => onSelect(device.id)}
    >
      <View className='device-symbol'>
        <ComponentIllustration kind={device.kind} />
      </View>
      <View className='device-copy'>
        <Text className='device-title'>{device.label}</Text>
        <Text className='device-meta'>
          {isConductiveControlKind(device.kind)
            ? device.isClosed
              ? '闭合'
              : '断开'
            : effect?.label ?? definition.name}
        </Text>
      </View>
      {isConductiveControlKind(device.kind) && (
        <Button
          className='inline-switch'
          onClick={(event) => {
            event.stopPropagation()
            onToggleSwitch(device.id)
          }}
        >
          {device.isClosed ? '断开' : '闭合'}
        </Button>
      )}
    </View>
  )
}

function WireLayer({
  wires,
  devices,
  simulation,
  onSelectWire
}: {
  wires: Wire[]
  devices: CircuitDevice[]
  simulation: SimulationResult
  onSelectWire: (id: string) => void
}) {
  const devicesById = new Map(devices.map((device) => [device.id, device]))

  return (
    <View className='wire-layer'>
      {wires.map((wire) => {
        const status = simulation.wires[wire.id]
        const segments = routeWire(wire, devicesById)
        return segments.map((segment, index) => (
          <View
            key={`${wire.id}-${index}`}
            className={[
              'wire-segment',
              wire.connected ? 'is-connected' : 'is-disconnected',
              status?.energized ? 'is-energized' : '',
              (status?.voltage ?? 0) <= 0.2 && wire.connected ? 'is-return' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${segment.x}px`,
              top: `${segment.y}px`,
              width: `${segment.w}px`,
              height: `${segment.h}px`
            }}
            onClick={() => onSelectWire(wire.id)}
          />
        ))
      })}
    </View>
  )
}

function MobileStatusStrip({
  progress,
  voltage,
  simulation,
  diagnostics
}: {
  progress: KnowledgeTrackProgress
  voltage: number
  simulation: SimulationResult
  diagnostics: SafetyDiagnostic[]
}) {
  const urgentCount = diagnostics.filter((item) => item.severity === 'danger' || item.severity === 'warning').length

  return (
    <View className='mobile-status-strip'>
      <View>
        <Text className='mobile-status-label'>题库掌握</Text>
        <Text className='mobile-status-value'>{progress.percent}%</Text>
      </View>
      <View>
        <Text className='mobile-status-label'>电源</Text>
        <Text className='mobile-status-value'>{voltage}V</Text>
      </View>
      <View>
        <Text className='mobile-status-label'>电流</Text>
        <Text className='mobile-status-value'>{formatNumber(simulation.totalCurrent)}A</Text>
      </View>
      <View>
        <Text className='mobile-status-label'>安全</Text>
        <Text className={`mobile-status-value ${urgentCount > 0 ? 'is-warning' : 'is-safe'}`}>
          {urgentCount > 0 ? `${urgentCount} 项` : '正常'}
        </Text>
      </View>
    </View>
  )
}

function MobileBottomNav({
  activeTab,
  onChange
}: {
  activeTab: MobileTabId
  onChange: (tabId: MobileTabId) => void
}) {
  return (
    <View className='mobile-bottom-nav'>
      {MOBILE_NAV_ITEMS.map((item) => (
        <Button
          key={item.id}
          className={`mobile-nav-button nav-${item.id} ${activeTab === item.id ? 'is-active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <View className='mobile-nav-icon'>
            <View className='icon-part part-a' />
            <View className='icon-part part-b' />
            <View className='icon-part part-c' />
          </View>
          <Text>{item.label}</Text>
        </Button>
      ))}
    </View>
  )
}

export default function Index() {
  const [model, setModel] = useState(() => createInitialCircuit(12))
  const [selectedId, setSelectedId] = useState('l1')
  const [activeLessonId, setActiveLessonId] = useState(LEARNING_LESSONS[0].id)
  const [activeChallengeId, setActiveChallengeId] = useState(TRAINING_CHALLENGES[0].id)
  const [activeDomain, setActiveDomain] = useState<WorkbenchDomain>('engineering-control')
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [authSession, setAuthSession] = useState<AuthSession>(DEFAULT_AUTH_SESSION)
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier>('pro')
  const [activeKnowledgeTrackId, setActiveKnowledgeTrackId] = useState<KnowledgeTrackId>('high-school')
  const [knowledgeAnswers, setKnowledgeAnswers] = useState<Record<string, string>>({})
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabId>('learn')
  const simulation = useMemo(() => simulateCircuit(model), [model])
  const activeLesson = getLessonById(activeLessonId)
  const activeChallenge = getChallengeById(activeChallengeId)
  const activeDomainProfile = getDomainProfile(activeDomain)
  const knowledgeProgress = useMemo(
    () => buildKnowledgeTrackProgress(activeKnowledgeTrackId, knowledgeAnswers),
    [activeKnowledgeTrackId, knowledgeAnswers]
  )
  const knowledgeSimulationChecks = useMemo(
    () => buildKnowledgeSimulationChecks(activeKnowledgeTrackId, model, simulation),
    [activeKnowledgeTrackId, model, simulation]
  )
  const catalogEntries = useMemo(
    () =>
      activeCategoryId === 'all'
        ? getCatalogEntries(activeDomain)
        : getCatalogEntriesByCategory(activeDomain, activeCategoryId),
    [activeDomain, activeCategoryId]
  )
  const challengeEvaluation = useMemo(
    () => evaluateTrainingChallenge(model, simulation, activeChallengeId),
    [model, simulation, activeChallengeId]
  )
  const safetyDiagnostics = useMemo(
    () => buildSafetyDiagnostics(model, simulation),
    [model, simulation]
  )
  const selectedDevice = model.devices.find((device) => device.id === selectedId)
  const selectedWire = model.wires.find((wire) => wire.id === selectedId)
  const loadDevices = model.devices.filter((device) => isLoadKind(device.kind))
  const boardHeight = Math.max(500, ...model.devices.map((device) => device.y + 100))

  function setVoltage(nextVoltage: number) {
    const voltage = Math.max(1, Math.min(48, nextVoltage))
    setModel((current) =>
      updateDevice(current, 'p1', {
        sourceVoltage: voltage
      })
    )
  }

  function toggleSwitch(deviceId = 's1') {
    setModel((current) => {
      const device = current.devices.find((item) => item.id === deviceId)
      return updateDevice(current, deviceId, { isClosed: !device?.isClosed })
    })
  }

  function addDevice(kind: DeviceKind) {
    setModel((current) => {
      const nextIndex = current.devices.filter((device) => device.id.startsWith('x')).length + 1
      const sameKindIndex = current.devices.filter((device) => device.kind === kind).length + 1
      const device = createDevice(kind, nextIndex, sameKindIndex)
      const wires = canAutoConnect(kind)
        ? createBranchWires(device.id, nextIndex, device.label)
        : []
      setSelectedId(device.id)
      return {
        devices: [...current.devices, device],
        wires: [...current.wires, ...wires]
      }
    })
  }

  function resetCircuit() {
    setSelectedId('l1')
    setModel(createInitialCircuit(model.devices.find((item) => item.id === 'p1')?.sourceVoltage ?? 12))
  }

  function startChallenge(challengeId: string) {
    const challenge = getChallengeById(challengeId)
    setActiveChallengeId(challenge.id)
    setActiveLessonId(challenge.lessonId)
    setSelectedId(challenge.id === 'sensor-io' ? 'x1' : 'l1')
    setModel(createTrainingCircuit(challenge.id))
  }

  function changeDomain(domain: WorkbenchDomain) {
    const profile = getDomainProfile(domain)
    setActiveDomain(domain)
    setActiveCategoryId('all')
    setVoltage(profile.recommendedVoltage)
  }

  function openPlan(tier: SubscriptionTier) {
    setSelectedPlanId(tier)
  }

  function simulateSignIn() {
    setAuthSession(createAuthenticatedSession(selectedPlanId))
  }

  function simulateSignOut() {
    setAuthSession(DEFAULT_AUTH_SESSION)
  }

  function selectPlan(tier: SubscriptionTier) {
    setSelectedPlanId(tier)
    setAuthSession(createAuthenticatedSession(tier))
  }

  function answerKnowledgeQuestion(questionId: string, answerId: string) {
    setKnowledgeAnswers((current) => ({
      ...current,
      [questionId]: answerId
    }))
    setActiveMobileTab('bank')
  }

  function changeKnowledgeTrack(trackId: KnowledgeTrackId) {
    setActiveKnowledgeTrackId(trackId)
    setActiveMobileTab('bank')
  }

  const voltage = model.devices.find((device) => device.id === 'p1')?.sourceVoltage ?? 12
  const stateLabel = simulation.shortCircuit
    ? '短路保护'
    : simulation.closedCircuit
      ? '回路接通'
      : '等待接通'

  return (
    <View className={`app-shell mobile-focus-${activeMobileTab}`}>
      <View className='topbar'>
        <View className='brand-block'>
          <Text className='brand-mark'>电</Text>
          <View>
            <Text className='brand-title'>电工大师</Text>
            <Text className='brand-subtitle'>Web / 小程序电路模拟控制台</Text>
          </View>
        </View>
        <View className='toolbar'>
          <Button className='tool-button primary' onClick={() => toggleSwitch()}>
            {model.devices.find((device) => device.id === 's1')?.isClosed ? '■ 断开' : '▶ 接通'}
          </Button>
          <Button className='tool-button' onClick={resetCircuit}>↺ 复位</Button>
          <Button className='tool-button' onClick={() => setModel((current) => setAllWires(current, true))}>
            全部连接
          </Button>
          <Button className='tool-button' onClick={() => setModel((current) => setAllWires(current, false))}>
            全部断开
          </Button>
          <Button className='tool-button' onClick={() => startChallenge(activeChallenge.id)}>载入训练</Button>
          <View className='voltage-control'>
            <Button className='step-button' onClick={() => setVoltage(voltage - 1)}>-</Button>
            <Text>{voltage}V DC</Text>
            <Button className='step-button' onClick={() => setVoltage(voltage + 1)}>+</Button>
          </View>
        </View>
      </View>

      <MobileStatusStrip
        progress={knowledgeProgress}
        voltage={voltage}
        simulation={simulation}
        diagnostics={safetyDiagnostics}
      />

      <CommercialDashboard
        activeDomain={activeDomain}
        session={authSession}
        onChangeDomain={changeDomain}
      />

      <LearningDashboard
        lesson={activeLesson}
        challenge={activeChallenge}
        evaluation={challengeEvaluation}
        onSelectLesson={setActiveLessonId}
        onStartChallenge={startChallenge}
      />

      <KnowledgeValidationBoard
        activeTrackId={activeKnowledgeTrackId}
        answers={knowledgeAnswers}
        simulationChecks={knowledgeSimulationChecks}
        onSelectTrack={changeKnowledgeTrack}
        onAnswer={answerKnowledgeQuestion}
      />

      <View className='workspace'>
        <View className='palette-panel'>
          <Text className='panel-title'>{activeDomainProfile.label}元件库</Text>
          <Text className='panel-subtitle'>{activeDomainProfile.description}</Text>
          <CategoryFilter
            activeDomain={activeDomain}
            activeCategoryId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
          <ScrollView scrollY className='palette-scroll'>
            {catalogEntries.map((entry) => (
              <CatalogEntryRow
                key={`${entry.domain}-${entry.categoryId}-${entry.kind}`}
                entry={entry}
                session={authSession}
                onAdd={addDevice}
                onLocked={openPlan}
              />
            ))}
          </ScrollView>
          <View className='interface-note'>
            <Text className='note-title'>行业分类</Text>
            <View className='category-chips'>
              {activeDomainProfile.categories.map((category) => (
                <View key={`${category.id}-chip`} className='category-chip'>
                  <Text>{category.label}</Text>
                  <Text>{getCatalogEntriesByCategory(activeDomain, category.id).length}</Text>
                </View>
              ))}
            </View>
            <Text className='note-title extension-title'>商业化扩展接口</Text>
            <Text className='note-copy'>
              元件目录、套餐门槛和行业分类已拆到商业配置层，后续可直接接入账号、支付和项目模板服务。
            </Text>
          </View>
        </View>

        <View className='canvas-panel'>
          <View className='canvas-header'>
            <View>
              <Text className='panel-title'>模拟连接画布</Text>
              <Text className='panel-subtitle'>
                点击元件或导线查看状态，导线可独立接入或断开。当前训练：{activeChallenge.title}
              </Text>
            </View>
            <View className={`run-state ${simulation.closedCircuit ? 'is-running' : ''}`}>
              <Text>{stateLabel}</Text>
            </View>
          </View>

          <View className='circuit-board' style={{ height: `${boardHeight}px` }}>
            <View className='grid-bg' />
            <WireLayer
              wires={model.wires}
              devices={model.devices}
              simulation={simulation}
              onSelectWire={setSelectedId}
            />
            {model.devices.map((device) => (
              <BoardDevice
                key={device.id}
                device={device}
                selected={selectedId === device.id}
                effect={simulation.effects[device.id]}
                onSelect={setSelectedId}
                onToggleSwitch={toggleSwitch}
              />
            ))}
            <View className='board-legend positive'>正极母线</View>
            <View className='board-legend negative'>负极回线</View>
          </View>

          <View className='connection-strip'>
            {model.wires.map((wire) => {
              const status = simulation.wires[wire.id]
              return (
                <View key={wire.id} className='wire-toggle'>
                  <View className='wire-copy' onClick={() => setSelectedId(wire.id)}>
                    <Text className='wire-name'>{wire.label}</Text>
                    <Text className='wire-value'>
                      {wire.connected
                        ? status?.energized
                          ? `${formatNumber(status.voltage ?? 0, 1)}V 有电`
                          : '已连接'
                        : '已断开'}
                    </Text>
                  </View>
                  <Button
                    className={`toggle-button ${wire.connected ? 'is-on' : ''}`}
                    onClick={() => setModel((current) => updateWire(current, wire.id, !wire.connected))}
                  >
                    {wire.connected ? '断开' : '接入'}
                  </Button>
                </View>
              )
            })}
          </View>
        </View>

        <View className='inspector-panel'>
          <Text className='panel-title'>属性与验证</Text>
          {selectedDevice && (
            <View className='inspector-card'>
              <View className='inspector-head'>
                <View className={`palette-icon palette-${selectedDevice.kind}`}>
                  <ComponentIllustration kind={selectedDevice.kind} compact />
                </View>
                <View>
                  <Text className='inspector-title'>{selectedDevice.label}</Text>
                  <Text className='inspector-type'>{getDeviceDefinition(selectedDevice.kind).name}</Text>
                </View>
              </View>
              <View className='metric-row'>
                <Text>状态</Text>
                <Text>{simulation.effects[selectedDevice.id]?.label ?? (selectedDevice.isClosed ? '闭合' : '就绪')}</Text>
              </View>
              {selectedDevice.kind === 'power-positive' && (
                <View className='control-stack'>
                  <Text className='field-label'>输出电压</Text>
                  <View className='voltage-control wide'>
                    <Button className='step-button' onClick={() => setVoltage(voltage - 1)}>-</Button>
                    <Text>{voltage}V</Text>
                    <Button className='step-button' onClick={() => setVoltage(voltage + 1)}>+</Button>
                  </View>
                </View>
              )}
              {isConductiveControlKind(selectedDevice.kind) && (
                <Button className='full-button' onClick={() => toggleSwitch(selectedDevice.id)}>
                  {selectedDevice.isClosed ? '断开开关' : '闭合开关'}
                </Button>
              )}
              {isLoadKind(selectedDevice.kind) && (
                <View className='metric-grid'>
                  <View>
                    <Text className='metric-label'>端电压</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.voltage ?? 0)}V
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>电流</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.current ?? 0)}A
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>功率</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.power ?? 0)}W
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>额定</Text>
                    <Text className='metric-value'>{selectedDevice.ratedVoltage ?? 12}V</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {selectedWire && (
            <View className='inspector-card'>
              <Text className='inspector-title'>{selectedWire.label}</Text>
              <Text className='wire-detail'>
                {selectedWire.from.deviceId}.{selectedWire.from.terminalId} → {selectedWire.to.deviceId}.{selectedWire.to.terminalId}
              </Text>
              <Button
                className='full-button'
                onClick={() => setModel((current) => updateWire(current, selectedWire.id, !selectedWire.connected))}
              >
                {selectedWire.connected ? '断开这根导线' : '接入这根导线'}
              </Button>
            </View>
          )}

          <View className='summary-card'>
            <Text className='summary-title'>仿真结果</Text>
            <View className='metric-row'>
              <Text>总电流</Text>
              <Text>{formatNumber(simulation.totalCurrent)}A</Text>
            </View>
            <View className='metric-row'>
              <Text>接入负载</Text>
              <Text>{loadDevices.length} 个</Text>
            </View>
            <View className='metric-row'>
              <Text>电源</Text>
              <Text>{simulation.supplyVoltage}V DC</Text>
            </View>
          </View>

          <View className='issue-list'>
            {simulation.issues.map((issue, index) => (
              <View key={`${issue.message}-${index}`} className={`issue issue-${issue.severity}`}>
                <Text>{issue.message}</Text>
              </View>
            ))}
          </View>

          <TrainingScoreCard challenge={activeChallenge} evaluation={challengeEvaluation} />
          <SafetyDiagnosticsCard diagnostics={safetyDiagnostics} />
          <CommercePanel
            session={authSession}
            selectedPlanId={selectedPlanId}
            onSignIn={simulateSignIn}
            onSignOut={simulateSignOut}
            onSelectPlan={selectPlan}
          />
        </View>
      </View>

      <View className='effects-bar'>
        {loadDevices.map((device) => {
          const effect = simulation.effects[device.id]
          return (
            <View key={device.id} className={`effect-pill ${effect?.active ? 'is-active' : ''}`}>
              <Text className='effect-name'>{device.label}</Text>
              <Text className='effect-value'>{effect?.label ?? '未通电'}</Text>
            </View>
          )
        })}
      </View>

      <MobileBottomNav activeTab={activeMobileTab} onChange={setActiveMobileTab} />
    </View>
  )
}
