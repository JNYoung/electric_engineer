# 电工大师架构说明

## 目标

电工大师使用 Taro + React + TypeScript 实现，一套代码支持 Web H5 和微信小程序构建。业务核心与 UI 解耦，电路仿真模型集中在 `src/core`。

## 核心模块

- `src/core/types.ts`：定义元件、端子、导线、仿真结果等通用模型。
- `src/core/registry.ts`：元件注册表。新增电器时扩展 `DeviceKind` 和 `DEVICE_REGISTRY`，声明端子、分组、仿真角色、效果类型、额定电压、等效阻值与描述。
- `src/core/simulator.ts`：直流电路仿真器。导线和闭合控制件会合并为理想导通节点，正负电源作为固定电位，可接入元件按等效负载参与节点电压求解。
- `src/core/circuitFactory.ts`：默认示例电路和扩展负载接线工厂。
- `src/pages/index`：跨端工作台 UI，包含元件库、连接画布、属性检查器和仿真结果。
- `docs/LOW_VOLTAGE_COMPONENTS.md`：弱电元件调研清单与当前仿真抽象说明。

## 新增电器接口

1. 在 `DeviceKind` 中添加类型。
2. 在 `DEVICE_REGISTRY` 中声明端子和默认参数。
3. 选择 `simulationRole`：电源、参考地、导通控制件、等效负载或仅展示。
4. 如果是可接入负载，提供 `defaultRatedVoltage` 与 `defaultResistance`。
5. 选择 `effectKind`，用于统一生成亮灯、旋转、鸣响、吸合、采集上电等状态文案和动效。
6. 在 `src/pages/index/index.scss` 中补充 `visual-*` 示意图样式。元件库、画布和属性面板都会复用该图形。

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
