import { getDeviceDefinition } from './registry'
import type { DeviceKind } from './types'

export type WorkbenchDomain = 'engineering-control' | 'renovation-control'
export type SubscriptionTier = 'free' | 'pro' | 'team'
export type CommercialActionKind = 'sign-in' | 'checkout' | 'billing-portal'
export type CommercialFeatureId =
  | 'basic-training'
  | 'advanced-industrial-components'
  | 'renovation-templates'
  | 'project-export'
  | 'team-management'

export interface DomainCategory {
  id: string
  label: string
  description: string
}

export interface DomainProfile {
  id: WorkbenchDomain
  label: string
  shortLabel: string
  headline: string
  description: string
  recommendedVoltage: number
  recommendedTier: SubscriptionTier
  categories: DomainCategory[]
  featureIds: CommercialFeatureId[]
}

export interface ComponentCatalogEntry {
  kind: DeviceKind
  domain: WorkbenchDomain
  categoryId: string
  complexity: '基础' | '进阶' | '专业'
  tier: SubscriptionTier
  tags: string[]
  useCase: string
}

export interface BillingPlan {
  id: SubscriptionTier
  name: string
  monthlyPrice: number
  target: string
  features: string[]
  checkoutSku?: string
}

export interface AuthSession {
  status: 'anonymous' | 'authenticated'
  userId?: string
  displayName: string
  tier: SubscriptionTier
}

export interface FeatureGate {
  id: CommercialFeatureId
  label: string
  requiredTier: SubscriptionTier
  description: string
}

export interface CommercialApiContract {
  auth: {
    signInEndpoint: string
    signOutEndpoint: string
    profileEndpoint: string
  }
  billing: {
    checkoutEndpoint: string
    portalEndpoint: string
    webhookEndpoint: string
  }
}

export interface CatalogAccessSummary {
  total: number
  available: number
  locked: number
  lockedByTier: Record<SubscriptionTier, number>
  lockedPreview: string[]
}

export interface FeatureAccessSummary extends FeatureGate {
  available: boolean
}

export interface CommercialAccessAction {
  kind: CommercialActionKind
  label: string
  endpoint: string
  targetTier: SubscriptionTier
  detail: string
}

export interface CommercialAccessSnapshot {
  domain: WorkbenchDomain
  session: AuthSession
  catalog: CatalogAccessSummary
  features: FeatureAccessSummary[]
  recommendedPlan: BillingPlan
  primaryAction: CommercialAccessAction
}

export const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: 'engineering-control',
    label: '工程工控',
    shortLabel: '工程',
    headline: '面向设备、产线、机房和水泵风机控制',
    description: '聚焦 24V 控制回路、PLC、变频器、接触器、安全联锁和设备告警。',
    recommendedVoltage: 24,
    recommendedTier: 'pro',
    featureIds: ['basic-training', 'advanced-industrial-components', 'project-export', 'team-management'],
    categories: [
      { id: 'control-core', label: '控制核心', description: 'PLC、控制器、驱动与接口模块' },
      { id: 'safety-chain', label: '安全联锁', description: '急停、热继、保护与故障反馈' },
      { id: 'field-sensing', label: '现场检测', description: '接近、限位、压力和环境采集' },
      { id: 'actuation', label: '执行输出', description: '接触器、阀门、塔灯和电机控制侧' }
    ]
  },
  {
    id: 'renovation-control',
    label: '装修工控',
    shortLabel: '装修',
    headline: '面向住宅、商业空间和弱电智能化施工',
    description: '聚焦 12V/24V 弱电、智能面板、照明调光、窗帘、暖通、门禁和漏水告警。',
    recommendedVoltage: 12,
    recommendedTier: 'free',
    featureIds: ['basic-training', 'renovation-templates', 'project-export', 'team-management'],
    categories: [
      { id: 'smart-home-core', label: '智能中枢', description: '网关、门禁、情景面板和控制核心' },
      { id: 'lighting-scene', label: '照明场景', description: '灯光、调光、状态指示和场景控制' },
      { id: 'comfort-actuator', label: '舒适执行', description: '窗帘、地暖、新风和阀门联动' },
      { id: 'security-sensing', label: '安防传感', description: 'PIR、漏水、门禁和环境检测' }
    ]
  }
]

