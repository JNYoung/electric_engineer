import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
  buildCommercialAccessSnapshot,
  canUseCatalogEntry,
  createAuthenticatedSession,
  getCatalogEntries,
  getCatalogEntriesByCategory,
  getCatalogSummary,
  getDomainProfile,
  hasTierAccess
} from '@/core/commercial'
import {
  FAULT_SCENARIOS,
  buildSafetyDiagnostics,
  createFaultScenarioCircuit,
  createTrainingCircuit,
  evaluateTrainingChallenge,
  getChallengeById,
  getFaultScenarioById,
  getFaultScenarioSummary,
  getLessonById,
  LEARNING_LESSONS,
  TRAINING_CHALLENGES
} from '@/core/training'
import {
  KNOWLEDGE_TRACKS,
  buildFormulaVerificationWorksheet,
  buildKnowledgeMeasurementWorksheet,
  buildKnowledgeReviewNotebook,
  buildKnowledgeSimulationChecks,
  buildKnowledgeTrackProgress,
  evaluateKnowledgeAnswer,
  getKnowledgeTrack,
  getQuestionsForTrack
} from '@/core/knowledge'
import {
  ASSESSMENT_BLUEPRINTS,
  buildAssessmentCertificationReadiness,
  buildAssessmentPracticeReport,
  buildAssessmentSession,
  buildAssessmentSkillStation,
  evaluateAssessmentSimulationReadiness,
  getAssessmentBlueprint,
  scoreAssessmentSession
} from '@/core/assessment'
import {
  MATERIAL_LIBRARY,
  buildMaterialFinder,
  getMaterialCoverageSummary,
  getMaterialSpec,
  getMaterialSpecsByFamily,
  getMaterialTrainingKits
} from '@/core/materials'
import { buildVirtualMeterWorksheet } from '@/core/instruments'
import { createTelemetryClient } from '@/core/telemetry'
import { createGooglePlayTelemetryTransport, syncGooglePlayAdPlacement } from '@/core/googlePlayNative'
import { enterNativeLandscapeCheck, exitNativeLandscapeCheck } from '@/core/nativeDisplay'
import {
  AppModuleNav,
  MobileBottomNav,
  getAdPlacementForModule,
  type AppModuleId
} from './appShell'
import type { CircuitDevice, CircuitModel, DeviceKind, SimulationResult, Wire, WirePathMode } from '@/core/types'
import type {
  ChallengeEvaluation,
  FaultScenario,
  LearningLesson,
  SafetyDiagnostic,
  TrainingChallenge
} from '@/core/training'
import type {
  FormulaVerificationWorksheet,
  KnowledgeReviewItem,
  KnowledgeReviewNotebook,
  KnowledgeMeasurementWorksheet,
  KnowledgeSimulationCheck,
  KnowledgeTrackId
} from '@/core/knowledge'
import type {
  AssessmentBlueprintId,
  AssessmentCertificationReadiness,
  AssessmentPracticeReport,
  AssessmentScore,
  AssessmentSession,
  AssessmentSkillStation,
  AssessmentSimulationReadiness
} from '@/core/assessment'
import type { MaterialFamily, MaterialFinderResult, MaterialTrainingKitPlan } from '@/core/materials'
import type { VirtualMeterWorksheet } from '@/core/instruments'
import type { TelemetryEventName, TelemetryProperties } from '@/core/telemetry'
import type {
  AuthSession,
  BillingPlan,
  CommercialAccessSnapshot,
  ComponentCatalogEntry,
  SubscriptionTier,
  WorkbenchDomain
} from '@/core/commercial'

const visualParts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const MATERIAL_QUERY_PRESETS = ['额定电压', 'NPN', '回线', '过压', '安全链']
const NODE_WIDTH = 136
const NODE_HEIGHT = 74
const WIRE_THICKNESS = 6
const DEFAULT_BOARD_WIDTH = 720
const BOARD_DRAG_INSET = 2
const MIN_CANVAS_ZOOM = 1
const MAX_CANVAS_ZOOM = 3

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

type FullscreenTarget = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type OrientationController = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

declare const __BUILD_TARGET__: string | undefined

interface Point {
  x: number
  y: number
}

interface WireRenderSegment {
  x: number
  y: number
  w: number
  h: number
  angle?: number
}

interface DragState {
  deviceId: string
  pointerStart: Point
  deviceStart: Point
  hasMoved?: boolean
  longPressTimer?: number
}

interface PaletteDragState {
  entry: ComponentCatalogEntry
  pointerStart: Point
  currentPoint: Point
  active: boolean
  longPressTimer?: number
}

interface PaletteDragPreview {
  kind: DeviceKind
  name: string
  x: number
  y: number
  overBoard: boolean
}

interface CanvasGestureState {
  initialDistance: number
  initialZoom: number
  initialScale: number
  boardPoint: Point
  viewportOffset: Point
  didMove?: boolean
}

interface PointerLikeEvent {
  stopPropagation?: () => void
  preventDefault?: () => void
  clientX?: number
  clientY?: number
  pageX?: number
  pageY?: number
  touches?: Array<Partial<Point> & { clientX?: number; clientY?: number; pageX?: number; pageY?: number }>
  changedTouches?: Array<Partial<Point> & { clientX?: number; clientY?: number; pageX?: number; pageY?: number }>
}

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

function getRuntimeTelemetryPlatform() {
  try {
    return String(Taro.getEnv?.() ?? 'unknown').toLowerCase()
  } catch {
    return 'unknown'
  }
}

function getBuildTarget() {
  return typeof __BUILD_TARGET__ === 'undefined' ? 'h5' : __BUILD_TARGET__
}

function getFullscreenElement() {
  if (typeof document === 'undefined') return null
  const fullscreenDocument = document as FullscreenDocument
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
}

async function requestAppFullscreen() {
  if (typeof document === 'undefined') return
  const target = document.documentElement as FullscreenTarget

  if (target.requestFullscreen) {
    await target.requestFullscreen()
    return
  }

  await target.webkitRequestFullscreen?.()
}

async function exitAppFullscreen() {
  if (typeof document === 'undefined') return
  const fullscreenDocument = document as FullscreenDocument

  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }

  await fullscreenDocument.webkitExitFullscreen?.()
}

async function lockLandscapeOrientation() {
  if (typeof window === 'undefined') return
  const orientation = window.screen.orientation as OrientationController | undefined
  await orientation?.lock?.('landscape')
}

function unlockOrientation() {
  if (typeof window === 'undefined') return
  const orientation = window.screen.orientation as OrientationController | undefined
  orientation?.unlock?.()
}

function getRuntimeLocale() {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'zh-CN'
}

function terminalPoint(device: CircuitDevice, terminalId: string) {
  const centerY = device.y + NODE_HEIGHT / 2

  if (device.kind === 'power-positive') {
    return { x: device.x + NODE_WIDTH, y: centerY }
  }
  if (device.kind === 'power-negative') {
    return { x: device.x + NODE_WIDTH, y: centerY }
  }
  if (terminalId === 'out' || terminalId === 'b') {
    return { x: device.x + NODE_WIDTH, y: centerY }
  }
  return { x: device.x, y: centerY }
}

function routeWire(wire: Wire, devicesById: Map<string, CircuitDevice>): WireRenderSegment[] {
  return wire.pathMode === 'smooth'
    ? routeSmoothWire(wire, devicesById)
    : routeOrthogonalWire(wire, devicesById)
}

function routeOrthogonalWire(wire: Wire, devicesById: Map<string, CircuitDevice>): WireRenderSegment[] {
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

function routeSmoothWire(wire: Wire, devicesById: Map<string, CircuitDevice>): WireRenderSegment[] {
  const fromDevice = devicesById.get(wire.from.deviceId)
  const toDevice = devicesById.get(wire.to.deviceId)
  if (!fromDevice || !toDevice) return []

  const from = terminalPoint(fromDevice, wire.from.terminalId)
  const to = terminalPoint(toDevice, wire.to.terminalId)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const direction = dx >= 0 ? 1 : -1
  const tension = Math.max(72, Math.min(220, Math.abs(dx) * 0.55 + Math.abs(dy) * 0.18))
  const controlA = { x: from.x + direction * tension, y: from.y }
  const controlB = { x: to.x - direction * tension, y: to.y }
  const points: Point[] = []

  for (let index = 0; index <= 18; index += 1) {
    points.push(cubicBezierPoint(from, controlA, controlB, to, index / 18))
  }

  return pointsToSegments(points)
}

function cubicBezierPoint(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt ** 3 * a.x + 3 * mt ** 2 * t * b.x + 3 * mt * t ** 2 * c.x + t ** 3 * d.x,
    y: mt ** 3 * a.y + 3 * mt ** 2 * t * b.y + 3 * mt * t ** 2 * c.y + t ** 3 * d.y
  }
}

function pointsToSegments(points: Point[]) {
  const segments: WireRenderSegment[] = []
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length < 1) continue
    segments.push({
      x: start.x,
      y: start.y - WIRE_THICKNESS / 2,
      w: length,
      h: WIRE_THICKNESS,
      angle: Math.atan2(dy, dx) * (180 / Math.PI)
    })
  }
  return segments
}

function horizontalSegment(x1: number, y: number, x2: number) {
  return {
    x: Math.min(x1, x2),
    y: y - WIRE_THICKNESS / 2,
    w: Math.abs(x2 - x1),
    h: WIRE_THICKNESS
  }
}

function verticalSegment(x: number, y1: number, y2: number) {
  return {
    x: x - WIRE_THICKNESS / 2,
    y: Math.min(y1, y2),
    w: WIRE_THICKNESS,
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

function updateWirePathMode(model: CircuitModel, id: string, pathMode: WirePathMode): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((wire) =>
      wire.id === id ? { ...wire, pathMode } : wire
    )
  }
}

function moveDevice(model: CircuitModel, id: string, next: Point): CircuitModel {
  return {
    ...model,
    devices: model.devices.map((device) =>
      device.id === id ? { ...device, x: Math.round(next.x), y: Math.round(next.y) } : device
    )
  }
}

function removeDeviceFromModel(model: CircuitModel, id: string): CircuitModel {
  return {
    devices: model.devices.filter((device) => device.id !== id),
    wires: model.wires.filter((wire) => wire.from.deviceId !== id && wire.to.deviceId !== id)
  }
}

function canDeleteDevice(device: CircuitDevice) {
  return device.kind !== 'power-positive' && device.kind !== 'power-negative'
}

