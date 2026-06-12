# 器件清单导入记录

来源文件：`/Users/shuxin/Downloads/器件清单.docx`

本次将清单中的 28 类控制柜/低压电气器件映射到应用元件库。规格变体先放在器件说明、材料说明和标签中表达，避免把同一器件拆成大量重复卡片。

## 已覆盖器件

| 清单名称 | 工程元件 kind | 规格处理 |
| --- | --- | --- |
| 断路器 | `circuit-breaker` | 1P/2P/3P/4P |
| 熔断器 | `fuse` | 1P/2P/3P/4P |
| 交流接触器 | `ac-contactor` | 220V/380V |
| 直流接触器 | `dc-contactor` | 24V |
| 接触器辅助触头 | `auxiliary-contact` | 常开/常闭触点说明 |
| 热过载继电器 | `thermal-overload` | 整定电流、保护链说明 |
| 交流时间继电器 | `ac-time-relay` | 220V/380V |
| 直流时间继电器 | `dc-time-relay` | 24V |
| 交流中间继电器 | `ac-intermediate-relay` | 220V/380V |
| 直流中间继电器 | `dc-intermediate-relay` | 24V |
| 开关电源 | `switching-power-supply` | AC-DC、24V 控制电源说明 |
| 自复位按钮 | `self-reset-button` | 黄/绿/红等颜色说明 |
| 自锁按钮 | `self-lock-button` | 黄/绿/红等颜色说明 |
| 急停按钮 | `emergency-stop` | 常闭安全链说明 |
| 旋转开关 | `rotary-switch` | 两位/三位 |
| 指示灯 | `pilot-light` | 黄/绿/红等颜色说明 |
| 蜂鸣器 | `buzzer` | 已有元件复用 |
| 接近开关 | `proximity-sensor` | PNP/NPN |
| 行程开关 | `limit-switch` | NO/NC 与机械限位说明 |
| 二极管 | `diode` | 已有元件复用 |
| 电容 | `capacitor` | 已有元件复用 |
| 电压表 | `voltmeter` | AC/DC 和量程说明 |
| 电流表 | `ammeter` | 串联、互感器/分流器说明 |
| 电位器 | `potentiometer` | 已有元件复用 |
| 灰色端子 | `gray-terminal` | 通用直通端子 |
| 黄绿色端子 | `pe-terminal` | PE 保护接地端子 |
| 三相异步电动机 | `three-phase-motor` | 380V 三相负载抽象 |
| 加热管 | `heating-tube` | 阻性加热负载 |

## 检索依据

- Schneider Electric Harmony 系列：按钮、旋钮、急停和指示灯分类参考。<https://www.se.com/us/en/product-category/4800-pushbuttons-switches-pilot-lights-control-stations-and-joysticks/>
- Schneider Electric TeSys 系列：接触器、控制继电器、保护继电器和辅助触点功能参考。<https://www.se.com/us/en/product-category/1500-contactors-and-protection-relays/>
- Schneider Electric Acti9 小型断路器：极数、额定电流、脱扣曲线和分断能力参考。<https://www.se.com/uk/en/product/A9F44301/acti9-ic60n-3p-1a-c-miniature-circuit-breaker/>
- Schneider Electric 时间继电器资料：延时继电器和传感继电器产品范围参考。<https://www.se.com/us/en/download/document/8501CT1104/>
- Omron E2E 接近传感器：NPN/PNP、NO/NC、检测距离和三线输出参考。<https://www.omron.co.id/products/family/449/download/cad.html>
- Phoenix Contact 直通端子：普通端子连接点、跨接和端子排设计参考。<https://www.phoenixcontact.com/en-us/products/terminal-blocks/feed-through-terminal-blocks-multi-conductor-terminal-blocks-and-multi-level-terminal-blocks>
- Phoenix Contact UT 4-PE：黄绿色 PE 保护接地端子参考。<https://www.phoenixcontact.com/en-us/products/ground-terminal-block-ut-4-pe-3044128>
- ABB IEC 低压电机：DOL/VFD、工业低压电机能力参考。<https://www.abb.com/global/en/areas/motion/motors-generators/low-voltage-motors/iec-low-voltage-motors>
- Watlow 加热元件资料：管状加热器、阻性发热和三相能力参考。<https://www.watlow.com/-/media/documents/catalogs/tubular.ashx>

## 当前实现边界

- 仿真仍采用两端等效模型，先覆盖通电、保护、吸合、显示、发热和旋转效果。
- 1P/2P/3P/4P、220V/380V、按钮颜色、PNP/NPN 等作为规格说明保留，后续可扩展成属性选择器。
- 三相电机目前按两端等效负载计算电流和转动效果，后续可升级为三相端子 U/V/W 与缺相检测。