export const COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  {
    kind: 'plc-controller',
    domain: 'engineering-control',
    categoryId: 'control-core',
    complexity: '专业',
    tier: 'pro',
    tags: ['24V', 'I/O', '联锁'],
    useCase: '设备启停、联锁和状态采集控制核心'
  },
  {
    kind: 'dip-switch',
    domain: 'engineering-control',
    categoryId: 'control-core',
    complexity: '基础',
    tier: 'free',
    tags: ['配置', '输入', '模式'],
    useCase: '设备地址、模式选择和参数拨码训练'
  },
  {
    kind: 'vfd-drive',
    domain: 'engineering-control',
    categoryId: 'control-core',
    complexity: '专业',
    tier: 'pro',
    tags: ['变频', '电机', '启停'],
    useCase: '水泵、风机和输送设备的控制侧训练'
  },
  {
    kind: 'emergency-stop',
    domain: 'engineering-control',
    categoryId: 'safety-chain',
    complexity: '进阶',
    tier: 'free',
    tags: ['急停', '安全', '联锁'],
    useCase: '急停回路、停机链和故障复位训练'
  },
  {
    kind: 'thermal-overload',
    domain: 'engineering-control',
    categoryId: 'safety-chain',
    complexity: '进阶',
    tier: 'pro',
    tags: ['过载', '保护', '反馈'],
    useCase: '电机过载保护与告警反馈训练'
  },
  {
    kind: 'limit-switch',
    domain: 'engineering-control',
    categoryId: 'field-sensing',
    complexity: '进阶',
    tier: 'free',
    tags: ['限位', '到位', '机械'],
    useCase: '门机、升降和输送线到位检测'
  },
  {
    kind: 'proximity-sensor',
    domain: 'engineering-control',
    categoryId: 'field-sensing',
    complexity: '进阶',
    tier: 'pro',
    tags: ['接近', '计数', '工位'],
    useCase: '工件到位、计数和位置反馈'
  },
  {
    kind: 'pressure-transmitter',
    domain: 'engineering-control',
    categoryId: 'field-sensing',
    complexity: '专业',
    tier: 'pro',
    tags: ['压力', '过程量', '采集'],
    useCase: '水泵、空压和管路压力监测'
  },
  {
    kind: 'humidity-sensor',
    domain: 'engineering-control',
    categoryId: 'field-sensing',
    complexity: '基础',
    tier: 'free',
    tags: ['温湿度', '机房', '环境'],
    useCase: '机房、仓储和配电间环境状态采集'
  },
  {
    kind: 'ultrasonic-sensor',
    domain: 'engineering-control',
    categoryId: 'field-sensing',
    complexity: '进阶',
    tier: 'free',
    tags: ['测距', '避障', '位置'],
    useCase: '料位、距离和避障反馈训练'
  },
  {
    kind: 'contactor-coil',
    domain: 'engineering-control',
    categoryId: 'actuation',
    complexity: '进阶',
    tier: 'free',
    tags: ['线圈', '吸合', '电机'],
    useCase: '接触器控制侧吸合和互锁训练'
  },
  {
    kind: 'stack-light',
    domain: 'engineering-control',
    categoryId: 'actuation',
    complexity: '基础',
    tier: 'free',
    tags: ['红黄绿', '设备状态'],
    useCase: '设备运行、待机和故障状态提示'
  },
  {
    kind: 'solenoid-valve',
    domain: 'engineering-control',
    categoryId: 'actuation',
    complexity: '进阶',
    tier: 'pro',
    tags: ['阀门', '气动', '水路'],
    useCase: '气动夹具、水路阀门和联动输出训练'
  },
  {
    kind: 'stepper-motor',
    domain: 'engineering-control',
    categoryId: 'actuation',
    complexity: '进阶',
    tier: 'free',
    tags: ['步进', '定位', '执行'],
    useCase: '定位平台、转盘和送料机构训练'
  },
  {
    kind: 'smart-gateway',
    domain: 'renovation-control',
    categoryId: 'smart-home-core',
    complexity: '进阶',
    tier: 'free',
    tags: ['网关', '总线', '联动'],
    useCase: '户内智能化系统的通信与供电核心'
  },
  {
    kind: 'access-control',
    domain: 'renovation-control',
    categoryId: 'smart-home-core',
    complexity: '专业',
    tier: 'pro',
    tags: ['门禁', '安防', '控制器'],
    useCase: '门锁、读卡器和开门按钮弱电训练'
  },
  {
    kind: 'scene-panel',
    domain: 'renovation-control',
    categoryId: 'smart-home-core',
    complexity: '基础',
    tier: 'free',
    tags: ['场景', '面板', '联动'],
    useCase: '回家、离家、观影等多回路场景触发'
  },
  {
    kind: 'smart-switch-panel',
    domain: 'renovation-control',
    categoryId: 'lighting-scene',
    complexity: '基础',
    tier: 'free',
    tags: ['开关', '照明', '弱电'],
    useCase: '照明分区与智能面板供电训练'
  },
  {
    kind: 'dimmer-module',
    domain: 'renovation-control',
    categoryId: 'lighting-scene',
    complexity: '进阶',
    tier: 'pro',
    tags: ['调光', '灯带', '场景'],
    useCase: '灯带、筒灯和氛围灯调光控制'
  },
  {
    kind: 'rgb-led',
    domain: 'renovation-control',
    categoryId: 'lighting-scene',
    complexity: '基础',
    tier: 'free',
    tags: ['指示', '灯光', '状态'],
    useCase: '空间状态提示和场景反馈'
  },
  {
    kind: 'curtain-motor',
    domain: 'renovation-control',
    categoryId: 'comfort-actuator',
    complexity: '进阶',
    tier: 'free',
    tags: ['窗帘', '电机', '限位'],
    useCase: '窗帘开合、到位反馈和场景联动'
  },
  {
    kind: 'floor-heating-thermostat',
    domain: 'renovation-control',
    categoryId: 'comfort-actuator',
    complexity: '进阶',
    tier: 'pro',
    tags: ['地暖', '温控', '暖通'],
    useCase: '温控面板、执行器和舒适系统训练'
  },
  {
    kind: 'leak-detector',
    domain: 'renovation-control',
    categoryId: 'security-sensing',
    complexity: '进阶',
    tier: 'pro',
    tags: ['漏水', '厨卫', '告警'],
    useCase: '厨卫漏水检测与阀门联动'
  },
  {
    kind: 'humidity-sensor',
    domain: 'renovation-control',
    categoryId: 'security-sensing',
    complexity: '基础',
    tier: 'free',
    tags: ['温湿度', '环境', '联动'],
    useCase: '新风、除湿和环境状态联动'
  },
  {
    kind: 'pir-sensor',
    domain: 'renovation-control',
    categoryId: 'security-sensing',
    complexity: '基础',
    tier: 'free',
    tags: ['人体', '安防', '照明'],
    useCase: '人体感应照明、安防和门禁触发'
  }
]

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: '体验版',
    monthlyPrice: 0,
    target: '有基础的取证备考、弱电施工和岗位技能复盘',
    features: ['基础强化电路仿真', '取证常用器件速查', '3 个排障挑战']
  },
  {
    id: 'pro',
    name: '专业版',
    monthlyPrice: 39,
    target: '电工证、工控弱电岗位提升和施工培训',
    checkoutSku: 'sku_dg_pro_month',
    features: ['工程工控高级器件', '过压/断线/短路诊断', '取证训练模板', '项目导出接口']
  },
  {
    id: 'team',
    name: '团队版',
    monthlyPrice: 199,
    target: '培训机构、工程团队和门店交付',
    checkoutSku: 'sku_dg_team_month',
    features: ['成员管理接口', '统一付费入口', '课程进度同步', '企业模板库']
  }
]

