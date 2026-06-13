# 电工大师架构说明

## 目标

电工大师使用 Taro + React + TypeScript 实现，一套代码支持 Web H5 和微信小程序构建。业务核心与 UI 解耦，电路仿真模型集中在 `src/core`。

## 核心模块

- `src/core/types.ts`：定义元件、端子、导线、仿真结果等通用模型。
- `src/core/registry.ts`：元件注册表。新增电器时扩展 `DeviceKind` 和 `DEVICE_REGISTRY`，声明端子、分组、仿真角色、效果类型、额定电压、等效阻值与描述。
- `src/core/simulator.ts`：直流电路仿真器。导线和闭合控制件会合并为理想导通节点，正负电源作为固定电位，可接入元件按等效负载参与节点电压求解。
- `src/core/circuitFactory.ts`：默认示例电路和扩展负载接线工厂。
- `src/core/training.ts`：学习课程、训练挑战、故障/验证场景库、预设训练电路、规则评分和安全诊断。训练层只依赖通用电路模型与仿真结果，便于独立测试。
- `src/core/knowledge.ts`：知识验证素材库，覆盖基础电学、大学电路、电工实操三个层级，提供选择题、评分进度、错题/未完成复训队列、当前仿真电路可验证知识点、公式验算卡和面向读数/KCL/安全项的测量证据单。
- `src/core/assessment.ts`：考试蓝图与组卷评分层，面向基础电学能力测验、大学电路小考和电工实操取证模拟，复用知识题库并输出通过线、得分、薄弱 Track、仿真准备度、考试工位验收、认证准入、练习复盘报告和补练建议。
- `src/core/instruments.ts`：虚拟万用表测点层，把当前电路和仿真结果转换成电压、电流、KCL、导线通断、短路隔离和过压风险读数，供仿真区、题库和后续训练报告复用。
- `src/core/materials.ts`：组件素材规格库，维护常用器件、工程工控、装修工控的额定/供电、电流范围、关键参数、岗位用途、接线要点、取证考点、安全注意和常见故障，并输出训练素材检索结果与可教学交付的素材实训包，供 UI、题库和后续素材搜索复用。
- `src/core/commercial.ts`：商业化能力模型，定义工程工控、装修工控两个工作域，分类元件目录、套餐门禁、登录状态、支付 API 契约和账号权限快照。
- `src/core/telemetry.ts`：埋点抽象层，统一业务事件名和属性，按构建常量选择国内 `cn-edu-v1` 或海外 `global-edu-v1` 包络，页面只调用统一 `track`，后续接神策/友盟/Firebase/GA4/自建管道时不改业务代码。
- `src/pages/index`：跨端工作台 UI，包含行业工作域、分类元件库、素材规格速查、商业化面板、学习路径、训练挑战、知识验证、专业考试模拟、连接画布、属性检查器、训练评分、安全诊断和仿真结果。
- `docs/LOW_VOLTAGE_COMPONENTS.md`：弱电元件调研清单与当前仿真抽象说明。

## 学习与训练系统

