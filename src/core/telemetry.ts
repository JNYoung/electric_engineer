export type TelemetryRegion = 'domestic' | 'overseas'
export type TelemetryBuildTarget = 'h5' | 'weapp' | 'ios' | 'android' | 'android-google-play' | 'app' | 'unknown'
export type TelemetryPrimitive = string | number | boolean | null
export type TelemetryProperties = Record<string, TelemetryPrimitive | undefined>

export type TelemetryEventName =
  | 'app_open'
  | 'app_module_changed'
  | 'mobile_tab_changed'
  | 'domain_changed'
  | 'category_changed'
  | 'component_added'
  | 'locked_component_clicked'
  | 'circuit_switch_toggled'
  | 'circuit_voltage_changed'
  | 'wire_connection_changed'
  | 'wire_path_changed'
  | 'all_wires_changed'
  | 'canvas_device_dragged'
  | 'circuit_reset'
  | 'training_started'
  | 'fault_scenario_started'
  | 'lesson_selected'
  | 'knowledge_track_changed'
  | 'knowledge_answered'
  | 'assessment_changed'
  | 'assessment_answered'
  | 'paywall_viewed'
  | 'purchase_intent'
  | 'auth_changed'

export interface TelemetryBuildConfig {
  region: TelemetryRegion
  buildTarget: TelemetryBuildTarget
  channel: string
  endpoint: string
  appVersion: string
  enabled: boolean
}

export interface TelemetryContext extends TelemetryBuildConfig {
  platform: string
  locale: string
  sessionId: string
  anonymousId: string
}

export interface TelemetryEventInput {
  name: TelemetryEventName
  properties?: TelemetryProperties
  timestamp?: number
}

export interface DomesticTelemetryEnvelope {
  schema: 'cn-edu-v1'
  endpoint: string
  event: `cn_${TelemetryEventName}`
  distinctId: string
  time: number
  common: {
    app: 'diangong-dashi'
    appVersion: string
    region: 'domestic'
    channel: string
    buildTarget: TelemetryBuildTarget
    platform: string
    locale: string
    sessionId: string
  }
  properties: TelemetryProperties
}

export interface OverseasTelemetryEnvelope {
  schema: 'global-edu-v1'
  endpoint: string
  eventName: TelemetryEventName
  clientId: string
  timestampMicros: number
  app: {
    name: 'Circuit Master'
    version: string
    region: 'overseas'
    channel: string
    buildTarget: TelemetryBuildTarget
    platform: string
    locale: string
    sessionId: string
  }
  params: TelemetryProperties
}

export type TelemetryEnvelope = DomesticTelemetryEnvelope | OverseasTelemetryEnvelope
export type TelemetryTransport = (envelope: TelemetryEnvelope) => void | Promise<void>

export interface TelemetryAdapter {
  region: TelemetryRegion
  provider: string
  toEnvelope: (event: TelemetryEventInput, context: TelemetryContext) => TelemetryEnvelope
}

export interface TelemetryClient {
  context: TelemetryContext
  adapter: TelemetryAdapter
  track: (name: TelemetryEventName, properties?: TelemetryProperties) => void
}

declare const __TELEMETRY_REGION__: string | undefined
declare const __TELEMETRY_CHANNEL__: string | undefined
declare const __TELEMETRY_ENDPOINT__: string | undefined
declare const __TELEMETRY_ENABLED__: boolean | undefined
declare const __BUILD_TARGET__: string | undefined
declare const __APP_VERSION__: string | undefined

const DEFAULT_DOMESTIC_ENDPOINT = '/api/telemetry/cn/events'
const DEFAULT_OVERSEAS_ENDPOINT = '/api/telemetry/global/events'
const defaultTransport: TelemetryTransport = () => undefined

export function getBuildTelemetryConfig(overrides: Partial<TelemetryBuildConfig> = {}): TelemetryBuildConfig {
  const region = overrides.region ?? normalizeTelemetryRegion(readBuildRegion(), 'domestic')
  const buildTarget = overrides.buildTarget ?? normalizeBuildTarget(readBuildTarget())
  const endpoint =
    overrides.endpoint ??
    readBuildEndpoint() ??
    (region === 'overseas' ? DEFAULT_OVERSEAS_ENDPOINT : DEFAULT_DOMESTIC_ENDPOINT)

  return {
    region,
    buildTarget,
    endpoint,
    channel: overrides.channel ?? readBuildChannel() ?? buildTarget,
    appVersion: overrides.appVersion ?? readAppVersion() ?? '0.1.0',
    enabled: overrides.enabled ?? readTelemetryEnabled() ?? true
  }
}

