import { describe, expect, it, vi } from 'vitest'
import {
  createTelemetryClient,
  createTelemetryContext,
  createTelemetryAdapter,
  getBuildTelemetryConfig,
  sanitizeTelemetryProperties
} from '../../src/core/telemetry'
import type { TelemetryEnvelope } from '../../src/core/telemetry'

describe('telemetry abstraction', () => {
  it('maps the same product event to domestic and overseas envelopes', () => {
    const domesticContext = createTelemetryContext(
      getBuildTelemetryConfig({
        region: 'domestic',
        buildTarget: 'weapp',
        channel: 'weapp',
        endpoint: '/cn/events',
        appVersion: '0.1.0'
      }),
      {
        anonymousId: 'anon-cn',
        sessionId: 'session-cn',
        platform: 'weapp',
        locale: 'zh-CN'
      }
    )
    const overseasContext = createTelemetryContext(
      getBuildTelemetryConfig({
        region: 'overseas',
        buildTarget: 'app',
        channel: 'app-global',
        endpoint: '/global/events',
        appVersion: '0.1.0'
      }),
      {
        anonymousId: 'anon-global',
        sessionId: 'session-global',
        platform: 'ios',
        locale: 'en-US'
      }
    )

    const domestic = createTelemetryAdapter('domestic').toEnvelope(
      {
        name: 'component_added',
        timestamp: 1000,
        properties: { kind: 'lamp', locked: undefined }
      },
      domesticContext
    )
    const overseas = createTelemetryAdapter('overseas').toEnvelope(
      {
        name: 'component_added',
        timestamp: 1000,
        properties: { kind: 'lamp', locked: undefined }
      },
      overseasContext
    )

    expect(domestic.schema).toBe('cn-edu-v1')
    expect(domestic.endpoint).toBe('/cn/events')
    expect(domestic.event).toBe('cn_component_added')
    expect(domestic.common.region).toBe('domestic')
    expect(domestic.common.channel).toBe('weapp')
    expect(domestic.properties).toEqual({ kind: 'lamp' })

    expect(overseas.schema).toBe('global-edu-v1')
    expect(overseas.endpoint).toBe('/global/events')
    expect(overseas.eventName).toBe('component_added')
    expect(overseas.app.region).toBe('overseas')
    expect(overseas.app.channel).toBe('app-global')
    expect(overseas.params).toEqual({ kind: 'lamp' })
  })

  it('selects default endpoints by region and can disable dispatch', () => {
    const domestic = getBuildTelemetryConfig({ region: 'domestic' })
    const overseas = getBuildTelemetryConfig({ region: 'overseas' })
    const transport = vi.fn<(envelope: TelemetryEnvelope) => void>()
    const client = createTelemetryClient({
      config: {
        region: 'overseas',
        enabled: false
      },
      context: {
        anonymousId: 'anon',
        sessionId: 'session'
      },
      transport
    })

    expect(domestic.endpoint).toBe('/api/telemetry/cn/events')
    expect(overseas.endpoint).toBe('/api/telemetry/global/events')
    client.track('app_open')
    expect(transport).not.toHaveBeenCalled()
  })

  it('drops undefined properties but keeps intentional empty values', () => {
    expect(
      sanitizeTelemetryProperties({
        empty: '',
        zero: 0,
        falseValue: false,
        missing: undefined,
        nullable: null
      })
    ).toEqual({
      empty: '',
      zero: 0,
      falseValue: false,
      nullable: null
    })
  })
})