export const FEATURE_GATES: FeatureGate[] = [
  {
    id: 'basic-training',
    label: '基础强化训练',
    requiredTier: 'free',
    description: '面向已有基础用户的低压回路、常用模块和排障挑战。'
  },
  {
    id: 'advanced-industrial-components',
    label: '高级工程工控元件',
    requiredTier: 'pro',
    description: 'PLC、变频器、接近开关、压力变送器和电磁阀等专业组件。'
  },
  {
    id: 'renovation-templates',
    label: '装修工控模板',
    requiredTier: 'free',
    description: '面向照明、窗帘、门禁、厨卫告警的弱电场景。'
  },
  {
    id: 'project-export',
    label: '项目导出',
    requiredTier: 'pro',
    description: '为 BOM、施工检查表和课程报告导出预留接口。'
  },
  {
    id: 'team-management',
    label: '团队管理',
    requiredTier: 'team',
    description: '为机构账号、学员进度和企业计费预留接口。'
  }
]

export const COMMERCIAL_API_CONTRACT: CommercialApiContract = {
  auth: {
    signInEndpoint: '/api/auth/sign-in',
    signOutEndpoint: '/api/auth/sign-out',
    profileEndpoint: '/api/auth/profile'
  },
  billing: {
    checkoutEndpoint: '/api/billing/checkout',
    portalEndpoint: '/api/billing/portal',
    webhookEndpoint: '/api/billing/webhook'
  }
}

