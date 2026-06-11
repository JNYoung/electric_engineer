import type { DeviceKind } from './types'
import type { KnowledgeTrackId } from './knowledge'

export type MaterialFamily = '常用器件' | '工程工控' | '装修工控'

export interface ComponentMaterialSpec {
  kind: DeviceKind
  family: MaterialFamily
  displayName: string
  levels: KnowledgeTrackId[]
  nominalVoltage: string
  currentRange: string
  keyParameters: string[]
  simulationUse: string
  safetyNotes: string[]
  commonFaults: string[]
  examTags: string[]
}

export interface MaterialCoverageSummary {
  total: number
  highSchool: number
  university: number
  electrician: number
  industrial: number
  renovation: number
}

export interface MaterialFinderOptions {
  query?: string
  family?: MaterialFamily
  level?: KnowledgeTrackId
  limit?: number
}

export interface MaterialFinderResult {
  query: string
  total: number
  filtered: number
  matches: ComponentMaterialSpec[]
  highlightedTags: string[]
  safetyChecklist: string[]
  faultSamples: string[]
}

export const MATERIAL_LIBRARY: ComponentMaterialSpec[] = [
  {
    kind: 'resistor',
    family: '常用器件',
    displayName: '电阻',
    levels: ['high-school', 'university'],
    nominalVoltage: '按功率与阻值折算',
    currentRange: 'mA 到 A 级，取决于阻值',
    keyParameters: ['阻值', '功率', '误差', '温漂'],
    simulationUse: '欧姆定律、电功率和等效电阻训练',
    safetyNotes: ['功率不足会发热', '串并联前先估算电流'],
    commonFaults: ['开路', '阻值漂移', '过热烧毁'],
    examTags: ['欧姆定律', '功率', '等效电阻']
  },
  {
    kind: 'lamp',
    family: '常用器件',
    displayName: '照明灯',
    levels: ['high-school', 'electrician'],
    nominalVoltage: '12V 低压训练',
    currentRange: '0.2A - 2A',
    keyParameters: ['额定电压', '额定功率', '亮度', '极性要求'],
    simulationUse: '并联支路、回线故障和亮度变化训练',
    safetyNotes: ['确认回线完整', '避免过压长时间运行'],
    commonFaults: ['回线断开', '灯丝断路', '接触不良'],
    examTags: ['并联支路', '回线排障', '额定电压']
  },
  {
    kind: 'led',
    family: '常用器件',
    displayName: 'LED 发光二极管',
    levels: ['high-school', 'electrician'],
    nominalVoltage: '约 2V - 3.3V',
    currentRange: '5mA - 20mA',
    keyParameters: ['正向压降', '额定电流', '限流电阻', '极性'],
    simulationUse: '极性、限流和过压诊断训练',
    safetyNotes: ['必须限流', '反接或过压可能损坏'],
    commonFaults: ['反接不亮', '过流烧毁', '虚焊闪烁'],
    examTags: ['二极管', '限流', '过压']
  },
  {
    kind: 'fuse',
    family: '常用器件',
    displayName: '保险丝',
    levels: ['electrician'],
    nominalVoltage: '低压/市电按规格选择',
    currentRange: '0.5A - 10A 常见',
    keyParameters: ['额定电流', '分断能力', '快断/慢断', '安装方式'],
    simulationUse: '短路保护链和安全诊断训练',
    safetyNotes: ['不可用铜丝替代', '更换前必须排除故障源'],
    commonFaults: ['熔断', '接触不良', '选型过大失去保护'],
    examTags: ['短路保护', '安全隔离', '保护选型']
  },
  {
    kind: 'microcontroller',
    family: '常用器件',
    displayName: '控制器模块',
    levels: ['university', 'electrician'],
    nominalVoltage: '5V / 3.3V',
    currentRange: '20mA - 500mA',
    keyParameters: ['供电电压', 'I/O 电平', '输入阻抗', '输出能力'],
    simulationUse: '传感器接口、I/O 供电和额定电压训练',
    safetyNotes: ['确认 I/O 电平兼容', '弱电模块不要直接接大功率负载'],
    commonFaults: ['供电反接', 'I/O 过压', '地线缺失'],
    examTags: ['接口供电', 'I/O', '额定匹配']
  },
  {
    kind: 'plc-controller',
    family: '工程工控',
    displayName: 'PLC 控制器',
    levels: ['electrician', 'university'],
    nominalVoltage: '24V DC 控制侧',
    currentRange: '100mA - 1A',
    keyParameters: ['输入类型', '输出类型', '公共端', '扫描周期'],
    simulationUse: '工控输入输出、联锁和控制核心训练',
    safetyNotes: ['输入公共端需匹配', '输出侧需要隔离大负载'],
    commonFaults: ['公共端接错', '输出点过载', '输入信号悬空'],
    examTags: ['PLC', 'I/O', '联锁']
  },
  {
    kind: 'contactor-coil',
    family: '工程工控',
    displayName: '接触器线圈',
    levels: ['electrician'],
    nominalVoltage: '24V DC / 220V AC 常见',
    currentRange: '50mA - 500mA',
    keyParameters: ['线圈电压', '吸合电流', '辅助触点', '机械寿命'],
    simulationUse: '线圈吸合、互锁和电机控制侧训练',
    safetyNotes: ['线圈电压必须匹配', '控制侧和主回路要区分'],
    commonFaults: ['线圈烧毁', '吸合不稳', '触点粘连'],
    examTags: ['接触器', '线圈', '互锁']
  },
  {
    kind: 'thermal-overload',
    family: '工程工控',
    displayName: '热继电器',
    levels: ['electrician'],
    nominalVoltage: '控制触点按回路选择',
    currentRange: '整定电流按电机额定电流',
    keyParameters: ['整定电流', '复位方式', '辅助触点', '脱扣等级'],
    simulationUse: '过载保护、故障反馈和安全链训练',
    safetyNotes: ['整定值应匹配电机铭牌', '不能替代短路保护'],
    commonFaults: ['误动作', '整定过大', '辅助触点接错'],
    examTags: ['过载保护', '电机', '安全链']
  },
  {
    kind: 'proximity-sensor',
    family: '工程工控',
    displayName: '接近开关',
    levels: ['electrician', 'university'],
    nominalVoltage: '10V - 30V DC 常见',
    currentRange: '10mA - 200mA',
    keyParameters: ['NPN/PNP', '常开/常闭', '检测距离', '响应频率'],
    simulationUse: '现场检测、计数和到位反馈训练',
    safetyNotes: ['NPN/PNP 接线不能混用', '屏蔽干扰和机械距离要留裕量'],
    commonFaults: ['类型接错', '距离不足', '干扰误触发'],
    examTags: ['传感器', 'NPN/PNP', '到位检测']
  },
  {
    kind: 'vfd-drive',
    family: '工程工控',
    displayName: '变频器控制侧',
    levels: ['electrician'],
    nominalVoltage: '控制端 10V/24V，主回路按铭牌',
    currentRange: '控制端 mA 级',
    keyParameters: ['启停端子', '模拟量', '频率给定', '故障继电器'],
    simulationUse: '风机水泵启停、频率给定和故障反馈训练',
    safetyNotes: ['主回路危险电压需隔离', '控制端不能直接接强电'],
    commonFaults: ['端子参数不匹配', '公共端接错', '故障未复位'],
    examTags: ['变频器', '启停', '模拟量']
  },
  {
    kind: 'smart-gateway',
    family: '装修工控',
    displayName: '智能网关',
    levels: ['electrician'],
    nominalVoltage: '5V / 12V / 24V 按产品',
    currentRange: '100mA - 2A',
    keyParameters: ['通信协议', '供电方式', '总线接口', '场景联动'],
    simulationUse: '装修弱电中枢、总线和联动训练',
    safetyNotes: ['弱电与强电隔离', '总线极性和屏蔽要正确'],
    commonFaults: ['供电不足', '总线接反', '地址冲突'],
    examTags: ['智能化', '网关', '总线']
  },
  {
    kind: 'smart-switch-panel',
    family: '装修工控',
    displayName: '智能开关面板',
    levels: ['electrician', 'high-school'],
    nominalVoltage: '12V/24V 控制侧或按产品',
    currentRange: '10mA - 200mA',
    keyParameters: ['按键通道', '通信方式', '背光电流', '场景模式'],
    simulationUse: '照明场景、按钮输入和状态指示训练',
    safetyNotes: ['控制线和负载线区分', '面板供电极性要匹配'],
    commonFaults: ['按键无反馈', '通信失败', '背光不亮'],
    examTags: ['智能面板', '照明场景', '输入']
  },
  {
    kind: 'leak-detector',
    family: '装修工控',
    displayName: '漏水检测器',
    levels: ['electrician'],
    nominalVoltage: '5V - 24V',
    currentRange: '5mA - 100mA',
    keyParameters: ['探头类型', '报警触点', '防水等级', '安装位置'],
    simulationUse: '安防传感、报警联动和低压供电训练',
    safetyNotes: ['潮湿区域注意绝缘', '报警回路应留测试点'],
    commonFaults: ['探头污染', '误报警', '回线断开'],
    examTags: ['安防传感', '报警', '回线']
  },
  {
    kind: 'floor-heating-thermostat',
    family: '装修工控',
    displayName: '地暖温控器',
    levels: ['electrician'],
    nominalVoltage: '12V/24V 控制侧或市电执行侧',
    currentRange: '控制侧 mA 级，执行侧按阀门',
    keyParameters: ['温度探头', '继电器输出', '阀门联动', '限温保护'],
    simulationUse: '暖通控制、阀门联动和舒适执行训练',
    safetyNotes: ['探头线避免强电干扰', '执行侧负载需按容量选型'],
    commonFaults: ['探头开路', '继电器不吸合', '阀门无动作'],
    examTags: ['暖通', '温控', '执行器']
  }
]