- 课程模块定义学习阶段、目标、核心概念、练习动作和安全检查点。
- 训练挑战定义场景、预设电路、评分规则和提示。当前覆盖照明支路排障、排风告警联动、5V 传感接口训练。
- 故障场景库通过 `FAULT_SCENARIOS` 维护开路排障、KCL 验证、低压模块过压、正负极短接和主供电链开路等可复用样本，`createFaultScenarioCircuit` 可直接生成对应仿真电路。
- 训练评分基于实时仿真结果计算，包括闭合回路、断线修复、负载工作、电源电压范围、总电流预算和短路检查。
- 安全诊断会从同一份电路模型中提示短路、断线、缺少电源、过压和总电流偏高等问题。
- 虚拟万用表由 `buildVirtualMeterWorksheet` 生成可验收测点：默认并联回路会输出电源端电压、负载端电压、支路电流、支路电流和、导线通断；断线会显示 OL 和接回建议；短路或过压会进入“需断电排障”状态。
- 知识验证题库分为基础电学、大学电路和电工实操，题目会展示公式、答题反馈、解释和可在当前电路上观察的仿真提示。
- 知识仿真检查会按学习层级读取当前仿真结果，例如基础电学层级检查闭合回路与并联样本，大学层级检查 KCL 与并联电压，电工实操层级检查低压电源、保护链和额定电压匹配。
- 知识测量证据单由 `buildKnowledgeMeasurementWorksheet` 从同一份电路模型和仿真结果派生：基础电学层级输出电源电压、负载电流和并联压差，大学层级输出支路电流和、KCL 误差和节点压差，电工实操层级输出训练电源、保护器件、危险项和过压负载。
- 公式验算卡由 `buildFormulaVerificationWorksheet` 从实时仿真读数派生：基础电学层级验算 `I=U/R`、`P=UI` 和并联端电压，大学层级验算 KCL、等效电阻和节点压差，电工实操层级验算低压电源、额定电压余量、电流预算和保护链计数。
- 错题复训由 `buildKnowledgeReviewNotebook` 从同一份答题记录派生，按 Track 汇总错题、未完成题、优先复训层级和下一步仿真观察动作，后续可直接升级为账号错题本或付费训练报告。
- 专业考试模拟通过 `ASSESSMENT_BLUEPRINTS` 定义题量、时间、通过线、能力要求和仿真验证条件。当前覆盖基础电学能力测验、大学电路分析小考、电工实操取证模拟。
- 考试组卷复用 `KNOWLEDGE_QUESTIONS`，答题结果会同步进入知识题库进度，避免“练习”和“测试”两套状态割裂。
- 考试仿真准备度通过 `evaluateAssessmentSimulationReadiness` 读取当前电路和仿真结果：基础电学层级检查闭合回路、并联样本和测量读数，大学层级检查 KCL、并联端电压和短路状态，电工实操层级检查低压电源、安全链、危险短路和额定匹配。
- 考试工位验收由 `buildAssessmentSkillStation` 聚合理论答题、仿真工况和虚拟万用表证据，输出“待补证据 / 需排障 / 可提交”状态，适合作为课堂测验、大学实验和电工实操提交前的统一闸门。
- 认证准入通过 `buildAssessmentCertificationReadiness` 聚合题目完成、成绩达线和仿真验收三个闸门，输出“待完成 / 未达标 / 待补仿真 / 可提交”状态，后续可直接接入证书、付费报告或学习档案。
- 练习复盘通过 `buildAssessmentPracticeReport` 聚合答题完成度、正确率、成绩、仿真准备度、薄弱 Track 和下一步行动，后续可直接接入错题本、学习档案或付费报告。
- 素材规格库通过 `MATERIAL_LIBRARY` 按知识层级和行业族群维护，`buildMaterialFinder` 可按行业、层级和关键词输出命中素材、考试标签、安全检查和故障样本。工作台会展示当前选中元件的关键规格、岗位用途、接线要点和取证考点，并给出当前行业的可检索训练素材清单。
- 素材实训包通过 `MATERIAL_TRAINING_KITS` 把基础电学并联测量、大学接口/模拟量、电工低压控制排障和装修智能联动组织为课程可交付单元。`getMaterialTrainingKits` 会聚合组件清单、安全检查、故障样本、考点标签和素材齐备状态，后续可直接挂接登录账号、付费课包、考试工位或学习档案。

## 移动端工作台

- 760px 以下采用移动端任务流：顶部工具栏压缩成两列按钮，状态条展示题库掌握度、电源、电流和安全状态。
- 手机端底部导航会真实切换工作区：学习区显示商业域与课程/场景，仿真区显示画布、属性、评分和诊断，题库区显示知识验证与考试模拟，素材区显示元件库与规格速查，账号区显示登录/付费接口。
- 学习卡、训练卡、题库 Track、考试蓝图、选项和仿真效果条改为横向可滚动，避免卡片过窄导致文字挤压。
- 画布在移动端保留稳定宽度并横向滚动，保证元件和导线不因为强行缩放而重叠。
- 底部固定导航提供学习、仿真、题库、素材、账号五个入口。添加元件或载入训练后会自动切到仿真区，答题后会切到题库区，套餐动作会切到账号区。

## 商业化工作台