export const DEFAULT_AUTH_SESSION: AuthSession = {
  status: 'anonymous',
  displayName: '访客',
  tier: 'free'
}

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  team: 2
}

export function getDomainProfile(domain: WorkbenchDomain) {
  return DOMAIN_PROFILES.find((profile) => profile.id === domain) ?? DOMAIN_PROFILES[0]
}

export function getBillingPlan(tier: SubscriptionTier) {
  return BILLING_PLANS.find((item) => item.id === tier) ?? BILLING_PLANS[0]
}

export function getFeatureGate(featureId: CommercialFeatureId) {
  return FEATURE_GATES.find((item) => item.id === featureId)
}

export function getCatalogEntries(domain: WorkbenchDomain) {
  return COMPONENT_CATALOG.filter((entry) => entry.domain === domain)
}

export function getCatalogEntriesByCategory(domain: WorkbenchDomain, categoryId: string) {
  return getCatalogEntries(domain).filter((entry) => entry.categoryId === categoryId)
}

export function getCatalogSummary(domain: WorkbenchDomain) {
  const entries = getCatalogEntries(domain)
  const proCount = entries.filter((entry) => entry.tier !== 'free').length
  const categories = getDomainProfile(domain).categories.length

  return {
    total: entries.length,
    proCount,
    freeCount: entries.length - proCount,
    categories
  }
}

export function hasTierAccess(current: SubscriptionTier, required: SubscriptionTier) {
  return tierRank[current] >= tierRank[required]
}

export function canUseCatalogEntry(session: AuthSession, entry: ComponentCatalogEntry) {
  return hasTierAccess(session.tier, entry.tier)
}

export function canUseFeature(session: AuthSession, featureId: CommercialFeatureId) {
  const gate = getFeatureGate(featureId)
  return gate ? hasTierAccess(session.tier, gate.requiredTier) : false
}

export function createAuthenticatedSession(tier: SubscriptionTier): AuthSession {
  const plan = getBillingPlan(tier)
  return {
    status: 'authenticated',
    userId: `demo-${tier}-user`,
    displayName: `${plan.name}演示账号`,
    tier
  }
}

export function getEntryDisplayName(entry: ComponentCatalogEntry) {
  return getDeviceDefinition(entry.kind).name
}