export function getMaterialSpec(kind: DeviceKind) {
  return MATERIAL_LIBRARY.find((item) => item.kind === kind)
}

export function getMaterialSpecsByLevel(level: KnowledgeTrackId) {
  return MATERIAL_LIBRARY.filter((item) => item.levels.includes(level))
}

export function getMaterialSpecsByFamily(family: MaterialFamily) {
  return MATERIAL_LIBRARY.filter((item) => item.family === family)
}

export function getMaterialCoverageSummary(): MaterialCoverageSummary {
  return {
    total: MATERIAL_LIBRARY.length,
    highSchool: getMaterialSpecsByLevel('high-school').length,
    university: getMaterialSpecsByLevel('university').length,
    electrician: getMaterialSpecsByLevel('electrician').length,
    industrial: getMaterialSpecsByFamily('工程工控').length,
    renovation: getMaterialSpecsByFamily('装修工控').length
  }
}

export function searchMaterialSpecs(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return MATERIAL_LIBRARY

  return MATERIAL_LIBRARY.filter((item) => materialMatchesQuery(item, normalized))
}

export function buildMaterialFinder(options: MaterialFinderOptions = {}): MaterialFinderResult {
  const query = options.query?.trim() ?? ''
  const normalized = query.toLowerCase()
  const limit = options.limit ?? 6
  const candidates = MATERIAL_LIBRARY.filter((item) =>
    (!options.family || item.family === options.family) &&
    (!options.level || item.levels.includes(options.level))
  )
  const matches = normalized
    ? candidates.filter((item) => materialMatchesQuery(item, normalized))
    : candidates
  const visibleMatches = matches.slice(0, limit)

  return {
    query,
    total: candidates.length,
    filtered: matches.length,
    matches: visibleMatches,
    highlightedTags: uniqueMaterialValues(visibleMatches.flatMap((item) => item.examTags)).slice(0, 8),
    safetyChecklist: uniqueMaterialValues(visibleMatches.flatMap((item) => item.safetyNotes)).slice(0, 5),
    faultSamples: uniqueMaterialValues(visibleMatches.flatMap((item) => item.commonFaults)).slice(0, 5)
  }
}

function materialMatchesQuery(item: ComponentMaterialSpec, normalizedQuery: string) {
  return materialSearchText(item).includes(normalizedQuery)
}

function materialSearchText(item: ComponentMaterialSpec) {
  return [
    item.displayName,
    item.family,
    item.nominalVoltage,
    item.currentRange,
    item.simulationUse,
    ...item.keyParameters,
    ...item.safetyNotes,
    ...item.commonFaults,
    ...item.examTags
  ]
    .join(' ')
    .toLowerCase()
}

function uniqueMaterialValues(items: string[]) {
  return items.filter((item, index, source) => source.indexOf(item) === index)
}
