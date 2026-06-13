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
  careerUse?: string
  connectionGuide?: string[]
  certificationFocus?: string[]
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
    careerUse: '用于快速复盘取证题里的电流、电压、功率估算，也是现场判断负载是否超额定的基础。',
    connectionGuide: ['先确认阻值和功率', '串联用于限流', '并联用于分流或等效负载验证'],
    certificationFocus: ['会用 I=U/R 估算电流', '会判断功率余量是否足够'],
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
    careerUse: '适合练习“有电但不亮”的现场排查，迁移到指示灯、灯带和控制柜状态灯。',
    connectionGuide: ['一端接受控正极', '另一端必须回到负极或公共端', '并联支路之间不要共用错误回线'],
    certificationFocus: ['能区分开关前后电压', '能定位回线断开和接触不良'],
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
    careerUse: '用于理解状态指示、模块输入反馈和低压面板指示灯，帮助判断“亮/不亮”背后的电气原因。',
    connectionGuide: ['确认阳极和阴极', '串联合适限流电阻', '不要直接跨接 12V/24V 电源'],
    certificationFocus: ['能判断极性方向', '能解释为什么需要限流'],
    safetyNotes: ['必须限流', '反接或过压可能损坏'],
    commonFaults: ['反接不亮', '过流烧毁', '虚焊闪烁'],
    examTags: ['二极管', '限流', '过压']
  },
  {
    kind: 'fuse',
    family: '常用器件',
    displayName: '熔断器',
    levels: ['electrician'],
    nominalVoltage: '1P/2P/3P/4P 按回路电压选择',
    currentRange: '0.5A - 10A 常见',
    keyParameters: ['额定电流', '分断能力', '快断/慢断', '安装方式'],
    simulationUse: '短路保护链和安全诊断训练',
    careerUse: '电工证和现场维修都高频考查保护选型，能帮助解释为什么不能随意加大保险规格。',
    connectionGuide: ['串入被保护回路', '额定电流按负载和导线能力选择', '熔断后先找故障源再更换'],
    certificationFocus: ['取证保护选型', '短路和过载保护边界', '分断能力和额定电流', '禁止铜丝替代保险丝'],
    safetyNotes: ['不可用铜丝替代', '更换前必须排除故障源'],
    commonFaults: ['熔断', '接触不良', '选型过大失去保护'],
    examTags: ['短路保护', '安全隔离', '保护选型']
  },
  {
    kind: 'circuit-breaker',
    family: '工程工控',
    displayName: '断路器',
    levels: ['electrician'],
    nominalVoltage: '1P/2P/3P/4P，220V/380V 按回路选择',
    currentRange: '6A - 63A 常见',
    keyParameters: ['极数', '额定电流', '脱扣曲线', '分断能力'],
    simulationUse: '总电源隔离、短路保护和安全链训练',
    careerUse: '控制柜、照明配电和动力回路都会使用，是现场上电前必须识别的保护器件。',
    connectionGuide: ['串入被保护回路前端', '按单相/三相/中性线选择极数', '下级负载和导线截面要匹配额定电流'],
    certificationFocus: ['1P/2P/3P/4P 区分', '短路与过载保护', '上电隔离和验电顺序'],
    safetyNotes: ['不可代替漏电保护', '跳闸后先排故再合闸'],
    commonFaults: ['频繁跳闸', '接线端发热', '极数选错'],
    examTags: ['断路器', '极数', '短路保护']
  },
  {
    kind: 'ac-contactor',
    family: '工程工控',
    displayName: '交流接触器',
    levels: ['electrician'],
    nominalVoltage: '线圈 220V/380V 常见',
    currentRange: '主触点按负载电流选型',
    keyParameters: ['线圈电压', '主触点容量', '辅助触点', '使用类别'],
    simulationUse: '交流线圈吸合、电机启停和互锁训练',
    careerUse: '电机、风机、水泵和加热设备控制柜的核心执行元件。',
    connectionGuide: ['线圈接控制回路', '主触点接动力回路', '辅助触点用于自锁和互锁'],
    certificationFocus: ['线圈/主触点/辅助触点区分', '自锁回路', '接触器吸合故障定位'],
    safetyNotes: ['线圈电压必须匹配', '动力侧操作前断电验电'],
    commonFaults: ['线圈烧毁', '触点粘连', '吸合抖动'],
    examTags: ['交流接触器', '自锁', '电机控制']
  },
  {
    kind: 'dc-contactor',
    family: '工程工控',
    displayName: '直流接触器',
    levels: ['electrician'],
    nominalVoltage: '24V DC 控制线圈',
    currentRange: '按主触点负载选择',
    keyParameters: ['线圈电压', '灭弧能力', '触点容量', '极性'],
    simulationUse: '24V 控制侧吸合和 PLC 输出联动训练',
    careerUse: '常用于低压控制柜、电池系统和 PLC 输出隔离场景。',
    connectionGuide: ['确认线圈正负极', '输出侧按负载电流选型', '与 PLC 输出点之间确认驱动能力'],
    certificationFocus: ['24V 控制回路', '极性识别', '输出隔离'],
    safetyNotes: ['直流开断要关注灭弧能力', '不要用 AC 触点规格直接替代 DC 开断场景'],
    commonFaults: ['极性接反', '线圈不吸合', '触点烧蚀'],
    examTags: ['直流接触器', '24V', 'PLC 输出']
  },
  {
    kind: 'auxiliary-contact',
    family: '工程工控',
    displayName: '接触器辅助触头',
    levels: ['electrician'],
    nominalVoltage: '按控制回路选择',
    currentRange: '小电流信号触点',
    keyParameters: ['常开/常闭', '触点容量', '安装方式', '机械联动'],
    simulationUse: '自锁、互锁和反馈触点训练',
    careerUse: '判断控制柜是否能稳定自保持、互锁和反馈的关键器件。',
    connectionGuide: ['常开触点常用于自锁', '常闭触点常用于互锁或保护链', '不要把辅助触点当主触点带大负载'],
    certificationFocus: ['NO/NC 识别', '自锁互锁', '反馈触点排障'],
    safetyNotes: ['辅助触点容量有限', '接线前确认触点状态'],
    commonFaults: ['触点接反', '触点氧化', '机械联动失效'],
    examTags: ['辅助触点', '自锁', '互锁']
  },
  {
    kind: 'switching-power-supply',
    family: '工程工控',
    displayName: '开关电源',
    levels: ['electrician', 'university'],
    nominalVoltage: 'AC 输入，24V DC 输出常见',
    currentRange: '1A - 20A 常见',
    keyParameters: ['输入范围', '输出电压', '额定功率', '纹波'],
    simulationUse: '控制电源、公共端和传感器供电训练',
    careerUse: '控制柜和弱电箱常见故障源，能训练从 AC 输入到 24V 输出的供电链路排查。',
    connectionGuide: ['AC 输入端接 L/N 或三相输入', 'DC 输出分清 +V/-V', '负载总电流不能超过额定输出'],
    certificationFocus: ['AC/DC 端子区分', '24V 公共端', '容量估算'],
    safetyNotes: ['输入侧带市电危险', '输出并联前确认型号支持'],
    commonFaults: ['无输出', '过载保护', '输出纹波大'],
    examTags: ['开关电源', '24V', '公共端']
  },
  {
    kind: 'self-reset-button',
    family: '工程工控',
    displayName: '自复位按钮',
    levels: ['electrician'],
    nominalVoltage: '按控制回路选择，24V/220V 常见',
    currentRange: '小电流控制触点',
    keyParameters: ['颜色', '常开/常闭', '瞬时动作', '触点容量'],
    simulationUse: '启动、停止、复位和点动输入训练',
    careerUse: '控制柜面板最常见输入件，适合训练按钮颜色、触点状态和控制逻辑。',
    connectionGuide: ['启动常用常开触点', '停止常用常闭触点', '颜色按现场标识规范使用'],
    certificationFocus: ['NO/NC 区分', '启动停止回路', '点动与自锁区别'],
    safetyNotes: ['停止和急停不可混用', '触点容量不能带大负载'],
    commonFaults: ['触点卡滞', '线号接错', '按钮帽颜色误导'],
    examTags: ['按钮', '点动', 'NO/NC']
  },
  {
    kind: 'self-lock-button',
    family: '工程工控',
    displayName: '自锁按钮',
    levels: ['electrician'],
    nominalVoltage: '按控制回路选择',
    currentRange: '小电流控制触点',
    keyParameters: ['保持动作', '常开/常闭', '颜色', '机械锁定'],
    simulationUse: '保持式输入和误操作诊断训练',
    careerUse: '适合训练保持状态导致的启停异常、设备模式保持和现场复位。',
    connectionGuide: ['按下后维持触点状态', '需要人工再次动作复位', '与自锁回路逻辑区分'],
    certificationFocus: ['机械自锁与电气自锁区别', '保持输入排查'],
    safetyNotes: ['安全停机不要依赖普通自锁按钮', '检修前确认触点实际状态'],
    commonFaults: ['保持机构卡滞', '误保持', '触点接触不良'],
    examTags: ['自锁按钮', '保持', '输入状态']
  },
  {
    kind: 'rotary-switch',
    family: '工程工控',
    displayName: '旋转开关',
    levels: ['electrician'],
    nominalVoltage: '按控制回路选择',
    currentRange: '小电流控制触点',
    keyParameters: ['两位/三位', '保持/复位', '触点组合', '角度'],
    simulationUse: '手自动、正反转和模式选择训练',
    careerUse: '设备调试、维修和运行模式切换高频使用。',
    connectionGuide: ['先确认档位触点表', '多触点组合要按逻辑接线', '模式切换前确认设备安全状态'],
    certificationFocus: ['档位和触点对应', '手自动回路', '正反转互锁'],
    safetyNotes: ['避免带故障切换模式', '触点容量不用于直接带负载'],
    commonFaults: ['档位错位', '触点表读错', '接线松动'],
    examTags: ['旋钮', '模式选择', '手自动']
  },
  {
    kind: 'pilot-light',
    family: '工程工控',
    displayName: '指示灯',
    levels: ['electrician'],
    nominalVoltage: '24V/220V 按规格选择',
    currentRange: 'mA 级',
    keyParameters: ['颜色', '额定电压', '亮度', '安装孔径'],
    simulationUse: '运行、故障、电源状态显示训练',
    careerUse: '控制柜排障时先看指示灯状态，适合训练“有指示但设备不动”的分层排查。',
    connectionGuide: ['并接到被指示回路两端', '颜色按运行/停止/故障约定', '额定电压必须匹配'],
    certificationFocus: ['指示回路', '额定电压', '状态判断'],
    safetyNotes: ['不能用指示灯代替验电', '过压会损坏灯珠'],
    commonFaults: ['灯珠损坏', '电压不匹配', '公共端断开'],
    examTags: ['指示灯', '状态', '额定电压']
  },
  {
    kind: 'ac-time-relay',
    family: '工程工控',
    displayName: '交流时间继电器',
    levels: ['electrician'],
    nominalVoltage: '220V/380V 交流线圈',
    currentRange: '小电流控制触点',
    keyParameters: ['通电延时', '断电延时', '线圈电压', '触点组数'],
    simulationUse: '顺序启动、延时停机和保护联锁训练',
    careerUse: '用于水泵、风机、星三角和顺序控制排障，能训练时间逻辑与触点状态判断。',
    connectionGuide: ['线圈接控制电源', '延时触点串入控制逻辑', '先读功能模式再接线'],
    certificationFocus: ['延时触点状态', '线圈电压匹配', '顺序控制'],
    safetyNotes: ['延时触点不可直接带大负载', '维修时确认残余动作状态'],
    commonFaults: ['时间设定错误', '触点不动作', '线圈电压不匹配'],
    examTags: ['时间继电器', '延时', '顺序控制']
  },
  {
    kind: 'dc-time-relay',
    family: '工程工控',
    displayName: '直流时间继电器',
    levels: ['electrician'],
    nominalVoltage: '24V DC',
    currentRange: '小电流控制触点',
    keyParameters: ['延时范围', '24V 线圈', '触点形式', '复位方式'],
    simulationUse: 'PLC 辅助延时和 24V 控制回路训练',
    careerUse: '适合训练低压控制柜里延时、保护和联锁逻辑的排查。',
    connectionGuide: ['确认正负极', '延时输出触点按 NO/NC 接入', '与 PLC 输出容量匹配'],
    certificationFocus: ['24V 延时回路', '延时触点识别', '公共端匹配'],
    safetyNotes: ['直流极性不能接反', '触点容量不要超限'],
    commonFaults: ['极性接反', '延时不准', '输出触点接错'],
    examTags: ['直流时间继电器', '24V', '延时']
  },
  {
    kind: 'ac-intermediate-relay',
    family: '工程工控',
    displayName: '交流中间继电器',
    levels: ['electrician'],
    nominalVoltage: '220V/380V 交流线圈',
    currentRange: '触点按控制负载选择',
    keyParameters: ['线圈电压', '触点组数', '触点容量', '底座端子'],
    simulationUse: '触点扩展、信号隔离和交流控制训练',
    careerUse: '当控制逻辑触点不够或需要隔离时常用，排障重点是线圈与触点分离。',
    connectionGuide: ['线圈接控制电源', '触点接被控制信号', '按底座编号核对公共端'],
    certificationFocus: ['线圈触点分离', '触点扩展', '底座编号'],
    safetyNotes: ['线圈电压匹配', '触点容量有限'],
    commonFaults: ['底座接错', '线圈烧毁', '触点氧化'],
    examTags: ['中间继电器', '触点扩展', '隔离']
  },
  {
    kind: 'dc-intermediate-relay',
    family: '工程工控',
    displayName: '直流中间继电器',
    levels: ['electrician'],
    nominalVoltage: '24V DC',
    currentRange: '触点按控制负载选择',
    keyParameters: ['24V 线圈', '触点组数', '底座端子', '指示灯'],
    simulationUse: 'PLC 输出隔离、信号转接和触点扩展训练',
    careerUse: 'PLC 控制柜中高频出现，适合训练输出点保护和公共端排查。',
    connectionGuide: ['线圈由 PLC 或按钮回路驱动', '触点隔离外部负载', '按端子编号核对 COM/NO/NC'],
    certificationFocus: ['24V 继电器', 'PLC 隔离', '触点编号'],
    safetyNotes: ['不要让 PLC 输出直接带大负载', '线圈需并联浪涌保护时按规格处理'],
    commonFaults: ['线圈不吸合', '输出触点粘连', '公共端接错'],
    examTags: ['中间继电器', '24V', 'PLC 输出']
  },
  {
    kind: 'voltmeter',
    family: '工程工控',
    displayName: '电压表',
    levels: ['electrician'],
    nominalVoltage: '按量程选择，AC/DC 分型',
    currentRange: '高阻输入，电流极小',
    keyParameters: ['量程', 'AC/DC', '精度', '供电方式'],
    simulationUse: '面板电压读数和测点判断训练',
    careerUse: '帮助把虚拟万用表训练迁移到控制柜面板仪表和固定测点。',
    connectionGuide: ['并联在被测回路两端', '确认 AC/DC 和量程', '独立供电仪表需接供电端'],
    certificationFocus: ['并联测电压', '量程选择', 'AC/DC 区分'],
    safetyNotes: ['量程不符会损坏仪表', '不能串联进负载回路'],
    commonFaults: ['量程错', '公共端断开', '仪表供电缺失'],
    examTags: ['电压表', '并联', '量程']
  },
  {
    kind: 'ammeter',
    family: '工程工控',
    displayName: '电流表',
    levels: ['electrician'],
    nominalVoltage: '按表头和互感器/分流器选择',
    currentRange: 'mA 到 A 级，取决于量程',
    keyParameters: ['量程', '互感器倍率', '分流器', 'AC/DC'],
    simulationUse: '支路电流读数和过载判断训练',
    careerUse: '控制柜和设备面板常用，重点训练串联测流、互感器倍率和读数换算。',
    connectionGuide: ['直接电流表串联接入', '大电流经互感器或分流器', '确认极性和倍率'],
    certificationFocus: ['串联测电流', '倍率换算', '过载判断'],
    safetyNotes: ['不能并联到电源两端', '量程不足会烧表'],
    commonFaults: ['接法错误', '倍率设置错', '表头无供电'],
    examTags: ['电流表', '串联', '倍率']
  },
  {
    kind: 'gray-terminal',
    family: '工程工控',
    displayName: '灰色端子',
    levels: ['electrician'],
    nominalVoltage: '按端子额定绝缘电压选择',
    currentRange: '按端子截面积和电流等级选择',
    keyParameters: ['颜色', '截面积', '额定电流', '端子编号'],
    simulationUse: '控制柜配线、线号和中转端子训练',
    careerUse: '现场查线、改线和排障都依赖端子排识读，是控制柜基础能力。',
    connectionGuide: ['按图纸端子号接线', '同一端子两侧对应同一节点', '线径和端子规格匹配'],
    certificationFocus: ['端子编号', '线号识读', '配线规范'],
    safetyNotes: ['压接不牢会发热', '不要混淆保护地端子'],
    commonFaults: ['线号错', '端子松动', '跨接片遗漏'],
    examTags: ['端子', '配线', '线号']
  },
  {
    kind: 'pe-terminal',
    family: '工程工控',
    displayName: '黄绿色端子',
    levels: ['electrician'],
    nominalVoltage: '保护接地端子',
    currentRange: '按保护导体截面积选择',
    keyParameters: ['PE 标识', '黄绿色', '接地连续性', '导轨连接'],
    simulationUse: '保护接地、安全隔离和 PE 识别训练',
    careerUse: '接地错误是上架和现场验收高风险项，必须单独训练识别。',
    connectionGuide: ['连接保护地导体', '确认与机柜/导轨接地连续', '不能当普通信号端子使用'],
    certificationFocus: ['PE 颜色识别', '接地连续性', '安全保护'],
    safetyNotes: ['保护地不可断开', '禁止把工作零线和保护地随意混用'],
    commonFaults: ['接地遗漏', '端子未压紧', 'PE/N 混接'],
    examTags: ['PE', '接地', '安全']
  },
  {
    kind: 'three-phase-motor',
    family: '工程工控',
    displayName: '三相异步电动机',
    levels: ['electrician'],
    nominalVoltage: '380V 三相常见',
    currentRange: '按电机功率和铭牌电流',
    keyParameters: ['额定电压', '额定电流', '接法', '功率因数'],
    simulationUse: '三相负载、接触器和热继保护链训练',
    careerUse: '风机、水泵、输送线等岗位高频设备，取证实操常考启停与过载保护。',
    connectionGuide: ['按铭牌选择星/三角接法', '主回路经断路器、接触器和热继', '控制侧与动力侧分开排查'],
    certificationFocus: ['三相电机铭牌', '热继整定', '正反转互锁'],
    safetyNotes: ['动力侧必须断电验电', '缺相运行会损坏电机'],
    commonFaults: ['缺相', '过载', '接触器触点烧蚀'],
    examTags: ['三相电机', '热继', '接触器']
  },
  {
    kind: 'heating-tube',
    family: '工程工控',
    displayName: '加热管',
    levels: ['electrician'],
    nominalVoltage: '220V/380V 按规格选择',
    currentRange: '按功率计算 I=P/U',
    keyParameters: ['额定功率', '额定电压', '绝缘电阻', '温控方式'],
    simulationUse: '阻性负载、功率估算和温控回路训练',
    careerUse: '设备加热、烘箱和水加热控制常见，能训练功率、电流和保护选型。',
    connectionGuide: ['按额定电压接入', '经接触器或固态继电器控制', '配合温控和过温保护'],
    certificationFocus: ['P=UI 估算', '阻性负载', '温控保护'],
    safetyNotes: ['干烧危险', '绝缘下降会漏电'],
    commonFaults: ['开路不热', '漏电跳闸', '过温保护动作'],
    examTags: ['加热管', '功率', '温控']
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
    careerUse: '对应门禁、报警、智能面板和小型控制盒调试，重点训练供电公共端和输入输出边界。',
    connectionGuide: ['先接稳定供电和公共地', '输入接传感器信号', '输出大负载时必须经过继电器或驱动级'],
    certificationFocus: ['公共端必须一致', '弱电 I/O 不能直接带大负载', '3.3V/5V/24V 电平要匹配'],
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
    careerUse: '面向电工证实操、设备维护和工控岗位面试，核心是会读 PLC 输入输出点和公共端接法。',
    connectionGuide: ['输入侧接按钮、急停或传感器', '输出侧通过继电器/接触器驱动负载', '公共端 COM 要与输入/输出类型匹配'],
    certificationFocus: ['源型/漏型输入输出', 'I/O 点位和公共端', '联锁逻辑和故障点定位'],
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
    careerUse: '常见于电机启停、风机水泵和控制柜维修，是从弱电控制过渡到强电执行的关键元件。',
    connectionGuide: ['线圈接控制回路', '主触点接动力回路', '辅助触点用于自锁、互锁和状态反馈'],
    certificationFocus: ['线圈和主触点要分清', '自锁/互锁回路', '吸合不稳的电压和触点原因'],
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
    careerUse: '电机保护和控制柜维护高频场景，能体现是否理解“过载保护不是短路保护”。',
    connectionGuide: ['主回路按电机电流整定', '常闭辅助触点串入控制回路', '动作后先查负载再复位'],
    certificationFocus: ['整定电流按铭牌', '常闭触点串联保护链', '过载与短路保护区别'],
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
    careerUse: '电工证和设备维修都要求优先理解急停链，关系到现场安全和面试中的安全意识。',
    connectionGuide: ['使用常闭触点串入安全链', '动作后切断控制许可', '复位前确认危险源解除'],
    certificationFocus: ['常闭而不是常开', '急停串联安全链', '先安全隔离再复位'],
    safetyNotes: ['急停应串入安全链', '复位前必须确认危险源解除'],
    commonFaults: ['触点粘连', '常闭接错', '复位机构卡滞'],
    examTags: ['急停', '安全链', '联锁']
  },
  {
    kind: 'limit-switch',
    family: '工程工控',
    displayName: '行程开关',
    levels: ['electrician'],
    nominalVoltage: '24V DC / 220V AC 按触点规格选择',
    currentRange: '小电流控制触点',
    keyParameters: ['机械行程', '触点形式', '安装位置', '复位方式'],
    simulationUse: '到位检测、限位保护和联锁输入训练',
    careerUse: '门机、升降、输送和机床设备常见，能训练机械动作与电气触点状态对应关系。',
    connectionGuide: ['常开触点用于到位信号', '常闭触点用于限位保护', '安装位置要保证机械动作可靠触发'],
    certificationFocus: ['机械限位与电气触点', 'NO/NC 识别', '联锁保护'],
    safetyNotes: ['限位保护不可随意短接', '机械安装松动会导致误动作'],
    commonFaults: ['滚轮磨损', '位置偏移', '触点接反'],
    examTags: ['行程开关', '限位', '联锁']
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
    careerUse: '设备调试、产线维护和面试常问 NPN/PNP 接法，能直接对应到到位检测和计数故障。',
    connectionGuide: ['棕线接正极，蓝线接 0V', '黑线为信号输出', '按 PLC 输入类型选择 NPN 或 PNP'],
    certificationFocus: ['NPN/PNP 区别', '常开/常闭判断', '检测距离和误触发'],
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
    careerUse: '面向风机、水泵和输送设备维护岗位，重点训练控制端子、运行命令和故障复位逻辑。',
    connectionGuide: ['启停端子接控制触点', '模拟量端接 0-10V 或 4-20mA 给定', '故障继电器回到报警或 PLC 输入'],
    certificationFocus: ['主回路和控制端隔离', '启停/方向/频率给定', '故障复位与参数匹配'],
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
    careerUse: '用于设备状态可视化和报警联动，能体现 PLC 输出分配、公共端和故障等级设计能力。',
    connectionGuide: ['每个灯层单独接输出点', '公共端按模块类型接正或负', '蜂鸣器建议独立回路便于静音控制'],
    certificationFocus: ['状态灯颜色含义', 'PLC 输出点负载能力', '公共端接法'],
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
    careerUse: '气动夹具、水路控制和自动化设备常见执行器，适合训练感性负载保护和输出点容量核算。',
    connectionGuide: ['线圈接受控输出', '公共端回到对应电源', '直流线圈建议加续流或浪涌抑制'],
    certificationFocus: ['感性负载保护', '线圈电压匹配', '输出触点容量'],
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
    careerUse: '水泵、空压和暖通岗位常见，能帮助用户掌握 4-20mA 信号、量程换算和断线判断。',
    connectionGuide: ['确认二线制或三线制', '供电正负和信号端按手册接线', '屏蔽线通常单端接地'],
    certificationFocus: ['4-20mA 含义', '量程线性换算', '断线和零点漂移判断'],
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
    careerUse: '适合弱电施工、物业维护和安防岗位训练，覆盖门磁、锁具、按钮和消防释放的完整链路。',
    connectionGuide: ['控制器单独供电', '门磁和出门按钮接输入回路', '锁具电源容量单独核算并保留消防释放'],
    certificationFocus: ['常开/常闭门磁', '锁输出容量', '消防联动优先级'],
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
    title: '基础电学并联测量包',
    scenario: '12V 照明灯、电阻和 LED 组成低压并联支路，观察电压、电流和功率变化。',
    objective: '用常用器件完成取证前置的欧姆定律、并联电压和电功率验证。',
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
      'circuit-breaker',
      'emergency-stop',
      'fuse',
      'switching-power-supply',
      'self-reset-button',
      'self-lock-button',
      'rotary-switch',
      'dc-contactor',
      'auxiliary-contact',
      'thermal-overload',
      'proximity-sensor',
      'limit-switch',
      'pilot-light',
      'three-phase-motor',
      'heating-tube'
    ],
    estimatedMinutes: 48,
    assessmentTags: ['安全隔离', '保护链', '控制柜']
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
    item.careerUse ?? '',
    ...item.keyParameters,
    ...(item.connectionGuide ?? []),
    ...(item.certificationFocus ?? []),
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