export function getCatalogAccessSummary(session: AuthSession, domain: WorkbenchDomain): CatalogAccessSummary {
  const entries = getCatalogEntries(domain)
  const lockedEntries = entries.filter((entry) => !canUseCatalogEntry(session, entry))

  return {
    total: entries.length,
    available: entries.length - lockedEntries.length,
    locked: lockedEntries.length,
    lockedByTier: {
      free: lockedEntries.filter((entry) => entry.tier === 'free').length,
      pro: lockedEntries.filter((entry) => entry.tier === 'pro').length,
      team: lockedEntries.filter((entry) => entry.tier === 'team').length
    },
    lockedPreview: lockedEntries.slice(0, 3).map(getEntryDisplayName)
  }
}

export function buildCommercialAccessSnapshot(
  session: AuthSession,
  domain: WorkbenchDomain,
  selectedPlanId?: SubscriptionTier
): CommercialAccessSnapshot {
  const profile = getDomainProfile(domain)
  const catalog = getCatalogAccessSummary(session, domain)
  const features = profile.featureIds
    .map(getFeatureGate)
    .filter((gate): gate is FeatureGate => Boolean(gate))
    .map((gate) => ({
      ...gate,
      available: canUseFeature(session, gate.id)
    }))
  const recommendedTier = getRecommendedCommercialTier(session, domain, selectedPlanId)
  const recommendedPlan = getBillingPlan(recommendedTier)

  return {
    domain,
    session,
    catalog,
    features,
    recommendedPlan,
    primaryAction: buildPrimaryCommercialAction(session, recommendedPlan)
  }
}

function getRecommendedCommercialTier(
  session: AuthSession,
  domain: WorkbenchDomain,
  selectedPlanId?: SubscriptionTier
) {
  const profile = getDomainProfile(domain)
  const lockedEntryTiers = getCatalogEntries(domain)
    .filter((entry) => !canUseCatalogEntry(session, entry))
    .map((entry) => entry.tier)
  const lockedFeatureTiers = profile.featureIds
    .map(getFeatureGate)
    .filter((gate): gate is FeatureGate => Boolean(gate))
    .filter((gate) => !canUseFeature(session, gate.id))
    .map((gate) => gate.requiredTier)
  const candidates = uniqueTiers([
    selectedPlanId,
    profile.recommendedTier,
    ...lockedEntryTiers,
    ...lockedFeatureTiers,
    session.tier
  ].filter((tier): tier is SubscriptionTier => Boolean(tier)))
    .filter((tier) => hasTierAccess(tier, session.tier))
    .sort((left, right) => tierRank[left] - tierRank[right])

  return candidates.find((tier) => tierRank[tier] > tierRank[session.tier]) ?? session.tier
}

function buildPrimaryCommercialAction(
  session: AuthSession,
  recommendedPlan: BillingPlan
): CommercialAccessAction {
  if (session.status === 'anonymous') {
    return {
      kind: 'sign-in',
      label: `登录后开通${recommendedPlan.name}`,
      endpoint: COMMERCIAL_API_CONTRACT.auth.signInEndpoint,
      targetTier: recommendedPlan.id,
      detail: '真实接入时先完成账号登录，再创建支付会话。'
    }
  }

  if (tierRank[recommendedPlan.id] > tierRank[session.tier]) {
    return {
      kind: 'checkout',
      label: `开通${recommendedPlan.name}`,
      endpoint: COMMERCIAL_API_CONTRACT.billing.checkoutEndpoint,
      targetTier: recommendedPlan.id,
      detail: `创建 ${recommendedPlan.checkoutSku ?? recommendedPlan.id} 的结账会话。`
    }
  }

  return {
    kind: 'billing-portal',
    label: '管理订阅',
    endpoint: COMMERCIAL_API_CONTRACT.billing.portalEndpoint,
    targetTier: session.tier,
    detail: '进入账户中心查看套餐、发票和续费状态。'
  }
}

function uniqueTiers(tiers: SubscriptionTier[]) {
  return tiers.filter((tier, index, source) => source.indexOf(tier) === index)
}