function getNextDeviceIndex(devices: CircuitDevice[]) {
  return devices.reduce((max, device) => {
    const match = /^x(\d+)$/.exec(device.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function eventPoint(event: PointerLikeEvent): Point | null {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0]
  const x = touch?.clientX ?? touch?.pageX ?? event.clientX ?? event.pageX
  const y = touch?.clientY ?? touch?.pageY ?? event.clientY ?? event.pageY
  if (typeof x !== 'number' || typeof y !== 'number') return null
  return { x, y }
}

function eventTouchPoints(event: PointerLikeEvent): Point[] {
  return Array.from(event.touches ?? [])
    .map((touch) => {
      const x = touch.clientX ?? touch.pageX ?? touch.x
      const y = touch.clientY ?? touch.pageY ?? touch.y
      return typeof x === 'number' && typeof y === 'number' ? { x, y } : null
    })
    .filter((point): point is Point => Boolean(point))
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pointCenter(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
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

function domainMaterialFamily(domain: WorkbenchDomain): MaterialFamily {
  return domain === 'engineering-control' ? '工程工控' : '装修工控'
}

function reviewStatusClass(status: KnowledgeReviewNotebook['status']) {
  if (status === '待复训') return 'danger'
  if (status === '复训中') return 'warning'
  return 'ready'
}

function reviewReasonLabel(reason: KnowledgeReviewItem['reason']) {
  return reason === 'wrong' ? '错题' : '未答'
}

function measurementStatusClass(status: KnowledgeMeasurementWorksheet['status']) {
  if (status === '风险') return 'danger'
  if (status === '待接线') return 'warning'
  return 'ready'
}

function formulaStatusClass(status: FormulaVerificationWorksheet['status']) {
  if (status === '风险') return 'danger'
  if (status === '待补读数') return 'warning'
  return 'ready'
}

function certificationStatusClass(status: AssessmentCertificationReadiness['status']) {
  if (status === '可提交') return 'ready'
  if (status === '待补仿真') return 'warning'
  return 'danger'
}

function meterStatusClass(status: VirtualMeterWorksheet['status']) {
  if (status === '需断电排障') return 'danger'
  if (status === '待接线') return 'warning'
  return 'ready'
}

function stationStatusClass(status: AssessmentSkillStation['status']) {
  if (status === '需排障') return 'danger'
  if (status === '待补证据') return 'warning'
  return 'ready'
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
  access,
  activeDomain,
  onChangeDomain,
  variant = 'workbench'
}: {
  access: CommercialAccessSnapshot
  activeDomain: WorkbenchDomain
  onChangeDomain: (domain: WorkbenchDomain) => void
  variant?: 'workbench' | 'library' | 'account'
}) {
  const profile = getDomainProfile(activeDomain)
  const summary = getCatalogSummary(activeDomain)
  const plan = access.recommendedPlan
  const isAccountVariant = variant === 'account'
  const kicker = variant === 'account'
    ? '行业权益概览'
    : variant === 'library'
      ? '行业元件概览'
      : '商业化行业工作台'
  const planPrefix = variant === 'account'
    ? '权益建议'
    : variant === 'library'
      ? '素材建议'
      : '推荐套餐'

  return (
    <View className={`commercial-dashboard ${isAccountVariant ? 'account-domain-overview' : ''}`}>
      <View className='commercial-copy'>
        <Text className='training-kicker'>{kicker}</Text>
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
            <Text className='metric-label'>已解锁</Text>
            <Text className='metric-value'>{access.catalog.available}/{access.catalog.total}</Text>
          </View>
          <View>
            <Text className='metric-label'>待解锁</Text>
            <Text className='metric-value'>{access.catalog.locked}</Text>
          </View>
        </View>
        <Text className='commercial-plan'>
          {planPrefix}：{plan.name} · {profile.recommendedVoltage}V · 下一步：{access.primaryAction.label}
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
  onLocked: (entry: ComponentCatalogEntry) => void
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
            onLocked(entry)
          }
        }}
      >
        {accessible ? '添加' : '套餐'}
      </Button>
    </View>
  )
}

function ComponentPaletteCard({
  entry,
  session,
  mode,
  onAdd,
  onLocked,
  onDragStart,
  onDragMove,
  onDragEnd
}: {
  entry: ComponentCatalogEntry
  session: AuthSession
  mode: 'strip' | 'list'
  onAdd: (kind: DeviceKind) => void
  onLocked: (entry: ComponentCatalogEntry) => void
  onDragStart: (event: PointerLikeEvent, entry: ComponentCatalogEntry) => void
  onDragMove: (event: PointerLikeEvent) => void
  onDragEnd: (event: PointerLikeEvent) => void
}) {
  const definition = getDeviceDefinition(entry.kind)
  const accessible = canUseCatalogEntry(session, entry)

  function handleDragStart(event: PointerLikeEvent) {
    if (accessible) {
      onDragStart(event, entry)
    }
  }

  return (
    <View
      className={[
        'simulation-component-card',
        `is-${mode}`,
        accessible ? '' : 'is-locked'
      ].filter(Boolean).join(' ')}
      onTouchStart={(event) => handleDragStart(event)}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      onTouchCancel={onDragEnd}
    >
      <View className={`palette-icon palette-${entry.kind}`}>
        <ComponentIllustration kind={entry.kind} compact />
      </View>
      <View className='simulation-component-copy'>
        <View className='catalog-title-row'>
          <Text className='palette-name'>{definition.name}</Text>
          <Text className={`tier-badge tier-${entry.tier}`}>{tierLabel(entry.tier)}</Text>
        </View>
        <Text className='palette-desc'>{entry.useCase}</Text>
        <View className='catalog-tags'>
          <Text>{entry.complexity}</Text>
          {entry.tags.slice(0, mode === 'strip' ? 2 : 3).map((tag) => (
            <Text key={tag}>{tag}</Text>
          ))}
        </View>
      </View>
      <Button
        className='small-action simulation-component-action'
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (accessible) {
            onAdd(entry.kind)
          } else {
            onLocked(entry)
          }
        }}
      >
        {accessible ? '添加' : '套餐'}
      </Button>
    </View>
  )
}

