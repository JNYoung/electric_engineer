import { describe, expect, it } from 'vitest'
import {
  COMPONENT_CATALOG,
  DEFAULT_AUTH_SESSION,
  buildCommercialAccessSnapshot,
  canUseCatalogEntry,
  canUseFeature,
  createAuthenticatedSession,
  getCatalogAccessSummary,
  getCatalogEntries,
  getCatalogEntriesByCategory,
  getCatalogSummary,
  getDomainProfile
} from '../../src/core/commercial'

describe('commercial catalog and access gates', () => {
  it('separates engineering and renovation control domains with categories', () => {
    const engineering = getDomainProfile('engineering-control')
    const renovation = getDomainProfile('renovation-control')

    expect(engineering.label).toBe('工程工控')
    expect(renovation.label).toBe('装修工控')
    expect(engineering.categories.length).toBeGreaterThanOrEqual(4)
    expect(renovation.categories.length).toBeGreaterThanOrEqual(4)
    expect(getCatalogEntries('engineering-control').some((entry) => entry.kind === 'plc-controller')).toBe(true)
    expect(getCatalogEntries('renovation-control').some((entry) => entry.kind === 'smart-switch-panel')).toBe(true)
  })

  it('keeps category filters consistent with catalog summaries', () => {
    const summary = getCatalogSummary('engineering-control')
    const categorizedCount = getDomainProfile('engineering-control').categories.reduce(
      (total, category) => total + getCatalogEntriesByCategory('engineering-control', category.id).length,
      0
    )

    expect(summary.total).toBe(categorizedCount)
    expect(summary.proCount).toBeGreaterThan(0)
    expect(COMPONENT_CATALOG.every((entry) => entry.tags.length > 0)).toBe(true)
  })

  it('gates professional components until the account has a paid tier', () => {
    const plc = COMPONENT_CATALOG.find((entry) => entry.kind === 'plc-controller')
    expect(plc).toBeDefined()
    expect(canUseCatalogEntry(DEFAULT_AUTH_SESSION, plc!)).toBe(false)
    expect(canUseCatalogEntry(createAuthenticatedSession('pro'), plc!)).toBe(true)
    expect(canUseFeature(DEFAULT_AUTH_SESSION, 'advanced-industrial-components')).toBe(false)
    expect(canUseFeature(createAuthenticatedSession('team'), 'team-management')).toBe(true)
  })

  it('builds account and billing actions for anonymous, pro, and team sessions', () => {
    const anonymous = buildCommercialAccessSnapshot(DEFAULT_AUTH_SESSION, 'engineering-control', 'pro')
    expect(anonymous.catalog.locked).toBeGreaterThan(0)
    expect(anonymous.catalog.lockedPreview).toContain('PLC 控制器')
    expect(anonymous.primaryAction.kind).toBe('sign-in')
    expect(anonymous.primaryAction.endpoint).toBe('/api/auth/sign-in')
    expect(anonymous.primaryAction.targetTier).toBe('pro')
    expect(anonymous.features.find((item) => item.id === 'advanced-industrial-components')?.available).toBe(false)

    const pro = buildCommercialAccessSnapshot(createAuthenticatedSession('pro'), 'engineering-control')
    expect(pro.catalog.locked).toBe(0)
    expect(pro.primaryAction.kind).toBe('checkout')
    expect(pro.primaryAction.targetTier).toBe('team')
    expect(pro.features.find((item) => item.id === 'advanced-industrial-components')?.available).toBe(true)
    expect(pro.features.find((item) => item.id === 'team-management')?.available).toBe(false)

    const team = buildCommercialAccessSnapshot(createAuthenticatedSession('team'), 'renovation-control')
    expect(team.catalog.locked).toBe(0)
    expect(team.primaryAction.kind).toBe('billing-portal')
    expect(team.primaryAction.endpoint).toBe('/api/billing/portal')
    expect(team.features.every((item) => item.available)).toBe(true)
  })

  it('recommends paid access for locked renovation templates without mixing domains', () => {
    const summary = getCatalogAccessSummary(DEFAULT_AUTH_SESSION, 'renovation-control')
    const snapshot = buildCommercialAccessSnapshot(DEFAULT_AUTH_SESSION, 'renovation-control')

    expect(summary.locked).toBeGreaterThan(0)
    expect(summary.lockedByTier.pro).toBe(summary.locked)
    expect(snapshot.recommendedPlan.id).toBe('pro')
    expect(snapshot.features.map((item) => item.id)).toEqual([
      'basic-training',
      'renovation-templates',
      'project-export',
      'team-management'
    ])
  })
})
