import { describe, expect, it } from 'vitest'
import {
  COMPONENT_CATALOG,
  DEFAULT_AUTH_SESSION,
  canUseCatalogEntry,
  canUseFeature,
  createAuthenticatedSession,
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
})
