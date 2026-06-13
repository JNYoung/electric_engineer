import { Capacitor, registerPlugin } from '@capacitor/core'

import type { TelemetryEnvelope, TelemetryTransport } from './telemetry'

export type GooglePlayAdPlacement = 'hidden' | 'account_banner'

interface ElectricAnalyticsPlugin {
  logEvent(options: { name: string; params?: Record<string, string | number | boolean> }): Promise<void>
  setUserId(options: { userId?: string }): Promise<void>
  setUserProperty(options: { name: string; value: string }): Promise<void>
}

interface ElectricAdsPlugin {
  initialize(): Promise<void>
  showBanner(options: {
    adUnitId?: string
    position?: 'top' | 'bottom'
    marginTopDp?: number
    marginBottomDp?: number
  }): Promise<void>
  hideBanner(): Promise<void>
}

declare const __TELEMETRY_CHANNEL__: string | undefined

const GOOGLE_PLAY_CHANNEL = 'android-google-play'
const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111'
const ElectricAnalytics = registerPlugin<ElectricAnalyticsPlugin>('ElectricAnalytics')
const ElectricAds = registerPlugin<ElectricAdsPlugin>('ElectricAds')

let activePlacement: GooglePlayAdPlacement = 'hidden'

export function isGooglePlayAndroidRuntime() {
  const channel = readTelemetryChannel()
  return Capacitor.getPlatform() === 'android' && (
    channel === GOOGLE_PLAY_CHANNEL || channel === `${GOOGLE_PLAY_CHANNEL}-internal`
  )
}

export function createGooglePlayTelemetryTransport(): TelemetryTransport {
  return (envelope) => {
    if (!isGooglePlayAndroidRuntime() || envelope.schema !== 'global-edu-v1') return

    void ElectricAnalytics.logEvent({
      name: envelope.eventName,
      params: sanitizeNativeParams({
        ...envelope.params,
        app_version: envelope.app.version,
        channel: envelope.app.channel,
        build_target: envelope.app.buildTarget,
        locale: envelope.app.locale
      })
    }).catch(() => undefined)
  }
}

export function syncGooglePlayAdPlacement(placement: GooglePlayAdPlacement) {
  if (!isGooglePlayAndroidRuntime() || placement === activePlacement) return
  activePlacement = placement

  if (placement === 'hidden') {
    void ElectricAds.hideBanner().catch(() => undefined)
    return
  }

  void ElectricAds.showBanner({
    adUnitId: TEST_BANNER_AD_UNIT_ID,
    position: 'top',
    marginTopDp: 0
  }).catch(() => undefined)

  void ElectricAnalytics.logEvent({
    name: 'ad_banner_requested',
    params: {
      placement,
      ad_network: 'admob',
      ad_unit_type: 'test_banner'
    }
  }).catch(() => undefined)
}

function sanitizeNativeParams(params: Record<string, unknown>) {
  return Object.entries(params).reduce<Record<string, string | number | boolean>>((result, [key, value]) => {
    if (value === undefined || value === null) return result
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
      return result
    }
    result[key] = String(value)
    return result
  }, {})
}

function readTelemetryChannel() {
  return typeof __TELEMETRY_CHANNEL__ === 'undefined' ? undefined : __TELEMETRY_CHANNEL__
}