export function createTelemetryContext(
  config: TelemetryBuildConfig,
  overrides: Partial<Pick<TelemetryContext, 'platform' | 'locale' | 'sessionId' | 'anonymousId'>> = {}
): TelemetryContext {
  return {
    ...config,
    platform: overrides.platform ?? config.buildTarget,
    locale: overrides.locale ?? 'zh-CN',
    sessionId: overrides.sessionId ?? createTelemetryId('session'),
    anonymousId: overrides.anonymousId ?? createTelemetryId('anon')
  }
}

export function createTelemetryClient(options: {
  config?: Partial<TelemetryBuildConfig>
  context?: Partial<Pick<TelemetryContext, 'platform' | 'locale' | 'sessionId' | 'anonymousId'>>
  transport?: TelemetryTransport
} = {}): TelemetryClient {
  const config = getBuildTelemetryConfig(options.config)
  const context = createTelemetryContext(config, options.context)
  const adapter = createTelemetryAdapter(config.region)
  const transport = options.transport ?? defaultTransport

  return {
    context,
    adapter,
    track(name, properties = {}) {
      if (!context.enabled) return
      const envelope = adapter.toEnvelope({ name, properties, timestamp: Date.now() }, context)
      void transport(envelope)
    }
  }
}

export function createTelemetryAdapter(region: TelemetryRegion): TelemetryAdapter {
  return region === 'overseas' ? createOverseasTelemetryAdapter() : createDomesticTelemetryAdapter()
}

export function createDomesticTelemetryAdapter(): TelemetryAdapter {
  return {
    region: 'domestic',
    provider: 'cn-product-analytics',
    toEnvelope(event, context) {
      return {
        schema: 'cn-edu-v1',
        endpoint: context.endpoint,
        event: `cn_${event.name}`,
        distinctId: context.anonymousId,
        time: event.timestamp ?? Date.now(),
        common: {
          app: 'diangong-dashi',
          appVersion: context.appVersion,
          region: 'domestic',
          channel: context.channel,
          buildTarget: context.buildTarget,
          platform: context.platform,
          locale: context.locale,
          sessionId: context.sessionId
        },
        properties: sanitizeTelemetryProperties(event.properties)
      }
    }
  }
}

export function createOverseasTelemetryAdapter(): TelemetryAdapter {
  return {
    region: 'overseas',
    provider: 'global-product-analytics',
    toEnvelope(event, context) {
      return {
        schema: 'global-edu-v1',
        endpoint: context.endpoint,
        eventName: event.name,
        clientId: context.anonymousId,
        timestampMicros: (event.timestamp ?? Date.now()) * 1000,
        app: {
          name: 'Circuit Master',
          version: context.appVersion,
          region: 'overseas',
          channel: context.channel,
          buildTarget: context.buildTarget,
          platform: context.platform,
          locale: context.locale,
          sessionId: context.sessionId
        },
        params: sanitizeTelemetryProperties(event.properties)
      }
    }
  }
}

export function normalizeTelemetryRegion(value: unknown, fallback: TelemetryRegion = 'domestic'): TelemetryRegion {
  return value === 'overseas' || value === 'domestic' ? value : fallback
}

export function normalizeBuildTarget(value: unknown): TelemetryBuildTarget {
  if (
    value === 'h5' ||
    value === 'weapp' ||
    value === 'ios' ||
    value === 'android' ||
    value === 'android-google-play' ||
    value === 'app'
  ) {
    return value
  }
  return 'unknown'
}

export function sanitizeTelemetryProperties(properties: TelemetryProperties = {}): TelemetryProperties {
  return Object.entries(properties).reduce<TelemetryProperties>((result, [key, value]) => {
    if (value === undefined) return result
    result[key] = value
    return result
  }, {})
}

function createTelemetryId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readBuildRegion() {
  return typeof __TELEMETRY_REGION__ === 'undefined' ? undefined : __TELEMETRY_REGION__
}

function readBuildChannel() {
  return typeof __TELEMETRY_CHANNEL__ === 'undefined' ? undefined : __TELEMETRY_CHANNEL__
}

function readBuildEndpoint() {
  return typeof __TELEMETRY_ENDPOINT__ === 'undefined' ? undefined : __TELEMETRY_ENDPOINT__
}

function readTelemetryEnabled() {
  return typeof __TELEMETRY_ENABLED__ === 'undefined' ? undefined : __TELEMETRY_ENABLED__
}

function readBuildTarget() {
  return typeof __BUILD_TARGET__ === 'undefined' ? undefined : __BUILD_TARGET__
}

function readAppVersion() {
  return typeof __APP_VERSION__ === 'undefined' ? undefined : __APP_VERSION__
}