function SimulationComponentPalette({
  activeDomain,
  activeCategoryId,
  expandedCategoryIds,
  session,
  onSelectCategory,
  onToggleCategory,
  onAdd,
  onLocked,
  onDragStart,
  onDragMove,
  onDragEnd
}: {
  activeDomain: WorkbenchDomain
  activeCategoryId: string
  expandedCategoryIds: string[]
  session: AuthSession
  onSelectCategory: (categoryId: string) => void
  onToggleCategory: (categoryId: string) => void
  onAdd: (kind: DeviceKind) => void
  onLocked: (entry: ComponentCatalogEntry) => void
  onDragStart: (event: PointerLikeEvent, entry: ComponentCatalogEntry) => void
  onDragMove: (event: PointerLikeEvent) => void
  onDragEnd: (event: PointerLikeEvent) => void
}) {
  const profile = getDomainProfile(activeDomain)
  const selectedEntries = activeCategoryId === 'all'
    ? getCatalogEntries(activeDomain)
    : getCatalogEntriesByCategory(activeDomain, activeCategoryId)
  const allCount = getCatalogEntries(activeDomain).length

  return (
    <View className='simulation-palette-panel'>
      <View className='simulation-palette-head'>
        <View>
          <Text className='panel-title'>元器件</Text>
        </View>
      </View>

      <View className='simulation-palette-mobile'>
        <View className='simulation-category-options'>
          <Button
            className={`category-filter-button ${activeCategoryId === 'all' ? 'is-active' : ''}`}
            onClick={() => onSelectCategory('all')}
          >
            全部 {allCount}
          </Button>
          {profile.categories.map((category) => {
            const count = getCatalogEntriesByCategory(activeDomain, category.id).length
            return (
              <Button
                key={category.id}
                className={`category-filter-button ${activeCategoryId === category.id ? 'is-active' : ''}`}
                onClick={() => onSelectCategory(category.id)}
              >
                {category.label} {count}
              </Button>
            )
          })}
        </View>

        <ScrollView scrollX className='simulation-component-strip'>
          <View className='simulation-component-strip-inner'>
            {selectedEntries.map((entry) => (
              <ComponentPaletteCard
                key={`strip-${entry.domain}-${entry.categoryId}-${entry.kind}`}
                entry={entry}
                session={session}
                mode='strip'
                onAdd={onAdd}
                onLocked={onLocked}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View className='simulation-palette-accordion'>
        {profile.categories.map((category) => {
          const entries = getCatalogEntriesByCategory(activeDomain, category.id)
          const expanded = expandedCategoryIds.includes(category.id)
          return (
            <View key={category.id} className={`simulation-category-section ${expanded ? 'is-expanded' : ''}`}>
              <Button
                className='simulation-category-toggle'
                onClick={() => onToggleCategory(category.id)}
              >
                <Text>{category.label}</Text>
                <Text>{entries.length}</Text>
              </Button>
              {expanded && (
                <View className='simulation-category-list'>
                  {entries.map((entry) => (
                    <ComponentPaletteCard
                      key={`list-${entry.domain}-${entry.categoryId}-${entry.kind}`}
                      entry={entry}
                      session={session}
                      mode='list'
                      onAdd={onAdd}
                      onLocked={onLocked}
                      onDragStart={onDragStart}
                      onDragMove={onDragMove}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function CommercePanel({
  access,
  session,
  selectedPlanId,
  onSignIn,
  onSignOut,
  onSelectPlan
}: {
  access: CommercialAccessSnapshot
  session: AuthSession
  selectedPlanId: SubscriptionTier
  onSignIn: (tier?: SubscriptionTier) => void
  onSignOut: () => void
  onSelectPlan: (tier: SubscriptionTier) => void
}) {
  const accountTitle = session.status === 'authenticated'
    ? session.displayName
    : '登录后同步专业训练'
  const accountDescription = session.status === 'authenticated'
    ? `当前已开通${tierLabel(session.tier)}，可管理订阅、权益和接口状态。`
    : `当前以访客身份体验基础训练，登录后可开通${access.recommendedPlan.name}并解锁专业元件。`
  const connectionLabel = session.status === 'authenticated' ? '账号已连接' : '未登录'

  function runPrimaryAction() {
    if (access.primaryAction.kind === 'sign-in') {
      onSignIn(access.primaryAction.targetTier)
      return
    }

    onSelectPlan(access.primaryAction.targetTier)
  }

  return (
    <View className='commerce-panel'>
      <View className='account-hero'>
        <View className='account-avatar'>
          <Text>{session.status === 'authenticated' ? '专' : '访'}</Text>
        </View>
        <View className='account-hero-copy'>
          <Text className='account-kicker'>账户中心</Text>
          <Text className='account-title'>{accountTitle}</Text>
          <Text className='account-desc'>{accountDescription}</Text>
        </View>
        <Text className={`tier-badge tier-${session.tier}`}>{tierLabel(session.tier)}</Text>
      </View>

      <View className='account-summary-grid'>
        <View>
          <Text className='metric-label'>账号状态</Text>
          <Text className='metric-value'>{connectionLabel}</Text>
        </View>
        <View>
          <Text className='metric-label'>当前套餐</Text>
          <Text className='metric-value'>{tierLabel(session.tier)}</Text>
        </View>
        <View>
          <Text className='metric-label'>目录权限</Text>
          <Text className='metric-value'>{access.catalog.available}/{access.catalog.total}</Text>
        </View>
      </View>

      <View className='commerce-actions-row'>
        <Button className='small-action commerce-primary-action' onClick={runPrimaryAction}>
          {access.primaryAction.label}
        </Button>
        {session.status === 'authenticated' && (
          <Button className='small-action' onClick={onSignOut}>退出演示</Button>
        )}
        <Text className='commerce-status'>
          {session.status === 'authenticated' ? '可管理订阅和发票' : '登录后再创建支付会话'}
        </Text>
      </View>
      <Text className='commerce-status'>{access.primaryAction.detail}</Text>

      <Text className='account-section-title'>权益用量</Text>
      <View className='access-summary'>
        <View>
          <Text className='metric-label'>目录权限</Text>
          <Text className='metric-value'>{access.catalog.available}/{access.catalog.total}</Text>
        </View>
        <View>
          <Text className='metric-label'>被锁元件</Text>
          <Text className='metric-value'>{access.catalog.locked}</Text>
        </View>
        <View>
          <Text className='metric-label'>推荐套餐</Text>
          <Text className='metric-value'>{access.recommendedPlan.name}</Text>
        </View>
      </View>
      {access.catalog.lockedPreview.length > 0 && (
        <Text className='locked-preview'>待解锁：{access.catalog.lockedPreview.join('、')}</Text>
      )}

      <Text className='account-section-title'>功能权益</Text>
      <View className='feature-gate-list'>
        {access.features.map((feature) => (
          <View key={feature.id} className={`feature-gate-row ${feature.available ? 'is-open' : 'is-locked'}`}>
            <View>
              <Text className='feature-gate-title'>{feature.label}</Text>
              <Text className='feature-gate-detail'>{feature.description}</Text>
            </View>
            <Text className={`tier-badge tier-${feature.requiredTier}`}>
              {feature.available ? '已解锁' : `${tierLabel(feature.requiredTier)}版`}
            </Text>
          </View>
        ))}
      </View>

      <Text className='account-section-title'>套餐选择</Text>
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
    <Button className={`lesson-card ${active ? 'is-active' : ''}`} onClick={() => onSelect(lesson.id)}>
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
    </Button>
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

function FaultScenarioLibrary({
  onStartScenario
}: {
  onStartScenario: (scenarioId: string) => void
}) {
  const summary = getFaultScenarioSummary()

  return (
    <View className='fault-scenario-panel'>
      <View className='section-head'>
        <Text className='section-title'>故障场景库</Text>
        <Text className='section-meta'>{summary.total} 个可模拟场景</Text>
      </View>
      <View className='fault-summary-grid'>
        <View>
          <Text className='metric-label'>基础</Text>
          <Text className='metric-value'>{summary.highSchool}</Text>
        </View>
        <View>
          <Text className='metric-label'>大学</Text>
          <Text className='metric-value'>{summary.university}</Text>
        </View>
        <View>
          <Text className='metric-label'>电工</Text>
          <Text className='metric-value'>{summary.electrician}</Text>
        </View>
        <View>
          <Text className='metric-label'>排障</Text>
          <Text className='metric-value'>{summary.faultLike}</Text>
        </View>
      </View>
      <View className='fault-scenario-grid'>
        {FAULT_SCENARIOS.map((scenario) => (
          <FaultScenarioCard
            key={scenario.id}
            scenario={scenario}
            onStartScenario={onStartScenario}
          />
        ))}
      </View>
    </View>
  )
}

function FaultScenarioCard({
  scenario,
  onStartScenario
}: {
  scenario: FaultScenario
  onStartScenario: (scenarioId: string) => void
}) {
  const track = getKnowledgeTrack(scenario.level)

  return (
    <View className='fault-scenario-card'>
      <View className='challenge-card-head'>
        <Text className='scenario-mode'>{scenario.mode}</Text>
        <Text className='lesson-time'>{scenario.estimatedMinutes} 分钟</Text>
      </View>
      <Text className='challenge-title'>{scenario.title}</Text>
      <Text className='challenge-objective'>{scenario.summary}</Text>
      <View className='scenario-chip-row'>
        <Text>{track.level}</Text>
        {scenario.examTags.slice(0, 2).map((tag) => (
          <Text key={tag}>{tag}</Text>
        ))}
      </View>
      <Text className='scenario-symptom'>{scenario.symptoms[0]}</Text>
      <Button className='small-action scenario-action' onClick={() => onStartScenario(scenario.id)}>
        载入场景
      </Button>
    </View>
  )
}

function LearningDashboard({
  lesson,
  challenge,
  evaluation,
  onSelectLesson,
  onStartChallenge,
  onStartScenario
}: {
  lesson: LearningLesson
  challenge: TrainingChallenge
  evaluation: ChallengeEvaluation
  onSelectLesson: (id: string) => void
  onStartChallenge: (id: string) => void
  onStartScenario: (scenarioId: string) => void
}) {
  const lessonChallenges = lesson.challengeIds.map((challengeId) => getChallengeById(challengeId))
  const primaryChallenge = lessonChallenges[0] ?? challenge

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
            {lessonChallenges.map((item) => (
              <ChallengeCard
                key={item.id}
                challenge={item}
                active={item.id === challenge.id}
                onStart={onStartChallenge}
              />
            ))}
          </View>
        </View>

        <View className='lesson-detail-panel'>
          <View className='section-head'>
            <Text className='section-title'>课程内容</Text>
            <Button className='small-action' onClick={() => onStartChallenge(primaryChallenge.id)}>
              载入本课训练
            </Button>
          </View>
          <View className='lesson-detail-grid'>
            <View className='lesson-detail-card'>
              <Text className='detail-card-title'>学习目标</Text>
              {lesson.goals.map((item) => (
                <Text key={item} className='detail-card-item'>{item}</Text>
              ))}
            </View>
            <View className='lesson-detail-card'>
              <Text className='detail-card-title'>操作练习</Text>
              {lesson.drills.map((item) => (
                <Text key={item} className='detail-card-item'>{item}</Text>
              ))}
            </View>
            <View className='lesson-detail-card'>
              <Text className='detail-card-title'>安全检查</Text>
              {lesson.safetyChecks.map((item) => (
                <Text key={item} className='detail-card-item'>{item}</Text>
              ))}
            </View>
          </View>
        </View>
      </View>

      <FaultScenarioLibrary onStartScenario={onStartScenario} />
    </View>
  )
}

function KnowledgeValidationBoard({
  activeTrackId,
  answers,
  simulationChecks,
  measurement,
  formulaVerification,
  onSelectTrack,
  onAnswer
}: {
  activeTrackId: KnowledgeTrackId
  answers: Record<string, string>
  simulationChecks: KnowledgeSimulationCheck[]
  measurement: KnowledgeMeasurementWorksheet
  formulaVerification: FormulaVerificationWorksheet
  onSelectTrack: (trackId: KnowledgeTrackId) => void
  onAnswer: (questionId: string, answerId: string) => void
}) {
  const track = getKnowledgeTrack(activeTrackId)
  const questions = getQuestionsForTrack(activeTrackId)
  const progress = buildKnowledgeTrackProgress(activeTrackId, answers)
  const review = buildKnowledgeReviewNotebook(answers, {
    trackIds: [activeTrackId],
    includeUnanswered: progress.answered > 0,
    limit: 4
  })

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
          <KnowledgeMeasurementPanel measurement={measurement} />
          <FormulaVerificationPanel worksheet={formulaVerification} />
          <ReviewNotebookPanel review={review} />
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

function FormulaVerificationPanel({ worksheet }: { worksheet: FormulaVerificationWorksheet }) {
  const statusClass = formulaStatusClass(worksheet.status)

  return (
    <View className='formula-panel'>
      <View className='section-head'>
        <Text className='section-title'>公式验算</Text>
        <Text className={`measurement-status status-${statusClass}`}>{worksheet.status}</Text>
      </View>

      <View className='formula-summary-grid'>
        <View>
          <Text className='metric-label'>通过</Text>
          <Text className='metric-value'>{worksheet.passed}/{worksheet.total}</Text>
        </View>
        <View>
          <Text className='metric-label'>类型</Text>
          <Text className='metric-value'>实时</Text>
        </View>
      </View>

      <View className='formula-card-list'>
        {worksheet.cards.map((card) => (
          <View key={card.id} className={`formula-card severity-${card.severity} ${card.passed ? 'is-passed' : ''}`}>
            <View className='formula-card-head'>
              <Text className='formula-card-title'>{card.label}</Text>
              <Text className='formula-chip'>{card.formula}</Text>
            </View>
            <View className='formula-value-grid'>
              <View>
                <Text className='metric-label'>期望</Text>
                <Text className='formula-value'>{card.expected}</Text>
              </View>
              <View>
                <Text className='metric-label'>实测</Text>
                <Text className='formula-value'>{card.observed}</Text>
              </View>
            </View>
            <View className='formula-known-row'>
              {card.knownValues.slice(0, 4).map((value) => (
                <Text key={value}>{value}</Text>
              ))}
            </View>
            <Text className='formula-detail'>容差：{card.tolerance} · {card.detail}</Text>
          </View>
        ))}
      </View>

      {worksheet.nextActions.length > 0 && (
        <View className='formula-next-list'>
          {worksheet.nextActions.map((action) => (
            <Text key={action} className='measurement-detail'>{action}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function KnowledgeMeasurementPanel({ measurement }: { measurement: KnowledgeMeasurementWorksheet }) {
  const statusClass = measurementStatusClass(measurement.status)
  const track = getKnowledgeTrack(measurement.trackId)

  return (
    <View className='measurement-panel'>
      <View className='section-head'>
        <Text className='section-title'>测量证据</Text>
        <Text className={`measurement-status status-${statusClass}`}>{measurement.status}</Text>
      </View>

      <View className='measurement-metrics'>
        <View>
          <Text className='metric-label'>通过</Text>
          <Text className='metric-value'>{measurement.passed}/{measurement.total}</Text>
        </View>
        <View>
          <Text className='metric-label'>Track</Text>
          <Text className='metric-value'>{track.level}</Text>
        </View>
      </View>

      <View className='measurement-item-list'>
        {measurement.items.map((item) => (
          <View
            key={item.id}
            className={`measurement-item severity-${item.severity} ${item.passed ? 'is-passed' : ''}`}
          >
            <View className='measurement-item-head'>
              <Text className='measurement-label'>{item.label}</Text>
              <Text className='measurement-value'>{item.value}</Text>
            </View>
            <Text className='measurement-detail'>{item.detail}</Text>
          </View>
        ))}
      </View>

      {measurement.nextActions.length > 0 && (
        <View className='measurement-next-list'>
          {measurement.nextActions.map((action) => (
            <Text key={action} className='measurement-detail'>{action}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function ReviewNotebookPanel({ review }: { review: KnowledgeReviewNotebook }) {
  const statusClass = reviewStatusClass(review.status)

  return (
    <View className='review-notebook-panel'>
      <View className='section-head'>
        <Text className='section-title'>错题复训</Text>
        <Text className={`review-status status-${statusClass}`}>{review.status}</Text>
      </View>

      <View className='review-metrics'>
        <View>
          <Text className='metric-label'>错题</Text>
          <Text className='metric-value'>{review.wrong}</Text>
        </View>
        <View>
          <Text className='metric-label'>未完成</Text>
          <Text className='metric-value'>{review.unanswered}</Text>
        </View>
        <View>
          <Text className='metric-label'>复训项</Text>
          <Text className='metric-value'>{review.total}</Text>
        </View>
      </View>

      {review.items.length === 0 ? (
        <Text className='review-empty'>当前 Track 暂无错题，继续完成新题或切换更高层级。</Text>
      ) : (
        <View className='review-item-list'>
          {review.items.map((item) => (
            <View key={item.questionId} className={`review-item review-${item.severity}`}>
              <View className='review-item-head'>
                <Text className='review-item-title'>{item.title}</Text>
                <Text className='review-reason'>{reviewReasonLabel(item.reason)}</Text>
              </View>
              {item.selectedAnswerLabel ? (
                <Text className='review-detail'>
                  错选：{item.selectedAnswerLabel} · 正解：{item.correctAnswerLabel}
                </Text>
              ) : (
                <Text className='review-detail'>建议先完成本题 · 正解：{item.correctAnswerLabel}</Text>
              )}
              <Text className='review-detail'>{item.simulationHint}</Text>
            </View>
          ))}
        </View>
      )}

      <View className='review-action-list'>
        {review.nextActions.map((action) => (
          <Text key={action} className='review-detail'>{action}</Text>
        ))}
      </View>
    </View>
  )
}

function AssessmentBoard({
  activeBlueprintId,
  answers,
  readiness,
  meter,
  onSelectBlueprint,
  onAnswer
}: {
  activeBlueprintId: AssessmentBlueprintId
  answers: Record<string, string>
  readiness: AssessmentSimulationReadiness
  meter: VirtualMeterWorksheet
  onSelectBlueprint: (blueprintId: AssessmentBlueprintId) => void
  onAnswer: (questionId: string, answerId: string) => void
}) {
  const blueprint = getAssessmentBlueprint(activeBlueprintId)
  const session = buildAssessmentSession(activeBlueprintId)
  const score = scoreAssessmentSession(session, answers)
  const report = buildAssessmentPracticeReport(session, answers, readiness)
  const certification = buildAssessmentCertificationReadiness(session, answers, readiness)
  const station = buildAssessmentSkillStation(session, answers, readiness, meter)
  const scoreClass = score.passed ? 'passed' : score.answered > 0 ? 'needs-work' : 'ready'

  return (
    <View className='assessment-board'>
      <View className='assessment-head'>
        <View>
          <Text className='training-kicker'>专业考试模拟</Text>
          <Text className='assessment-title'>{blueprint.title}</Text>
          <Text className='assessment-copy'>{blueprint.description}</Text>
        </View>
        <View className={`assessment-score score-${scoreClass}`}>
          <Text>{score.percent}%</Text>
          <Text>{score.correct}/{score.total}</Text>
        </View>
      </View>

      <View className='assessment-tab-list'>
        {ASSESSMENT_BLUEPRINTS.map((item) => (
          <Button
            key={item.id}
            className={`assessment-tab ${item.id === activeBlueprintId ? 'is-active' : ''}`}
            onClick={() => onSelectBlueprint(item.id)}
          >
            {item.level}
          </Button>
        ))}
      </View>

      <View className='assessment-metrics'>
        <View>
          <Text className='metric-label'>限时</Text>
          <Text className='metric-value'>{session.timeLimitMinutes} 分钟</Text>
        </View>
        <View>
          <Text className='metric-label'>通过线</Text>
          <Text className='metric-value'>{session.passingPercent}%</Text>
        </View>
        <View>
          <Text className='metric-label'>题目</Text>
          <Text className='metric-value'>{score.answered}/{score.total}</Text>
        </View>
        <View>
          <Text className='metric-label'>得分</Text>
          <Text className='metric-value'>{score.earnedPoints}/{score.totalPoints}</Text>
        </View>
        <View>
          <Text className='metric-label'>仿真</Text>
          <Text className='metric-value'>{readiness.percent}%</Text>
        </View>
      </View>

      <View className='assessment-grid'>
        <View className='assessment-column'>
          <View className='section-head'>
            <Text className='section-title'>组卷题目</Text>
            <Text className='section-meta'>{session.title}</Text>
          </View>
          <View className='assessment-question-list'>
            {session.items.map((item) => (
              <AssessmentQuestionRow
                key={`${session.blueprintId}-${item.question.id}`}
                item={item}
                selectedAnswerId={answers[item.question.id]}
                onAnswer={onAnswer}
              />
            ))}
          </View>
        </View>

        <View className='assessment-column assessment-side'>
          <AssessmentRequirements
            blueprintId={activeBlueprintId}
            readiness={readiness}
            report={report}
            certification={certification}
            station={station}
            session={session}
            score={score}
          />
        </View>
      </View>
    </View>
  )
}

function AssessmentQuestionRow({
  item,
  selectedAnswerId,
  onAnswer
}: {
  item: AssessmentSession['items'][number]
  selectedAnswerId?: string
  onAnswer: (questionId: string, answerId: string) => void
}) {
  const result = selectedAnswerId
    ? evaluateKnowledgeAnswer(item.question.id, selectedAnswerId)
    : undefined

  return (
    <View className='assessment-question'>
      <View className='question-head'>
        <Text className='question-title'>
          {item.order}. {item.question.title}
        </Text>
        <Text className='formula-chip'>{item.points}分</Text>
      </View>
      <Text className='question-prompt'>{item.question.prompt}</Text>
      <View className='choice-list'>
        {item.question.choices.map((choice) => {
          const selected = selectedAnswerId === choice.id
          const correct = choice.id === item.question.answerId
          const className = [
            'choice-button',
            selected ? 'is-selected' : '',
            selected && correct ? 'is-correct' : '',
            selected && !correct ? 'is-wrong' : ''
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <Button
              key={choice.id}
              className={className}
              onClick={() => onAnswer(item.question.id, choice.id)}
            >
              {choice.label}
            </Button>
          )
        })}
      </View>
      {result && (
        <Text className={`answer-feedback ${result.correct ? 'is-correct' : 'is-wrong'}`}>
          {result.correct ? '计分通过' : '本题失分'}：{result.explanation}
        </Text>
      )}
    </View>
  )
}

function AssessmentRequirements({
  blueprintId,
  readiness,
  report,
  certification,
  station,
  session,
  score
}: {
  blueprintId: AssessmentBlueprintId
  readiness: AssessmentSimulationReadiness
  report: AssessmentPracticeReport
  certification: AssessmentCertificationReadiness
  station: AssessmentSkillStation
  session: AssessmentSession
  score: AssessmentScore
}) {
  const blueprint = getAssessmentBlueprint(blueprintId)

  return (
    <>
      <View className='assessment-panel'>
        <Text className='note-title'>能力要求</Text>
        <View className='competency-tags'>
          {blueprint.competencies.map((item) => (
            <Text key={item}>{item}</Text>
          ))}
        </View>
      </View>

      <View className='assessment-panel'>
        <View className='assessment-panel-head'>
          <Text className='note-title'>仿真准备度</Text>
          <Text className={`readiness-badge ${readiness.passed ? 'is-ready' : 'needs-work'}`}>
            {readiness.passedChecks}/{readiness.totalChecks}
          </Text>
        </View>
        <View className='requirement-list'>
          {readiness.checks.map((check) => (
            <View key={check.id} className={`assessment-requirement ${check.passed ? 'is-passed' : ''}`}>
              <Text className='check-dot'>{check.passed ? '✓' : '·'}</Text>
              <View>
                <Text className='check-title'>{check.label}</Text>
                <Text className='check-detail'>{check.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='assessment-panel'>
        <Text className='note-title'>考试结果</Text>
        <Text className='assessment-meta'>
          {score.passed
            ? `已达到 ${session.passingPercent}% 通过线`
            : score.answered === session.items.length
              ? `未达通过线，差 ${Math.max(0, session.passingPercent - score.percent)} 分`
              : `还剩 ${session.items.length - score.answered} 题未答`}
        </Text>
        {score.weakTracks.length > 0 && (
          <View className='weak-track-list'>
            {score.weakTracks.map((trackId) => (
              <Text key={trackId}>{getKnowledgeTrack(trackId).level}</Text>
            ))}
          </View>
        )}
        <View className='remediation-list'>
          {readiness.nextActions.slice(0, 2).map((item) => (
            <Text key={item} className='assessment-remediation'>{item}</Text>
          ))}
          {score.remediation.map((item) => (
            <Text key={item} className='assessment-remediation'>{item}</Text>
          ))}
        </View>
      </View>

      <AssessmentStationPanel station={station} />
      <CertificationReadinessPanel certification={certification} />
      <PracticeReportPanel report={report} />
    </>
  )
}

function AssessmentStationPanel({ station }: { station: AssessmentSkillStation }) {
  const statusClass = stationStatusClass(station.status)

  return (
    <View className='station-panel'>
      <View className='assessment-panel-head'>
        <View>
          <Text className='note-title'>考试工位</Text>
          <Text className='station-label'>{station.stationLabel}</Text>
        </View>
        <Text className={`station-status status-${statusClass}`}>{station.status}</Text>
      </View>
      <Text className='station-summary'>{station.evidenceSummary}</Text>
      <View className='station-metrics'>
        <View>
          <Text className='metric-label'>总进度</Text>
          <Text className='metric-value'>{station.overallPercent}%</Text>
        </View>
        <View>
          <Text className='metric-label'>闸门</Text>
          <Text className='metric-value'>{station.completedGates}/{station.totalGates}</Text>
        </View>
        <View>
          <Text className='metric-label'>结果</Text>
          <Text className='metric-value'>{station.ready ? '可提交' : '待补'}</Text>
        </View>
      </View>
      <View className='station-gate-list'>
        {station.gates.map((gate) => (
          <View key={gate.id} className={`station-gate gate-${gate.severity} ${gate.passed ? 'is-passed' : ''}`}>
            <Text className='check-dot'>{gate.passed ? '✓' : '·'}</Text>
            <View>
              <Text className='check-title'>{gate.label}</Text>
              <Text className='check-detail'>{gate.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      {station.nextActions.length > 0 && (
        <View className='station-next-list'>
          {station.nextActions.map((action) => (
            <Text key={action}>{action}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function CertificationReadinessPanel({
  certification
}: {
  certification: AssessmentCertificationReadiness
}) {
  const statusClass = certificationStatusClass(certification.status)

  return (
    <View className='certification-panel'>
      <View className='assessment-panel-head'>
        <View>
          <Text className='note-title'>认证准入</Text>
          <Text className='certification-label'>{certification.certificateLabel}</Text>
        </View>
        <Text className={`certification-status status-${statusClass}`}>{certification.status}</Text>
      </View>
      <View className='certification-metrics'>
        <View>
          <Text className='metric-label'>总进度</Text>
          <Text className='metric-value'>{certification.overallPercent}%</Text>
        </View>
        <View>
          <Text className='metric-label'>闸门</Text>
          <Text className='metric-value'>{certification.completedGates}/{certification.totalGates}</Text>
        </View>
        <View>
          <Text className='metric-label'>结果</Text>
          <Text className='metric-value'>{certification.eligible ? '可提交' : '待补'}</Text>
        </View>
      </View>
      <View className='certification-gate-list'>
        {certification.gates.map((gate) => (
          <View key={gate.id} className={`certification-gate ${gate.passed ? 'is-passed' : ''}`}>
            <Text className='check-dot'>{gate.passed ? '✓' : '·'}</Text>
            <View>
              <Text className='check-title'>{gate.label}</Text>
              <Text className='check-detail'>{gate.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className='certification-next-list'>
        {certification.nextActions.map((action) => (
          <Text key={action}>{action}</Text>
        ))}
      </View>
    </View>
  )
}

function PracticeReportPanel({ report }: { report: AssessmentPracticeReport }) {
  const statusClass = report.passed
    ? 'is-passed'
    : report.status === '待补仿真' || report.status === '未通过'
      ? 'needs-work'
      : 'is-progress'

  return (
    <View className='practice-report-panel'>
      <View className='assessment-panel-head'>
        <Text className='note-title'>练习复盘</Text>
        <Text className={`practice-status ${statusClass}`}>{report.status}</Text>
      </View>
      <View className='practice-metrics'>
        <View>
          <Text className='metric-label'>完成</Text>
          <Text className='metric-value'>{report.completionPercent}%</Text>
        </View>
        <View>
          <Text className='metric-label'>正确</Text>
          <Text className='metric-value'>{report.accuracyPercent}%</Text>
        </View>
        <View>
          <Text className='metric-label'>仿真</Text>
          <Text className='metric-value'>{report.readinessPercent}%</Text>
        </View>
      </View>
      <View className='practice-focus-list'>
        {report.focus.map((item) => (
          <View key={item.id} className={`practice-focus focus-${item.severity}`}>
            <Text className='practice-focus-title'>{item.title}</Text>
            <Text className='practice-focus-detail'>{item.detail}</Text>
          </View>
        ))}
      </View>
      <View className='practice-next-list'>
        {report.nextActions.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </View>
    </View>
  )
}

function MaterialSpecPanel({
  selectedKind,
  activeDomain,
  activeTrackId,
  materialQuery,
  onMaterialQueryChange
}: {
  selectedKind?: DeviceKind
  activeDomain: WorkbenchDomain
  activeTrackId: KnowledgeTrackId
  materialQuery: string
  onMaterialQueryChange: (query: string) => void
}) {
  const summary = getMaterialCoverageSummary()
  const activeFamily = domainMaterialFamily(activeDomain)
  const activeTrack = getKnowledgeTrack(activeTrackId)
  const selectedSpec = selectedKind ? getMaterialSpec(selectedKind) : undefined
  const familySpecs = getMaterialSpecsByFamily(activeFamily)
  const finder = buildMaterialFinder({
    family: activeFamily,
    query: materialQuery,
    limit: 4
  })
  const trackFinder = buildMaterialFinder({
    family: activeFamily,
    level: activeTrackId
  })
  const fallbackSpec = familySpecs[0] ?? MATERIAL_LIBRARY[0]
  const primarySpec = selectedSpec ?? fallbackSpec
  const referenceSpecs = familySpecs
    .filter((item) => item.kind !== primarySpec.kind)
    .slice(0, 4)
  const levelTrainingKits = getMaterialTrainingKits({
    family: activeFamily,
    level: activeTrackId,
    limit: 2
  })
  const trainingKits = levelTrainingKits.length > 0
    ? levelTrainingKits
    : getMaterialTrainingKits({
      family: activeFamily,
      limit: 2
    })

  return (
    <View className='material-spec-panel'>
      <View className='section-head'>
        <Text className='section-title'>素材规格速查</Text>
        <Text className='section-meta'>{summary.total} 项</Text>
      </View>
      <View className='material-summary-grid'>
        <View>
          <Text className='metric-label'>基础</Text>
          <Text className='metric-value'>{summary.highSchool}</Text>
        </View>
        <View>
          <Text className='metric-label'>大学</Text>
          <Text className='metric-value'>{summary.university}</Text>
        </View>
        <View>
          <Text className='metric-label'>电工</Text>
          <Text className='metric-value'>{summary.electrician}</Text>
        </View>
        <View>
          <Text className='metric-label'>{activeFamily}</Text>
          <Text className='metric-value'>{familySpecs.length}</Text>
        </View>
      </View>

      <View className='material-spec-card'>
        <View className='material-card-head'>
          <Text className='material-name'>{primarySpec.displayName}</Text>
          <Text className='material-family'>{primarySpec.family}</Text>
        </View>
        <View className='spec-pair'>
          <Text>额定/供电</Text>
          <Text>{primarySpec.nominalVoltage}</Text>
        </View>
        <View className='spec-pair'>
          <Text>电流范围</Text>
          <Text>{primarySpec.currentRange}</Text>
        </View>
        <Text className='material-detail'>{primarySpec.simulationUse}</Text>
        {primarySpec.careerUse && (
          <View className='material-explain-card'>
            <Text className='material-explain-title'>岗位用途</Text>
            <Text className='material-explain-copy'>{primarySpec.careerUse}</Text>
          </View>
        )}
        <MaterialChipRow title='关键参数' items={primarySpec.keyParameters} />
        {primarySpec.connectionGuide && primarySpec.connectionGuide.length > 0 && (
          <MaterialChipRow title='接线要点' items={primarySpec.connectionGuide} />
        )}
        {primarySpec.certificationFocus && primarySpec.certificationFocus.length > 0 && (
          <MaterialChipRow title='取证考点' items={primarySpec.certificationFocus} />
        )}
        <MaterialChipRow title='考试标签' items={primarySpec.examTags} />
        <View className='spec-list'>
          {primarySpec.safetyNotes.slice(0, 2).map((item) => (
            <Text key={item}>{item}</Text>
          ))}
        </View>
      </View>

      <MaterialFinderPanel
        finder={finder}
        activeQuery={materialQuery}
        activeTrackLabel={activeTrack.level}
        trackMatches={trackFinder.filtered}
        onQueryChange={onMaterialQueryChange}
      />

      <MaterialTrainingKitsPanel
        kits={trainingKits}
      />

      <View className='material-mini-list'>
        {referenceSpecs.map((item) => (
          <View key={item.kind} className='material-mini-row'>
            <Text>{item.displayName}</Text>
            <Text>{item.examTags.slice(0, 2).join(' / ')}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function MaterialTrainingKitsPanel({
  kits
}: {
  kits: MaterialTrainingKitPlan[]
}) {
  return (
    <View className='material-kit-panel'>
      <View className='section-head'>
        <Text className='note-title'>素材实训包</Text>
        <Text className='material-finder-count'>{kits.length} 套</Text>
      </View>
      <Text className='material-detail'>当前行业可衔接器件、故障和安全检查。</Text>
      <View className='material-kit-list'>
        {kits.map((kit) => (
          <View key={kit.id} className={`material-kit-card ${kit.readiness === '素材齐备' ? 'is-ready' : 'needs-material'}`}>
            <View className='material-card-head'>
              <Text className='material-finder-name'>{kit.title}</Text>
              <Text className='material-family'>{kit.readiness}</Text>
            </View>
            <Text className='material-detail'>{kit.objective}</Text>
            <Text className='material-kit-scenario'>{kit.scenario}</Text>
            <View className='material-kit-metrics'>
              <View>
                <Text className='metric-label'>组件</Text>
                <Text className='metric-value'>{kit.componentCount}</Text>
              </View>
              <View>
                <Text className='metric-label'>分钟</Text>
                <Text className='metric-value'>{kit.estimatedMinutes}</Text>
              </View>
            </View>
            <MaterialChipRow title='组件' items={kit.components.map((item) => item.displayName).slice(0, 6)} />
            <MaterialChipRow title='考点' items={kit.examTags.slice(0, 5)} />
            {kit.safetyChecklist.length > 0 && (
              <Text className='material-kit-foot'>安全：{kit.safetyChecklist.slice(0, 2).join(' / ')}</Text>
            )}
            {kit.faultSamples.length > 0 && (
              <Text className='material-kit-foot'>故障：{kit.faultSamples.slice(0, 2).join(' / ')}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

function MaterialFinderPanel({
  finder,
  activeQuery,
  activeTrackLabel,
  trackMatches,
  onQueryChange
}: {
  finder: MaterialFinderResult
  activeQuery: string
  activeTrackLabel: string
  trackMatches: number
  onQueryChange: (query: string) => void
}) {
  return (
    <View className='material-finder-panel'>
      <View className='section-head'>
        <Text className='note-title'>素材训练检索</Text>
        <Text className='material-finder-count'>{finder.filtered}/{finder.total}</Text>
      </View>
      <Text className='material-detail'>
        {activeTrackLabel}适配 {trackMatches} 项，可按参数、故障和考试标签快速定位。
      </Text>
      <View className='material-query-row'>
        <Button
          className={`material-query-button ${activeQuery.length === 0 ? 'is-active' : ''}`}
          onClick={() => onQueryChange('')}
        >
          全部
        </Button>
        {MATERIAL_QUERY_PRESETS.map((query) => (
          <Button
            key={query}
            className={`material-query-button ${activeQuery === query ? 'is-active' : ''}`}
            onClick={() => onQueryChange(query)}
          >
            {query}
          </Button>
        ))}
      </View>

      {finder.matches.length === 0 ? (
        <Text className='material-empty'>当前筛选暂无匹配素材，切换关键词或行业域继续检索。</Text>
      ) : (
        <View className='material-finder-list'>
          {finder.matches.map((item) => (
            <View key={`${finder.query}-${item.kind}`} className='material-finder-card'>
              <View className='material-card-head'>
                <Text className='material-finder-name'>{item.displayName}</Text>
                <Text className='material-family'>{item.family}</Text>
              </View>
              <Text className='material-detail'>{item.careerUse ?? item.simulationUse}</Text>
              <Text className='material-finder-meta'>{item.examTags.slice(0, 3).join(' / ')}</Text>
            </View>
          ))}
        </View>
      )}

      {finder.highlightedTags.length > 0 && (
        <MaterialChipRow title='命中标签' items={finder.highlightedTags.slice(0, 6)} />
      )}
      {finder.safetyChecklist.length > 0 && (
        <MaterialChipRow title='安全检查' items={finder.safetyChecklist.slice(0, 4)} />
      )}
      {finder.faultSamples.length > 0 && (
        <MaterialChipRow title='故障样本' items={finder.faultSamples.slice(0, 4)} />
      )}
    </View>
  )
}

function MaterialChipRow({ title, items }: { title: string; items: string[] }) {
  return (
    <View className='material-chip-block'>
      <Text className='material-chip-title'>{title}</Text>
      <View className='material-chip-row'>
        {items.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
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

function VirtualMeterPanel({ worksheet }: { worksheet: VirtualMeterWorksheet }) {
  const statusClass = meterStatusClass(worksheet.status)

  return (
    <View className='meter-panel'>
      <View className='section-head'>
        <Text className='summary-title'>虚拟万用表</Text>
        <Text className={`meter-panel-status status-${statusClass}`}>{worksheet.status}</Text>
      </View>
      <Text className='meter-summary'>{worksheet.summary}</Text>

      <View className='meter-metrics'>
        <View>
          <Text className='metric-label'>测点</Text>
          <Text className='metric-value'>{worksheet.passed}/{worksheet.total}</Text>
        </View>
        <View>
          <Text className='metric-label'>带电测量</Text>
          <Text className='metric-value'>{worksheet.safeToMeasure ? '允许' : '禁止'}</Text>
        </View>
      </View>

      <View className='meter-reading-list'>
        {worksheet.readings.map((reading) => (
          <View key={reading.id} className={`meter-reading severity-${reading.severity} ${reading.passed ? 'is-passed' : ''}`}>
            <View className='meter-reading-head'>
              <Text className='meter-mode'>{reading.mode}</Text>
              <Text className='meter-reading-title'>{reading.label}</Text>
              <Text className='meter-reading-status'>{reading.status}</Text>
            </View>
            <View className='meter-value-row'>
              <Text className='meter-value'>{reading.value}{reading.unit}</Text>
              <Text className='meter-expected'>{reading.expected}</Text>
            </View>
            <Text className='meter-probe'>{reading.probe}</Text>
            <Text className='meter-detail'>{reading.detail}</Text>
          </View>
        ))}
      </View>

      {worksheet.nextActions.length > 0 && (
        <View className='meter-action-list'>
          {worksheet.nextActions.map((action) => (
            <Text key={action} className='meter-detail'>{action}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function BoardDevice({
  device,
  selected,
  dragging,
  showDeleteAction,
  effect,
  voltage,
  onSelect,
  onDragStart,
  onDelete,
  onSetVoltage,
  onToggleSwitch
}: {
  device: CircuitDevice
  selected: boolean
  dragging: boolean
  showDeleteAction: boolean
  effect?: SimulationResult['effects'][string]
  voltage: number
  onSelect: (id: string) => void
  onDragStart: (event: PointerLikeEvent, id: string) => void
  onDelete: (id: string) => void
  onSetVoltage: (nextVoltage: number, source?: string) => void
  onToggleSwitch: (id: string) => void
}) {
  const definition = getDeviceDefinition(device.kind)
  const active = Boolean(effect?.active)
  const isPowerSource = device.kind === 'power-positive'
  const deletable = canDeleteDevice(device)
  const className = [
    'device-node',
    `device-${device.kind}`,
    selected ? 'is-selected' : '',
    dragging ? 'is-dragging' : '',
    showDeleteAction && deletable ? 'has-delete-action' : '',
    active ? 'is-active' : '',
    isConductiveControlKind(device.kind) && device.isClosed ? 'is-closed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={className}
      data-device-id={device.id}
      style={{ left: `${device.x}px`, top: `${device.y}px` }}
      onClick={() => onSelect(device.id)}
      onTouchStart={(event) => onDragStart(event, device.id)}
    >
      <View className='device-symbol'>
        <ComponentIllustration kind={device.kind} />
      </View>
      <View className='device-copy'>
        <Text className='device-title'>{device.label}</Text>
        <Text className='device-meta'>
          {isConductiveControlKind(device.kind)
            ? device.isClosed
              ? '已接通'
              : '断开'
            : isPowerSource
              ? `${voltage}V DC`
              : effect?.label ?? definition.name}
        </Text>
      </View>
      {isPowerSource && (
        <View
          className='node-voltage-control'
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Button className='node-step-button' onClick={() => onSetVoltage(voltage - 1, 'source_node')}>-</Button>
          <Text className='node-voltage-value'>{voltage}V</Text>
          <Button className='node-step-button' onClick={() => onSetVoltage(voltage + 1, 'source_node')}>+</Button>
        </View>
      )}
      {isConductiveControlKind(device.kind) && (
        <Button
          className='inline-switch'
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleSwitch(device.id)
          }}
        >
          {device.isClosed ? '断开' : '接通'}
        </Button>
      )}
      {showDeleteAction && deletable && (
        <Button
          className='node-delete-button'
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onDelete(device.id)
          }}
        >
          删除
        </Button>
      )}
    </View>
  )
}

function CanvasStatusBar({
  simulation,
  stateLabel
}: {
  simulation: SimulationResult
  stateLabel: string
}) {
  const stateClassName = simulation.shortCircuit
    ? 'is-danger'
    : simulation.closedCircuit
      ? 'is-safe'
      : 'is-idle'

  return (
    <View className='canvas-status-bar'>
      <View className='canvas-status-cell'>
        <Text className='canvas-status-label'>电流</Text>
        <Text className='canvas-status-value'>{formatNumber(simulation.totalCurrent)}A</Text>
      </View>
      <View className='canvas-status-cell'>
        <Text className='canvas-status-label'>状态</Text>
        <Text className={`canvas-status-value ${stateClassName}`}>{stateLabel}</Text>
      </View>
    </View>
  )
}

function WireLayer({
  wires,
  devices,
  simulation,
  selectedWireId,
  onSelectWire
}: {
  wires: Wire[]
  devices: CircuitDevice[]
  simulation: SimulationResult
  selectedWireId?: string
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
              wire.pathMode === 'smooth' ? 'is-smooth' : 'is-orthogonal',
              wire.connected ? 'is-connected' : 'is-disconnected',
              status?.energized ? 'is-energized' : '',
              (status?.voltage ?? 0) <= 0.2 && wire.connected ? 'is-return' : '',
              selectedWireId === wire.id ? 'is-selected' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${segment.x}px`,
              top: `${segment.y}px`,
              width: `${segment.w}px`,
              height: `${segment.h}px`,
              transform: segment.angle === undefined ? undefined : `rotate(${segment.angle}deg)`
            }}
            onClick={() => onSelectWire(wire.id)}
          />
        ))
      })}
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
  const [activeSimulationCategoryId, setActiveSimulationCategoryId] = useState('all')
  const [expandedSimulationCategoryIds, setExpandedSimulationCategoryIds] = useState<string[]>(() =>
    DOMAIN_PROFILES
      .map((profile) => profile.categories[0]?.id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
  )
  const [authSession, setAuthSession] = useState<AuthSession>(DEFAULT_AUTH_SESSION)
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier>('pro')
  const [activeKnowledgeTrackId, setActiveKnowledgeTrackId] = useState<KnowledgeTrackId>('high-school')
  const [knowledgeAnswers, setKnowledgeAnswers] = useState<Record<string, string>>({})
  const [activeAssessmentId, setActiveAssessmentId] = useState<AssessmentBlueprintId>('high-school-foundation-check')
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({})
  const [materialQuery, setMaterialQuery] = useState('')
  const [activeModule, setActiveModule] = useState<AppModuleId>('simulate')
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null)
  const [boardSize, setBoardSize] = useState({ width: DEFAULT_BOARD_WIDTH, height: 500 })
  const [boardFrameWidth, setBoardFrameWidth] = useState(DEFAULT_BOARD_WIDTH)
  const [boardFrameHeight, setBoardFrameHeight] = useState(500)
  const [isCanvasFocusMode, setIsCanvasFocusMode] = useState(false)
  const [deviceActionId, setDeviceActionId] = useState<string | null>(null)
  const [paletteDragPreview, setPaletteDragPreview] = useState<PaletteDragPreview | null>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const dragRef = useRef<DragState | null>(null)
  const paletteDragRef = useRef<PaletteDragState | null>(null)
  const canvasGestureRef = useRef<CanvasGestureState | null>(null)
  const modelRef = useRef(model)
  const boardSizeRef = useRef(boardSize)
  const boardHeightRef = useRef(500)
  const boardScaleRef = useRef(1)
  const canvasZoomRef = useRef(1)
  const telemetry = useMemo(
    () =>
      createTelemetryClient({
        context: {
          platform: getRuntimeTelemetryPlatform(),
          locale: getRuntimeLocale()
        },
        transport: createGooglePlayTelemetryTransport()
      }),
    []
  )
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
  const knowledgeMeasurement = useMemo(
    () => buildKnowledgeMeasurementWorksheet(activeKnowledgeTrackId, model, simulation),
    [activeKnowledgeTrackId, model, simulation]
  )
  const formulaVerification = useMemo(
    () => buildFormulaVerificationWorksheet(activeKnowledgeTrackId, model, simulation),
    [activeKnowledgeTrackId, model, simulation]
  )
  const assessmentReadiness = useMemo(
    () => evaluateAssessmentSimulationReadiness(activeAssessmentId, model, simulation),
    [activeAssessmentId, model, simulation]
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
  const virtualMeter = useMemo(
    () => buildVirtualMeterWorksheet(model, simulation),
    [model, simulation]
  )
  const selectedDevice = model.devices.find((device) => device.id === selectedId)
  const selectedWire = model.wires.find((wire) => wire.id === selectedId)
  const loadDevices = model.devices.filter((device) => isLoadKind(device.kind))
  const boardHeight = Math.max(500, ...model.devices.map((device) => device.y + 100))
  const shouldFillBoardWidth = isCanvasFocusMode && boardFrameWidth > boardFrameHeight
  const boardWidthScale = boardFrameWidth / DEFAULT_BOARD_WIDTH
  const boardHeightScale = isCanvasFocusMode && !shouldFillBoardWidth ? boardFrameHeight / boardHeight : 1
  const baseBoardScale = Math.max(
    0.1,
    shouldFillBoardWidth ? boardWidthScale : Math.min(1, boardWidthScale, boardHeightScale)
  )
  const boardScale = baseBoardScale * canvasZoom
  const boardLogicalWidth = boardScale < 1 || shouldFillBoardWidth
    ? DEFAULT_BOARD_WIDTH
    : Math.max(DEFAULT_BOARD_WIDTH, Math.floor(boardFrameWidth))
  const boardVisualWidth = Math.ceil(boardLogicalWidth * boardScale)
  const boardVisualHeight = Math.ceil(boardHeight * boardScale)
  const boardViewportHeight = isCanvasFocusMode
    ? Math.max(1, boardFrameHeight)
    : boardVisualHeight

  useEffect(() => {
    modelRef.current = model
  }, [model])

  useEffect(() => {
    boardSizeRef.current = boardSize
  }, [boardSize])

  useEffect(() => {
    boardHeightRef.current = boardHeight
  }, [boardHeight])

  useEffect(() => {
    boardScaleRef.current = boardScale
  }, [boardScale])

  useEffect(() => {
    canvasZoomRef.current = canvasZoom
  }, [canvasZoom])

  useEffect(() => {
    setBoardSize({
      width: boardLogicalWidth,
      height: boardHeight
    })
  }, [boardHeight, boardLogicalWidth])

  useEffect(() => {
    trackTelemetryEvent('app_open', {
      active_tab: activeModule,
      active_domain: activeDomain,
      device_count: model.devices.length,
      wire_count: model.wires.length
    })
  }, [])

  const canShowAccountAd = authSession.tier === 'free'

  useEffect(() => {
    syncGooglePlayAdPlacement(getAdPlacementForModule(activeModule, canShowAccountAd))
  }, [activeModule, canShowAccountAd])

  useEffect(() => {
    if (activeModule !== 'simulate') return undefined

    let frameHandle = 0

    function measureBoardFrame() {
      Taro.nextTick(() => {
        const boardFrame =
          typeof document === 'undefined'
            ? null
            : document.querySelector<HTMLElement>('.canvas-board-viewport')

        if (boardFrame?.clientWidth) {
          setBoardFrameWidth(Math.max(1, boardFrame.clientWidth))
          setBoardFrameHeight(Math.max(1, boardFrame.clientHeight))
          return
        }

        Taro.createSelectorQuery()
          .select('.canvas-board-viewport')
          .boundingClientRect((rect) => {
            const frameRect = Array.isArray(rect) ? rect[0] : rect
            if (!frameRect || typeof frameRect.width !== 'number' || frameRect.width <= 0) return
            setBoardFrameWidth(Math.max(1, frameRect.width))
            if (typeof frameRect.height === 'number' && frameRect.height > 0) {
              setBoardFrameHeight(Math.max(1, frameRect.height))
            }
          })
          .exec()
      })
    }

    function queueMeasure() {
      if (typeof window === 'undefined') {
        measureBoardFrame()
        return
      }

      window.cancelAnimationFrame(frameHandle)
      frameHandle = window.requestAnimationFrame(measureBoardFrame)
    }

    queueMeasure()

    if (typeof window === 'undefined') return undefined

    window.addEventListener('resize', queueMeasure)
    window.addEventListener('orientationchange', queueMeasure)

    return () => {
      window.cancelAnimationFrame(frameHandle)
      window.removeEventListener('resize', queueMeasure)
      window.removeEventListener('orientationchange', queueMeasure)
    }
  }, [activeModule, boardHeight, isCanvasFocusMode, model.devices.length])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined

    const board = document.querySelector<HTMLElement>('.circuit-board')
    if (!board) return undefined
    const boardElement = board

    function handleMouseDown(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.inline-switch')) return

      const node = target.closest<HTMLElement>('.device-node')
      if (!node || !boardElement.contains(node)) return

      const deviceId = node.dataset.deviceId
      if (deviceId) {
        startDeviceDrag(event, deviceId)
      }
    }

    function handleMouseMove(event: MouseEvent) {
      dragDevice(event)
    }

    boardElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDeviceDrag)

    return () => {
      boardElement.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDeviceDrag)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    function syncFullscreenState() {
      if (!getFullscreenElement()) {
        void exitNativeLandscapeCheck()
        unlockOrientation()
        setIsCanvasFocusMode(false)
      }
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
    }
  }, [])

  useEffect(() => () => {
    clearDeviceLongPressTimer()
    clearPaletteDragTimer()
    canvasGestureRef.current = null
  }, [])

  function trackTelemetryEvent(name: TelemetryEventName, properties?: TelemetryProperties) {
    telemetry.track(name, properties)
  }

  function clearDeviceLongPressTimer(state = dragRef.current) {
    if (state?.longPressTimer && typeof window !== 'undefined') {
      window.clearTimeout(state.longPressTimer)
      state.longPressTimer = undefined
    }
  }

  function clearPaletteDragTimer(state = paletteDragRef.current) {
    if (state?.longPressTimer && typeof window !== 'undefined') {
      window.clearTimeout(state.longPressTimer)
      state.longPressTimer = undefined
    }
  }

  function cancelPaletteDrag() {
    clearPaletteDragTimer()
    paletteDragRef.current = null
    setPaletteDragPreview(null)
  }

  function getCanvasViewportElement() {
    return typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLElement>('.canvas-board-viewport')
  }

  function startCanvasGesture(event: PointerLikeEvent) {
    const points = eventTouchPoints(event)
    if (points.length < 2) return

    const viewport = getCanvasViewportElement()
    if (!viewport) return

    event.preventDefault?.()
    event.stopPropagation?.()
    clearDeviceLongPressTimer()
    dragRef.current = null
    setDraggingDeviceId(null)
    setDeviceActionId(null)

    const [first, second] = points
    const distance = Math.max(1, pointDistance(first, second))
    const center = pointCenter(first, second)
    const viewportRect = viewport.getBoundingClientRect()
    const viewportOffset = {
      x: center.x - viewportRect.left,
      y: center.y - viewportRect.top
    }
    const initialScale = Math.max(0.1, boardScaleRef.current)

    canvasGestureRef.current = {
      initialDistance: distance,
      initialZoom: canvasZoomRef.current,
      initialScale,
      boardPoint: {
        x: (viewport.scrollLeft + viewportOffset.x) / initialScale,
        y: (viewport.scrollTop + viewportOffset.y) / initialScale
      },
      viewportOffset
    }
  }

  function moveCanvasGesture(event: PointerLikeEvent) {
    const gesture = canvasGestureRef.current
    if (!gesture) return

    const points = eventTouchPoints(event)
    if (points.length < 2) return

    event.preventDefault?.()
    event.stopPropagation?.()

    const [first, second] = points
    const distance = Math.max(1, pointDistance(first, second))
    const nextZoom = clamp(
      gesture.initialZoom * (distance / gesture.initialDistance),
      MIN_CANVAS_ZOOM,
      MAX_CANVAS_ZOOM
    )
    const scaleRatio = nextZoom / gesture.initialZoom
    const nextScale = gesture.initialScale * scaleRatio
    const nextScrollLeft = Math.max(0, gesture.boardPoint.x * nextScale - gesture.viewportOffset.x)
    const nextScrollTop = Math.max(0, gesture.boardPoint.y * nextScale - gesture.viewportOffset.y)

    gesture.didMove = true
    setCanvasZoom(nextZoom)

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const viewport = getCanvasViewportElement()
        if (!viewport) return
        viewport.scrollLeft = nextScrollLeft
        viewport.scrollTop = nextScrollTop
      })
    }
  }

  function stopCanvasGesture() {
    if (!canvasGestureRef.current) return
    canvasGestureRef.current = null
  }

  function getBoardDropPosition(point: Point) {
    if (typeof document === 'undefined') return null
    const board = document.querySelector<HTMLElement>('.circuit-board')
    if (!board) return null

    const rect = board.getBoundingClientRect()
    if (
      point.x < rect.left ||
      point.x > rect.right ||
      point.y < rect.top ||
      point.y > rect.bottom
    ) {
      return null
    }

    const currentScale = Math.max(0.1, boardScaleRef.current)
    const currentBoardSize = boardSizeRef.current
    const currentBoardHeight = boardHeightRef.current
    const boardX = (point.x - rect.left) / currentScale
    const boardY = (point.y - rect.top) / currentScale
    const maxX = Math.max(0, currentBoardSize.width - NODE_WIDTH - BOARD_DRAG_INSET * 2)
    const maxY = Math.max(0, Math.max(currentBoardSize.height, currentBoardHeight) - NODE_HEIGHT - BOARD_DRAG_INSET * 2)

    return {
      x: clamp(boardX - NODE_WIDTH / 2, 0, maxX),
      y: clamp(boardY - NODE_HEIGHT / 2, 0, maxY)
    }
  }

  async function enterCanvasFocusMode() {
    setIsCanvasFocusMode(true)
    trackTelemetryEvent('app_module_changed', {
      module_id: 'simulate',
      source: 'canvas_landscape_check'
    })

    try {
      await enterNativeLandscapeCheck()
    } catch {
      // Native orientation is best-effort; web fullscreen remains as fallback.
    }

    try {
      await requestAppFullscreen()
    } catch {
      // Fullscreen can be denied by the WebView; keep the in-app focus layout as fallback.
    }

    try {
      await lockLandscapeOrientation()
    } catch {
      // Orientation lock is best-effort and only works in some fullscreen contexts.
    }
  }

  async function exitCanvasFocusMode() {
    setIsCanvasFocusMode(false)
    unlockOrientation()

    try {
      await exitNativeLandscapeCheck()
    } catch {
      // Web fallback below still restores the visible app shell.
    }

    try {
      if (getFullscreenElement()) {
        await exitAppFullscreen()
      }
    } catch {
      // Leaving the CSS focus layout is enough if native fullscreen exit fails.
    }
  }

  function toggleCanvasFocusMode() {
    if (isCanvasFocusMode) {
      void exitCanvasFocusMode()
      return
    }

    void enterCanvasFocusMode()
  }

  function changeAppModule(moduleId: AppModuleId, source = 'bottom_nav') {
    if (isCanvasFocusMode && moduleId !== 'simulate') {
      void exitCanvasFocusMode()
    }
    if (moduleId !== 'simulate') {
      cancelPaletteDrag()
      setDeviceActionId(null)
    }
    setActiveModule(moduleId)
    trackTelemetryEvent('app_module_changed', {
      module_id: moduleId,
      source
    })
  }

  function setVoltage(nextVoltage: number, source = 'voltage_control') {
    const voltage = Math.max(1, Math.min(48, nextVoltage))
    trackTelemetryEvent('circuit_voltage_changed', {
      voltage,
      source
    })
    setModel((current) =>
      updateDevice(current, 'p1', {
        sourceVoltage: voltage
      })
    )
  }

  function toggleSwitch(deviceId = 's1') {
    const device = modelRef.current.devices.find((item) => item.id === deviceId)
    trackTelemetryEvent('circuit_switch_toggled', {
      device_id: deviceId,
      kind: device?.kind ?? 'unknown',
      closed: !device?.isClosed
    })
    setModel((current) => {
      const device = current.devices.find((item) => item.id === deviceId)
      return updateDevice(current, deviceId, { isClosed: !device?.isClosed })
    })
  }

  function addDevice(kind: DeviceKind, source = 'component_added', position?: Point) {
    const currentModel = modelRef.current
    const nextIndex = getNextDeviceIndex(currentModel.devices)
    const sameKindIndex = currentModel.devices.filter((device) => device.kind === kind).length + 1
    const baseDevice = createDevice(kind, nextIndex, sameKindIndex)
    const device = position
      ? { ...baseDevice, x: Math.round(position.x), y: Math.round(position.y) }
      : baseDevice
    const wires = canAutoConnect(kind)
      ? createBranchWires(device.id, nextIndex, device.label)
      : []
    const nextModel = {
      devices: [...currentModel.devices, device],
      wires: [...currentModel.wires, ...wires]
    }

    trackTelemetryEvent('component_added', {
      kind,
      device_id: device.id,
      domain: activeDomain,
      auto_connected: wires.length > 0,
      source
    })
    modelRef.current = nextModel
    setModel(nextModel)
    setSelectedId(device.id)
    setDeviceActionId(null)
    changeAppModule('simulate', source)
  }

  function removeDevice(deviceId: string) {
    const currentModel = modelRef.current
    const device = currentModel.devices.find((item) => item.id === deviceId)
    if (!device || !canDeleteDevice(device)) return

    const nextModel = removeDeviceFromModel(currentModel, deviceId)
    const nextSelectedId =
      nextModel.devices.find((item) => item.id !== deviceId)?.id ??
      nextModel.wires[0]?.id ??
      ''

    trackTelemetryEvent('component_removed', {
      kind: device.kind,
      device_id: device.id,
      source: 'node_long_press'
    })
    clearDeviceLongPressTimer()
    dragRef.current = null
    modelRef.current = nextModel
    setDraggingDeviceId(null)
    setDeviceActionId(null)
    setModel(nextModel)
    setSelectedId(nextSelectedId)
  }

  function startDeviceDrag(event: PointerLikeEvent, deviceId: string) {
    const point = eventPoint(event)
    const device = modelRef.current.devices.find((item) => item.id === deviceId)
    if (!point || !device) return

    event.stopPropagation?.()
    event.preventDefault?.()
    setSelectedId(deviceId)
    if (deviceActionId !== deviceId) {
      setDeviceActionId(null)
    }
    const longPressTimer = typeof window === 'undefined' || !canDeleteDevice(device)
      ? undefined
      : window.setTimeout(() => {
          const activeDrag = dragRef.current
          if (activeDrag?.deviceId === deviceId && !activeDrag.hasMoved) {
            setDeviceActionId(deviceId)
          }
        }, 520)
    dragRef.current = {
      deviceId,
      pointerStart: point,
      deviceStart: { x: device.x, y: device.y },
      longPressTimer
    }
    setDraggingDeviceId(deviceId)
  }

  function dragDevice(event: PointerLikeEvent) {
    const activeDrag = dragRef.current
    if (!activeDrag) return

    const point = eventPoint(event)
    if (!point) return

    event.preventDefault?.()
    const currentBoardSize = boardSizeRef.current
    const currentBoardHeight = boardHeightRef.current
    const currentBoardScale = Math.max(0.1, boardScaleRef.current)
    const deltaX = (point.x - activeDrag.pointerStart.x) / currentBoardScale
    const deltaY = (point.y - activeDrag.pointerStart.y) / currentBoardScale
    if (!activeDrag.hasMoved && Math.hypot(deltaX, deltaY) > 6) {
      activeDrag.hasMoved = true
      clearDeviceLongPressTimer(activeDrag)
      setDeviceActionId(null)
    }
    const maxX = Math.max(0, currentBoardSize.width - NODE_WIDTH - BOARD_DRAG_INSET * 2)
    const maxY = Math.max(0, Math.max(currentBoardSize.height, currentBoardHeight) - NODE_HEIGHT - BOARD_DRAG_INSET * 2)
    const next = {
      x: clamp(activeDrag.deviceStart.x + deltaX, 0, maxX),
      y: clamp(activeDrag.deviceStart.y + deltaY, 0, maxY)
    }

    setModel((current) => moveDevice(current, activeDrag.deviceId, next))
  }

  function stopDeviceDrag() {
    const activeDrag = dragRef.current
    if (!activeDrag) return
    clearDeviceLongPressTimer(activeDrag)
    const device = modelRef.current.devices.find((item) => item.id === activeDrag.deviceId)
    if (device && activeDrag.hasMoved) {
      trackTelemetryEvent('canvas_device_dragged', {
        device_id: activeDrag.deviceId,
        from_x: activeDrag.deviceStart.x,
        from_y: activeDrag.deviceStart.y,
        to_x: device.x,
        to_y: device.y
      })
    }
    dragRef.current = null
    setDraggingDeviceId(null)
  }

  function startPaletteComponentDrag(event: PointerLikeEvent, entry: ComponentCatalogEntry) {
    const point = eventPoint(event)
    if (!point || !canUseCatalogEntry(authSession, entry)) return

    const definition = getDeviceDefinition(entry.kind)
    const dragState: PaletteDragState = {
      entry,
      pointerStart: point,
      currentPoint: point,
      active: false
    }

    clearPaletteDragTimer()
    paletteDragRef.current = dragState
    dragState.longPressTimer = typeof window === 'undefined'
      ? undefined
      : window.setTimeout(() => {
          const activeDrag = paletteDragRef.current
          if (activeDrag !== dragState) return
          activeDrag.active = true
          setPaletteDragPreview({
            kind: entry.kind,
            name: definition.name,
            x: point.x,
            y: point.y,
            overBoard: Boolean(getBoardDropPosition(point))
          })
        }, 320)
  }

  function movePaletteComponentDrag(event: PointerLikeEvent) {
    const activeDrag = paletteDragRef.current
    if (!activeDrag) return

    const point = eventPoint(event)
    if (!point) return

    activeDrag.currentPoint = point

    if (!activeDrag.active) {
      if (pointDistance(point, activeDrag.pointerStart) > 14) {
        cancelPaletteDrag()
      }
      return
    }

    event.preventDefault?.()
    const definition = getDeviceDefinition(activeDrag.entry.kind)
    setPaletteDragPreview({
      kind: activeDrag.entry.kind,
      name: definition.name,
      x: point.x,
      y: point.y,
      overBoard: Boolean(getBoardDropPosition(point))
    })
  }

  function finishPaletteComponentDrag(event: PointerLikeEvent) {
    const activeDrag = paletteDragRef.current
    if (!activeDrag) return

    clearPaletteDragTimer(activeDrag)
    const point = eventPoint(event) ?? activeDrag.currentPoint
    const dropPosition = activeDrag.active ? getBoardDropPosition(point) : null
    const entry = activeDrag.entry
    cancelPaletteDrag()

    if (dropPosition) {
      addDevice(entry.kind, 'palette_drag', dropPosition)
    }
  }

  function selectSimulationCategory(categoryId: string) {
    trackTelemetryEvent('category_changed', {
      domain: activeDomain,
      category_id: categoryId,
      source: 'simulation_palette'
    })
    setActiveSimulationCategoryId(categoryId)
  }

  function toggleSimulationPaletteCategory(categoryId: string) {
    setExpandedSimulationCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    )
  }

  function startChallenge(challengeId: string) {
    const challenge = getChallengeById(challengeId)
    trackTelemetryEvent('training_started', {
      challenge_id: challenge.id,
      lesson_id: challenge.lessonId,
      source: 'challenge'
    })
    setActiveChallengeId(challenge.id)
    setActiveLessonId(challenge.lessonId)
    setSelectedId(challenge.id === 'sensor-io' ? 'x1' : 'l1')
    setModel(createTrainingCircuit(challenge.id))
    changeAppModule('simulate', 'training_started')
  }

  function startFaultScenario(scenarioId: string) {
    const scenario = getFaultScenarioById(scenarioId)
    trackTelemetryEvent('fault_scenario_started', {
      scenario_id: scenario.id,
      lesson_id: scenario.lessonId,
      level: scenario.level,
      mode: scenario.mode
    })
    setActiveLessonId(scenario.lessonId)
    if (scenario.challengeId) {
      setActiveChallengeId(scenario.challengeId)
    }
    setActiveKnowledgeTrackId(scenario.level)
    setSelectedId(scenario.id === 'source-short-protection' ? 'w-training-short' : 'l1')
    setModel(createFaultScenarioCircuit(scenario.id))
    changeAppModule('simulate', 'fault_scenario_started')
  }

  function changeDomain(domain: WorkbenchDomain) {
    const profile = getDomainProfile(domain)
    trackTelemetryEvent('domain_changed', {
      domain,
      recommended_voltage: profile.recommendedVoltage,
      recommended_tier: profile.recommendedTier
    })
    setActiveDomain(domain)
    setActiveCategoryId('all')
    setActiveSimulationCategoryId('all')
    setExpandedSimulationCategoryIds((current) => {
      const firstCategoryId = profile.categories[0]?.id
      if (!firstCategoryId || current.includes(firstCategoryId)) return current
      return [...current, firstCategoryId]
    })
    setVoltage(profile.recommendedVoltage, 'domain_changed')
  }

  function changeCategory(categoryId: string) {
    trackTelemetryEvent('category_changed', {
      domain: activeDomain,
      category_id: categoryId
    })
    setActiveCategoryId(categoryId)
  }

  function selectLesson(lessonId: string) {
    const nextLesson = getLessonById(lessonId)
    const nextChallengeId = nextLesson.challengeIds[0]

    trackTelemetryEvent('lesson_selected', {
      lesson_id: nextLesson.id,
      challenge_id: nextChallengeId
    })
    setActiveLessonId(nextLesson.id)
    if (nextChallengeId) {
      setActiveChallengeId(nextChallengeId)
    }
  }

  function openPlan(tier: SubscriptionTier, source = 'manual') {
    trackTelemetryEvent('paywall_viewed', {
      target_tier: tier,
      current_tier: authSession.tier,
      source
    })
    setSelectedPlanId(tier)
    changeAppModule('account', 'paywall_viewed')
  }

  function openLockedComponentPlan(entry: ComponentCatalogEntry) {
    trackTelemetryEvent('locked_component_clicked', {
      kind: entry.kind,
      domain: entry.domain,
      category_id: entry.categoryId,
      required_tier: entry.tier
    })
    openPlan(entry.tier, 'locked_component')
  }

  function simulateSignIn(tier = selectedPlanId) {
    trackTelemetryEvent('auth_changed', {
      status: 'authenticated',
      tier,
      source: 'demo_sign_in'
    })
    setSelectedPlanId(tier)
    setAuthSession(createAuthenticatedSession(tier))
    changeAppModule('account', 'auth_changed')
  }

  function simulateSignOut() {
    trackTelemetryEvent('auth_changed', {
      status: 'anonymous',
      tier: 'free',
      source: 'demo_sign_out'
    })
    setAuthSession(DEFAULT_AUTH_SESSION)
    changeAppModule('account', 'auth_changed')
  }

  function selectPlan(tier: SubscriptionTier) {
    trackTelemetryEvent('purchase_intent', {
      target_tier: tier,
      current_tier: authSession.tier,
      source: 'plan_card'
    })
    setSelectedPlanId(tier)
    setAuthSession(createAuthenticatedSession(tier))
    changeAppModule('account', 'purchase_intent')
  }

  function answerKnowledgeQuestion(questionId: string, answerId: string) {
    const result = evaluateKnowledgeAnswer(questionId, answerId)
    trackTelemetryEvent('knowledge_answered', {
      question_id: questionId,
      answer_id: answerId,
      track_id: activeKnowledgeTrackId,
      correct: result.correct
    })
    setKnowledgeAnswers((current) => ({
      ...current,
      [questionId]: answerId
    }))
    changeAppModule('bank', 'knowledge_answered')
  }

  function changeKnowledgeTrack(trackId: KnowledgeTrackId) {
    trackTelemetryEvent('knowledge_track_changed', {
      track_id: trackId
    })
    setActiveKnowledgeTrackId(trackId)
    changeAppModule('bank', 'knowledge_track_changed')
  }

  function answerAssessmentQuestion(questionId: string, answerId: string) {
    const result = evaluateKnowledgeAnswer(questionId, answerId)
    trackTelemetryEvent('assessment_answered', {
      blueprint_id: activeAssessmentId,
      question_id: questionId,
      answer_id: answerId,
      correct: result.correct
    })
    setAssessmentAnswers((current) => ({
      ...current,
      [questionId]: answerId
    }))
    setKnowledgeAnswers((current) => ({
      ...current,
      [questionId]: answerId
    }))
    changeAppModule('bank', 'assessment_answered')
  }

  function changeAssessment(blueprintId: AssessmentBlueprintId) {
    trackTelemetryEvent('assessment_changed', {
      blueprint_id: blueprintId
    })
    setActiveAssessmentId(blueprintId)
    setAssessmentAnswers({})
    changeAppModule('bank', 'assessment_changed')
  }

  function toggleWireConnection(wireId: string) {
    const wire = modelRef.current.wires.find((item) => item.id === wireId)
    const connected = !wire?.connected
    trackTelemetryEvent('wire_connection_changed', {
      wire_id: wireId,
      connected,
      source: 'wire_toggle'
    })
    setModel((current) => updateWire(current, wireId, connected))
  }

  function changeWirePathMode(wireId: string, mode: WirePathMode) {
    trackTelemetryEvent('wire_path_changed', {
      wire_id: wireId,
      path_mode: mode
    })
    setModel((current) => updateWirePathMode(current, wireId, mode))
  }

  const voltage = model.devices.find((device) => device.id === 'p1')?.sourceVoltage ?? 12
  const stateLabel = simulation.shortCircuit
    ? '短路保护'
    : simulation.closedCircuit
      ? '回路接通'
      : '等待接通'
  const commercialAccess = useMemo(
    () => buildCommercialAccessSnapshot(authSession, activeDomain, selectedPlanId),
    [authSession, activeDomain, selectedPlanId]
  )
  const isNativeAndroidShell = getBuildTarget() === 'android-google-play'
  return (
    <View className={`app-shell module-focus-${activeModule}${isNativeAndroidShell ? ' is-native-shell' : ''}${isCanvasFocusMode ? ' is-canvas-focus-mode' : ''}`}>
      <AppModuleNav activeModule={activeModule} onChange={changeAppModule} />

      <View className='mobile-section mobile-section-learn'>
        <LearningDashboard
          lesson={activeLesson}
          challenge={activeChallenge}
          evaluation={challengeEvaluation}
          onSelectLesson={selectLesson}
          onStartChallenge={startChallenge}
          onStartScenario={startFaultScenario}
        />
      </View>

      <View className='mobile-section mobile-section-bank'>
        <KnowledgeValidationBoard
          activeTrackId={activeKnowledgeTrackId}
          answers={knowledgeAnswers}
          simulationChecks={knowledgeSimulationChecks}
          measurement={knowledgeMeasurement}
          formulaVerification={formulaVerification}
          onSelectTrack={changeKnowledgeTrack}
          onAnswer={answerKnowledgeQuestion}
        />

        <AssessmentBoard
          activeBlueprintId={activeAssessmentId}
          answers={assessmentAnswers}
          readiness={assessmentReadiness}
          meter={virtualMeter}
          onSelectBlueprint={changeAssessment}
          onAnswer={answerAssessmentQuestion}
        />
      </View>

      <View className='mobile-section mobile-section-workspace'>
        <View className='workspace simulation-workspace'>
          <SimulationComponentPalette
            activeDomain={activeDomain}
            activeCategoryId={activeSimulationCategoryId}
            expandedCategoryIds={expandedSimulationCategoryIds}
            session={authSession}
            onSelectCategory={selectSimulationCategory}
            onToggleCategory={toggleSimulationPaletteCategory}
            onAdd={(kind) => addDevice(kind, 'simulation_palette_tap')}
            onLocked={openLockedComponentPlan}
            onDragStart={startPaletteComponentDrag}
            onDragMove={movePaletteComponentDrag}
            onDragEnd={finishPaletteComponentDrag}
          />

          <View className='canvas-panel'>
            <View className='canvas-header'>
              <View>
                <Text className='panel-title'>模拟连接画布</Text>
                <Text className='panel-subtitle'>
                  点击元件或导线查看状态，导线可独立接入或断开。当前训练：{activeChallenge.title}
                </Text>
              </View>
              <View className='canvas-actions'>
                <Button className='small-action landscape-action' onClick={toggleCanvasFocusMode}>
                  {isCanvasFocusMode ? '退出全屏' : '横屏检查'}
                </Button>
              </View>
            </View>

            <View
              className='canvas-board-viewport'
              style={{ height: `${boardViewportHeight}px` }}
              onTouchStart={startCanvasGesture}
              onTouchMove={moveCanvasGesture}
              onTouchEnd={stopCanvasGesture}
              onTouchCancel={stopCanvasGesture}
            >
              <View
                className='circuit-board-frame'
                style={{
                  width: `${boardVisualWidth}px`,
                  height: `${boardVisualHeight}px`
                }}
              >
                <View
                  className='circuit-board'
                  style={{
                    width: `${boardLogicalWidth}px`,
                    height: `${boardHeight}px`,
                    transform: boardScale === 1 ? 'none' : `scale(${boardScale})`
                  }}
                  onTouchMove={dragDevice}
                  onTouchEnd={stopDeviceDrag}
                  onTouchCancel={stopDeviceDrag}
                >
                  <View className='grid-bg' />
                  <WireLayer
                    wires={model.wires}
                    devices={model.devices}
                    simulation={simulation}
                    selectedWireId={selectedWire?.id}
                    onSelectWire={setSelectedId}
                  />
                  {model.devices.map((device) => (
                    <BoardDevice
                      key={device.id}
                      device={device}
                      selected={selectedId === device.id}
                      dragging={draggingDeviceId === device.id}
                      showDeleteAction={deviceActionId === device.id}
                      effect={simulation.effects[device.id]}
                      voltage={voltage}
                      onSelect={setSelectedId}
                      onDragStart={startDeviceDrag}
                      onDelete={removeDevice}
                      onSetVoltage={setVoltage}
                      onToggleSwitch={toggleSwitch}
                    />
                  ))}
                  <View className='board-legend positive'>正极母线</View>
                  <View className='board-legend negative'>负极回线</View>
                </View>
              </View>
            </View>

            <CanvasStatusBar simulation={simulation} stateLabel={stateLabel} />

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
                      onClick={() => toggleWireConnection(wire.id)}
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
                <View className='wire-style-control'>
                  <Text className='field-label'>线型</Text>
                  <View className='segmented-control'>
                    {([
                      ['orthogonal', '折线'],
                      ['smooth', '平滑']
                    ] as const).map(([mode, label]) => (
                      <Button
                        key={mode}
                        className={[
                          'style-button',
                          selectedWire.pathMode === mode ? 'is-active' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => changeWirePathMode(selectedWire.id, mode)}
                      >
                        {label}
                      </Button>
                    ))}
                  </View>
                </View>
                <Button
                  className='full-button'
                  onClick={() => toggleWireConnection(selectedWire.id)}
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

            <VirtualMeterPanel worksheet={virtualMeter} />

            <View className='issue-list'>
              {simulation.issues.map((issue, index) => (
                <View key={`${issue.message}-${index}`} className={`issue issue-${issue.severity}`}>
                  <Text>{issue.message}</Text>
                </View>
              ))}
            </View>

            <TrainingScoreCard challenge={activeChallenge} evaluation={challengeEvaluation} />
            <SafetyDiagnosticsCard diagnostics={safetyDiagnostics} />
          </View>
        </View>
      </View>

      {paletteDragPreview && (
        <View
          className={`palette-drag-preview ${paletteDragPreview.overBoard ? 'is-over-board' : ''}`}
          style={{
            left: `${paletteDragPreview.x}px`,
            top: `${paletteDragPreview.y}px`
          }}
        >
          <View className={`palette-icon palette-${paletteDragPreview.kind}`}>
            <ComponentIllustration kind={paletteDragPreview.kind} compact />
          </View>
          <Text>{paletteDragPreview.name}</Text>
        </View>
      )}

      <View className='mobile-section mobile-section-library'>
        <CommercialDashboard
          access={commercialAccess}
          activeDomain={activeDomain}
          onChangeDomain={changeDomain}
          variant='library'
        />

        <View className='library-workspace'>
          <View className='palette-panel'>
            <Text className='panel-title'>{activeDomainProfile.label}元件库</Text>
            <Text className='panel-subtitle'>{activeDomainProfile.description}</Text>
            <CategoryFilter
              activeDomain={activeDomain}
              activeCategoryId={activeCategoryId}
              onSelect={changeCategory}
            />
            <ScrollView scrollY className='palette-scroll'>
              {catalogEntries.map((entry) => (
                <CatalogEntryRow
                  key={`${entry.domain}-${entry.categoryId}-${entry.kind}`}
                  entry={entry}
                  session={authSession}
                  onAdd={addDevice}
                  onLocked={openLockedComponentPlan}
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
                当前账号已解锁 {commercialAccess.catalog.available}/{commercialAccess.catalog.total} 个行业元件，套餐门槛和分类已拆到商业配置层。
              </Text>
            </View>
          </View>

          <MaterialSpecPanel
            selectedKind={selectedDevice?.kind}
            activeDomain={activeDomain}
            activeTrackId={activeKnowledgeTrackId}
            materialQuery={materialQuery}
            onMaterialQueryChange={setMaterialQuery}
          />
        </View>
      </View>

      <View className='mobile-section mobile-section-account'>
        <View className='account-workspace'>
          <CommercePanel
            access={commercialAccess}
            session={authSession}
            selectedPlanId={selectedPlanId}
            onSignIn={simulateSignIn}
            onSignOut={simulateSignOut}
            onSelectPlan={selectPlan}
          />
          <CommercialDashboard
            access={commercialAccess}
            activeDomain={activeDomain}
            onChangeDomain={changeDomain}
            variant='account'
          />
        </View>
      </View>

      <View className='mobile-section mobile-section-effects'>
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
      </View>

      <MobileBottomNav activeModule={activeModule} onChange={changeAppModule} />
    </View>
  )
}