- 工作域拆分为工程工控和装修工控，每个工作域有独立分类、推荐电压、组件清单和训练使用场景。
- 工程工控覆盖 PLC、变频器、接触器、热继电器、急停、限位、接近开关、压力变送器、三色灯、电磁阀等设备。
- 装修工控覆盖智能网关、智能开关、调光模块、窗帘电机、地暖温控、漏水检测、场景面板、门禁模块等设备。
- 元件目录在 `COMPONENT_CATALOG` 中维护，包含工作域、分类、复杂度、套餐等级、标签和使用说明。UI 使用同一份目录生成 Tab、分类筛选、锁定提示和添加按钮。
- 套餐模型在 `BILLING_PLANS` 中维护，目前预留体验版、专业版、团队版。`FEATURE_GATES` 统一定义功能门禁，后续接入真实账号后仍可复用。
- 商业权限快照由 `buildCommercialAccessSnapshot` 输出，会聚合当前账号、行业域、锁定元件、功能门禁、推荐套餐和下一步登录/结账/账户中心动作。UI 只消费该快照，后续切换生产权益服务时不需要重写展示层。
- 登录与支付已接入本地 backend 契约：`src/core/auth.ts` 和 `src/core/billing.ts` 调用 `/api/auth/*`、`/api/billing/*` 与 webhook/restore/portal 入口；生产环境继续替换短信、OAuth、JWT、Stripe、微信支付、Google Play Billing 或企业内购 adapter。

## 埋点分流

- 页面层只调用 `trackTelemetryEvent(eventName, properties)`，不直接依赖国内或海外 SDK。
- 构建时通过 `TELEMETRY_REGION=domestic|overseas` 选择落地方案。国内包输出 `cn-edu-v1` 包络，默认 endpoint 为 `/api/telemetry/cn/events`；海外包输出 `global-edu-v1` 包络，默认 endpoint 为 `/api/telemetry/global/events`。
- `TELEMETRY_CHANNEL` 用来区分 `weapp`、`h5-cn`、`h5-global`、`app-cn`、`app-global` 等渠道，后续接 App Store、Google Play、国内安卓渠道时只调整打包命令。
- 当前首批事件覆盖 App 打开、移动导航、行业/分类切换、元件添加和锁定、开关、电压、导线连接、线型、画布拖动、训练、故障场景、课程、题库、考试、付费入口和账号状态。
- 默认 transport 是 no-op，避免在没有后端和 SDK 时污染测试环境；真实接入时在客户端创建时注入 SDK 或请求 transport。

## 新增电器接口

1. 在 `DeviceKind` 中添加类型。
2. 在 `DEVICE_REGISTRY` 中声明端子和默认参数。
3. 选择 `simulationRole`：电源、参考地、导通控制件、等效负载或仅展示。
4. 如果是可接入负载，提供 `defaultRatedVoltage` 与 `defaultResistance`。
5. 选择 `effectKind`，用于统一生成亮灯、旋转、鸣响、吸合、采集上电等状态文案和动效。
6. 如果元件需要进入商业目录，在 `src/core/commercial.ts` 的 `COMPONENT_CATALOG` 中声明工作域、分类和套餐等级。
7. 如果元件需要进入学习素材库，在 `src/core/materials.ts` 的 `MATERIAL_LIBRARY` 中补充规格、安全注意、常见故障和考试标签。
8. 如果元件属于可交付训练任务，在 `MATERIAL_TRAINING_KITS` 中把它纳入对应实训包，确保训练包的 `readiness` 仍为“素材齐备”。
9. 在 `src/pages/index/index.scss` 中补充 `visual-*` 示意图样式。元件库、画布和属性面板都会复用该图形。

## 运行

```bash
npm install
npm run dev:h5
```

构建微信小程序：

```bash
npm run build:weapp
```

构建后使用微信开发者工具打开当前项目目录，`project.config.json` 已指向 `dist/weapp/`。H5 构建输出在 `dist/h5/`。

国内 H5 和海外 H5 可分别构建：

```bash
npm run build:h5:domestic
npm run build:h5:overseas
```

未来 App 壳构建前可先用：

```bash
npm run build:app:domestic
npm run build:app:overseas
```
