import type { DeviceKind } from './types'
import type { KnowledgeTrackId } from './knowledge'

export type MaterialFamily = '常用器件' | '工程工控' | '装修工控'

export type MaterialTrainingKitId =
  | 'high-school-parallel-kit'
  | 'university-interface-kit'
  | 'electrician-control-kit'
  | 'renovation-smart-home-kit'

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

export interface MaterialTrainingKit {
  id: MaterialTrainingKitId
  level: KnowledgeTrackId
  family: MaterialFamily
  title: string
  scenario: string
  objective: string
  componentKinds: DeviceKind[]
  estimatedMinutes: number
  assessmentTags: string[]
}

export interface MaterialTrainingKitOptions {
  family?: MaterialFamily
  level?: KnowledgeTrackId
  limit?: number
}

export interface MaterialTrainingKitPlan {
  id: MaterialTrainingKitId
  level: KnowledgeTrackId
  family: MaterialFamily
  title: string
  scenario: string
  objective: string
  estimatedMinutes: number
  components: ComponentMaterialSpec[]
  componentCount: number
  examTags: string[]
  safetyChecklist: string[]
  faultSamples: string[]
  readiness: '素材齐备' | '需补素材'
  missingKinds: DeviceKind[]
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
    kind: 'emergency-stop',
    family: '工程工控',
    displayName: '急停按钮',
    levels: ['electrician'],
    nominalVoltage: '控制侧 24V DC / 220V AC 常见',
    currentRange: '触点按控制回路电流选型',
    keyParameters: ['常闭触点', '自锁结构', '复位方式', '安全回路'],
    simulationUse: '急停串联、断电保持和安全联锁训练',
    safetyNotes: ['急停应串入安全链', '复位前必须确认危险源解除'],
    commonFaults: ['触点粘连', '常闭接错', '复位机构卡滞'],
    examTags: ['急停', '安全链', '联锁']
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
    kind: 'stack-light',
    family: '工程工控',
    displayName: '三色报警灯',
    levels: ['electrician'],
    nominalVoltage: '24V DC 常见',
    currentRange: '每层 20mA - 200mA',
    keyParameters: ['灯层颜色', '蜂鸣器', '公共端', '闪烁模式'],
    simulationUse: '设备状态、故障报警和 PLC 输出点训练',
    safetyNotes: ['输出点电流需留裕量', '蜂鸣器回路应可独立测试'],
    commonFaults: ['公共端接错', '灯层不亮', '报警逻辑反向'],
    examTags: ['报警', 'PLC 输出', '状态指示']
  },
  {
    kind: 'solenoid-valve',
    family: '工程工控',
    displayName: '电磁阀',
    levels: ['electrician', 'university'],
    nominalVoltage: '24V DC / 220V AC 按阀体铭牌',
    currentRange: '100mA - 1A 常见',
    keyParameters: ['线圈电压', '阀位类型', '保持电流', '浪涌抑制'],
    simulationUse: '执行器驱动、续流保护和动作反馈训练',
    safetyNotes: ['线圈电压必须匹配', '感性负载应配置吸收或续流保护'],
    commonFaults: ['线圈开路', '阀芯卡滞', '驱动触点烧蚀'],
    examTags: ['执行器', '感性负载', '续流保护']
  },
  {
    kind: 'pressure-transmitter',
    family: '工程工控',
    displayName: '压力变送器',
    levels: ['university', 'electrician'],
    nominalVoltage: '12V - 30V DC',
    currentRange: '4mA - 20mA 或电压输出',
    keyParameters: ['量程', '输出信号', '二线/三线制', '零点校准'],
    simulationUse: '模拟量采集、线性换算和断线诊断训练',
    safetyNotes: ['屏蔽线单端接地', '供电和信号公共端需按手册接线'],
    commonFaults: ['零点漂移', '信号断线', '量程设置错误'],
    examTags: ['模拟量', '4-20mA', '线性换算']
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
    kind: 'dimmer-module',
    family: '装修工控',
    displayName: '调光模块',
    levels: ['high-school', 'electrician'],
    nominalVoltage: '12V/24V 灯带或市电调光按产品',
    currentRange: '通道电流按灯带功率选型',
    keyParameters: ['PWM 频率', '通道数', '最大功率', '负载类型'],
    simulationUse: '照明功率、占空比和弱电控制训练',
    safetyNotes: ['通道负载不能超额定功率', '市电调光需区分火线和负载线'],
    commonFaults: ['闪烁', '过载保护', '灯带极性接反'],
    examTags: ['调光', 'PWM', '照明功率']
  },
  {
    kind: 'curtain-motor',
    family: '装修工控',
    displayName: '窗帘电机',
    levels: ['electrician'],
    nominalVoltage: '24V DC 或 220V AC',
    currentRange: '0.5A - 3A 常见',
    keyParameters: ['正反转', '行程限位', '堵转保护', '控制协议'],
    simulationUse: '正反转互锁、限位保护和场景联动训练',
    safetyNotes: ['正反转不可同时得电', '行程调试前先空载试运行'],
    commonFaults: ['限位失效', '堵转过流', '方向接反'],
    examTags: ['正反转', '限位', '场景联动']
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
  },
  {
    kind: 'scene-panel',
    family: '装修工控',
    displayName: '场景面板',
    levels: ['electrician'],
    nominalVoltage: '12V/24V 控制侧或总线供电',
    currentRange: '10mA - 150mA',
    keyParameters: ['场景键', '状态反馈', '总线地址', '长按逻辑'],
    simulationUse: '多回路场景、联动触发和状态反馈训练',
    safetyNotes: ['总线地址避免冲突', '调试时保留手动旁路控制'],
    commonFaults: ['场景未绑定', '地址重复', '反馈状态不同步'],
    examTags: ['场景联动', '总线地址', '状态反馈']
  },
  {
    kind: 'access-control',
    family: '装修工控',
    displayName: '门禁控制器',
    levels: ['electrician'],
    nominalVoltage: '12V DC 常见',
    currentRange: '控制器 100mA - 1A，锁具另算',
    keyParameters: ['门磁输入', '锁输出', '出门按钮', '消防联动'],
    simulationUse: '安防门禁、回线检测和联动释放训练',
    safetyNotes: ['消防释放优先级必须保留', '锁具供电应单独核算容量'],
    commonFaults: ['门磁常开常闭接错', '锁输出过载', '出门按钮回线断开'],
    examTags: ['门禁', '安防联动', '回线检测']
  }
]

export const MATERIAL_TRAINING_KITS: MaterialTrainingKit[] = [
  {
    id: 'high-school-parallel-kit',
    level: 'high-school',
    family: '常用器件',
    title: '高中并联测量包',
    scenario: '12V 照明灯、电阻和 LED 组成低压并联支路，观察电压、电流和功率变化。',
    objective: '用常用器件完成欧姆定律、并联电压和电功率验证。',
    componentKinds: ['lamp', 'resistor', 'led'],
    estimatedMinutes: 18,
    assessmentTags: ['欧姆定律', '并联支路', '功率']
  },
  {
    id: 'university-interface-kit',
    level: 'university',
    family: '工程工控',
    title: '大学接口与模拟量包',
    scenario: '控制器模块、PLC、接近开关和压力变送器组成接口供电与信号采集训练回路。',
    objective: '把 KCL、电源公共端、模拟量线性换算映射到真实工控接口。',
    componentKinds: ['microcontroller', 'plc-controller', 'proximity-sensor', 'pressure-transmitter', 'resistor'],
    estimatedMinutes: 28,
    assessmentTags: ['KCL', '接口供电', '模拟量']
  },
  {
    id: 'electrician-control-kit',
    level: 'electrician',
    family: '工程工控',
    title: '电工低压控制排障包',
    scenario: '急停、保险丝、接触器、热继电器、传感器、电磁阀和三色灯组成一套低压控制工位。',
    objective: '训练安全隔离、保护链、执行器驱动和现场故障回线排查。',
    componentKinds: [
      'emergency-stop',
      'fuse',
      'contactor-coil',
      'thermal-overload',
      'proximity-sensor',
      'solenoid-valve',
      'stack-light'
    ],
    estimatedMinutes: 36,
    assessmentTags: ['安全隔离', '保护链', '执行器']
  },
  {
    id: 'renovation-smart-home-kit',
    level: 'electrician',
    family: '装修工控',
    title: '装修智能联动包',
    scenario: '网关、智能面板、调光模块、窗帘电机、漏水检测、地暖温控和门禁组成住宅弱电联动工位。',
    objective: '训练强弱电隔离、总线地址、场景联动、报警与暖通执行的综合排查。',
    componentKinds: [
      'smart-gateway',
      'smart-switch-panel',
      'dimmer-module',
      'curtain-motor',
      'leak-detector',
      'floor-heating-thermostat',
      'scene-panel',
      'access-control'
    ],
    estimatedMinutes: 34,
    assessmentTags: ['智能化', '场景联动', '安防联动']
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

export function getMaterialTrainingKit(kitId: MaterialTrainingKitId) {
  const kit = MATERIAL_TRAINING_KITS.find((item) => item.id === kitId)
  return kit ? buildMaterialTrainingKitPlan(kit) : undefined
}

export function getMaterialTrainingKits(options: MaterialTrainingKitOptions = {}) {
  const kits = MATERIAL_TRAINING_KITS.filter((kit) =>
    (!options.family || kit.family === options.family) &&
    (!options.level || kit.level === options.level)
  )
  const visibleKits = options.limit ? kits.slice(0, options.limit) : kits

  return visibleKits.map(buildMaterialTrainingKitPlan)
}

function buildMaterialTrainingKitPlan(kit: MaterialTrainingKit): MaterialTrainingKitPlan {
  const components = kit.componentKinds
    .map((kind) => getMaterialSpec(kind))
    .filter((item): item is ComponentMaterialSpec => Boolean(item))
  const coveredKinds = new Set(components.map((item) => item.kind))
  const missingKinds = kit.componentKinds.filter((kind) => !coveredKinds.has(kind))

  return {
    id: kit.id,
    level: kit.level,
    family: kit.family,
    title: kit.title,
    scenario: kit.scenario,
    objective: kit.objective,
    estimatedMinutes: kit.estimatedMinutes,
    components,
    componentCount: components.length,
    examTags: uniqueMaterialValues([...kit.assessmentTags, ...components.flatMap((item) => item.examTags)]).slice(0, 8),
    safetyChecklist: uniqueMaterialValues(components.flatMap((item) => item.safetyNotes)).slice(0, 6),
    faultSamples: uniqueMaterialValues(components.flatMap((item) => item.commonFaults)).slice(0, 6),
    readiness: missingKinds.length === 0 ? '素材齐备' : '需补素材',
    missingKinds
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
