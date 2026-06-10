import { useMemo, useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import './index.scss'
import { createBranchWires, createDevice, createInitialCircuit } from '@/core/circuitFactory'
import {
  canAutoConnect,
  DEVICE_PALETTE,
  getDeviceDefinition,
  isConductiveControlKind,
  isLoadKind
} from '@/core/registry'
import { simulateCircuit } from '@/core/simulator'
import type { CircuitDevice, CircuitModel, DeviceKind, SimulationResult, Wire } from '@/core/types'

const visualParts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

function ComponentIllustration({ kind, compact = false }: { kind: DeviceKind; compact?: boolean }) {
  return (
    <View className={['component-visual', `visual-${kind}`, compact ? 'is-compact' : ''].filter(Boolean).join(' ')}>
      {visualParts.map((part) => (
        <View key={part} className={`visual-part part-${part}`} />
      ))}
    </View>
  )
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00'
}

function terminalPoint(device: CircuitDevice, terminalId: string) {
  const nodeWidth = 136
  const nodeHeight = 74
  const centerY = device.y + nodeHeight / 2

  if (device.kind === 'power-positive') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  if (device.kind === 'power-negative') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  if (terminalId === 'out' || terminalId === 'b') {
    return { x: device.x + nodeWidth, y: centerY }
  }
  return { x: device.x, y: centerY }
}

function routeWire(wire: Wire, devicesById: Map<string, CircuitDevice>) {
  const fromDevice = devicesById.get(wire.from.deviceId)
  const toDevice = devicesById.get(wire.to.deviceId)
  if (!fromDevice || !toDevice) return []

  const from = terminalPoint(fromDevice, wire.from.terminalId)
  const to = terminalPoint(toDevice, wire.to.terminalId)
  const midX = Math.round((from.x + to.x) / 2)

  return [
    horizontalSegment(from.x, from.y, midX),
    verticalSegment(midX, from.y, to.y),
    horizontalSegment(midX, to.y, to.x)
  ].filter((segment) => segment.w > 0 && segment.h > 0)
}

function horizontalSegment(x1: number, y: number, x2: number) {
  const height = 6
  return {
    x: Math.min(x1, x2),
    y: y - height / 2,
    w: Math.abs(x2 - x1),
    h: height
  }
}

function verticalSegment(x: number, y1: number, y2: number) {
  const width = 6
  return {
    x: x - width / 2,
    y: Math.min(y1, y2),
    w: width,
    h: Math.abs(y2 - y1)
  }
}

function updateDevice(model: CircuitModel, id: string, patch: Partial<CircuitDevice>): CircuitModel {
  return {
    ...model,
    devices: model.devices.map((device) =>
      device.id === id ? { ...device, ...patch } : device
    )
  }
}

function updateWire(model: CircuitModel, id: string, connected: boolean): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((wire) =>
      wire.id === id ? { ...wire, connected } : wire
    )
  }
}

function setAllWires(model: CircuitModel, connected: boolean): CircuitModel {
  return {
    ...model,
    wires: model.wires.map((wire) => ({ ...wire, connected }))
  }
}

function BoardDevice({
  device,
  selected,
  effect,
  onSelect,
  onToggleSwitch
}: {
  device: CircuitDevice
  selected: boolean
  effect?: SimulationResult['effects'][string]
  onSelect: (id: string) => void
  onToggleSwitch: (id: string) => void
}) {
  const definition = getDeviceDefinition(device.kind)
  const active = Boolean(effect?.active)
  const className = [
    'device-node',
    `device-${device.kind}`,
    selected ? 'is-selected' : '',
    active ? 'is-active' : '',
    device.kind === 'switch' && device.isClosed ? 'is-closed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={className}
      style={{ left: `${device.x}px`, top: `${device.y}px` }}
      onClick={() => onSelect(device.id)}
    >
      <View className='device-symbol'>
        <ComponentIllustration kind={device.kind} />
      </View>
      <View className='device-copy'>
        <Text className='device-title'>{device.label}</Text>
        <Text className='device-meta'>
          {isConductiveControlKind(device.kind)
            ? device.isClosed
              ? '闭合'
              : '断开'
            : effect?.label ?? definition.name}
        </Text>
      </View>
      {isConductiveControlKind(device.kind) && (
        <Button
          className='inline-switch'
          onClick={(event) => {
            event.stopPropagation()
            onToggleSwitch(device.id)
          }}
        >
          {device.isClosed ? '断开' : '闭合'}
        </Button>
      )}
    </View>
  )
}

function WireLayer({
  wires,
  devices,
  simulation,
  onSelectWire
}: {
  wires: Wire[]
  devices: CircuitDevice[]
  simulation: SimulationResult
  onSelectWire: (id: string) => void
}) {
  const devicesById = new Map(devices.map((device) => [device.id, device]))

  return (
    <View className='wire-layer'>
      {wires.map((wire) => {
        const status = simulation.wires[wire.id]
        const segments = routeWire(wire, devicesById)
        return segments.map((segment, index) => (
          <View
            key={`${wire.id}-${index}`}
            className={[
              'wire-segment',
              wire.connected ? 'is-connected' : 'is-disconnected',
              status?.energized ? 'is-energized' : '',
              (status?.voltage ?? 0) <= 0.2 && wire.connected ? 'is-return' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${segment.x}px`,
              top: `${segment.y}px`,
              width: `${segment.w}px`,
              height: `${segment.h}px`
            }}
            onClick={() => onSelectWire(wire.id)}
          />
        ))
      })}
    </View>
  )
}

export default function Index() {
  const [model, setModel] = useState(() => createInitialCircuit(12))
  const [selectedId, setSelectedId] = useState('l1')
  const simulation = useMemo(() => simulateCircuit(model), [model])
  const selectedDevice = model.devices.find((device) => device.id === selectedId)
  const selectedWire = model.wires.find((wire) => wire.id === selectedId)
  const loadDevices = model.devices.filter((device) => isLoadKind(device.kind))
  const paletteGroups = useMemo(() => {
    const groups = new Map<string, typeof DEVICE_PALETTE>()
    DEVICE_PALETTE.forEach((definition) => {
      const group = groups.get(definition.group) ?? []
      group.push(definition)
      groups.set(definition.group, group)
    })
    return [...groups.entries()]
  }, [])
  const boardHeight = Math.max(500, ...model.devices.map((device) => device.y + 100))

  function setVoltage(nextVoltage: number) {
    const voltage = Math.max(1, Math.min(48, nextVoltage))
    setModel((current) =>
      updateDevice(current, 'p1', {
        sourceVoltage: voltage
      })
    )
  }

  function toggleSwitch(deviceId = 's1') {
    setModel((current) => {
      const device = current.devices.find((item) => item.id === deviceId)
      return updateDevice(current, deviceId, { isClosed: !device?.isClosed })
    })
  }

  function addDevice(kind: DeviceKind) {
    setModel((current) => {
      const nextIndex = current.devices.filter((device) => device.id.startsWith('x')).length + 1
      const sameKindIndex = current.devices.filter((device) => device.kind === kind).length + 1
      const device = createDevice(kind, nextIndex, sameKindIndex)
      const wires = canAutoConnect(kind)
        ? createBranchWires(device.id, nextIndex, device.label)
        : []
      setSelectedId(device.id)
      return {
        devices: [...current.devices, device],
        wires: [...current.wires, ...wires]
      }
    })
  }

  function resetCircuit() {
    setSelectedId('l1')
    setModel(createInitialCircuit(model.devices.find((item) => item.id === 'p1')?.sourceVoltage ?? 12))
  }

  const voltage = model.devices.find((device) => device.id === 'p1')?.sourceVoltage ?? 12
  const stateLabel = simulation.shortCircuit
    ? '短路保护'
    : simulation.closedCircuit
      ? '回路接通'
      : '等待接通'

  return (
    <View className='app-shell'>
      <View className='topbar'>
        <View className='brand-block'>
          <Text className='brand-mark'>电</Text>
          <View>
            <Text className='brand-title'>电工大师</Text>
            <Text className='brand-subtitle'>Web / 小程序电路模拟控制台</Text>
          </View>
        </View>
        <View className='toolbar'>
          <Button className='tool-button primary' onClick={() => toggleSwitch()}>
            {model.devices.find((device) => device.id === 's1')?.isClosed ? '■ 断开' : '▶ 接通'}
          </Button>
          <Button className='tool-button' onClick={resetCircuit}>↺ 复位</Button>
          <Button className='tool-button' onClick={() => setModel((current) => setAllWires(current, true))}>
            全部连接
          </Button>
          <Button className='tool-button' onClick={() => setModel((current) => setAllWires(current, false))}>
            全部断开
          </Button>
          <View className='voltage-control'>
            <Button className='step-button' onClick={() => setVoltage(voltage - 1)}>-</Button>
            <Text>{voltage}V DC</Text>
            <Button className='step-button' onClick={() => setVoltage(voltage + 1)}>+</Button>
          </View>
        </View>
      </View>

      <View className='workspace'>
        <View className='palette-panel'>
          <Text className='panel-title'>弱电元件库</Text>
          <ScrollView scrollY className='palette-scroll'>
            {paletteGroups.map(([group, items]) => (
              <View key={group} className='palette-group'>
                <Text className='palette-group-title'>{group}</Text>
                {items.map((item) => (
                  <View key={item.kind} className='palette-item'>
                    <View className={`palette-icon palette-${item.kind}`}>
                      <ComponentIllustration kind={item.kind} compact />
                    </View>
                    <View className='palette-text'>
                      <Text className='palette-name'>{item.name}</Text>
                      <Text className='palette-desc'>{item.description}</Text>
                    </View>
                    {canAutoConnect(item.kind) && (
                      <Button className='small-action' onClick={() => addDevice(item.kind)}>添加</Button>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View className='interface-note'>
            <Text className='note-title'>已纳入的弱电类别</Text>
            <View className='category-chips'>
              {paletteGroups.map(([group, items]) => (
                <View key={`${group}-chip`} className='category-chip'>
                  <Text>{group}</Text>
                  <Text>{items.length}</Text>
                </View>
              ))}
            </View>
            <Text className='note-title extension-title'>扩展接口</Text>
            <Text className='note-copy'>
              新电器只需在注册表提供端子、额定电压、等效阻值、仿真角色和效果类型，就能接入当前网络。
            </Text>
          </View>
        </View>

        <View className='canvas-panel'>
          <View className='canvas-header'>
            <View>
              <Text className='panel-title'>模拟连接画布</Text>
              <Text className='panel-subtitle'>点击元件或导线查看状态，导线可独立接入或断开。</Text>
            </View>
            <View className={`run-state ${simulation.closedCircuit ? 'is-running' : ''}`}>
              <Text>{stateLabel}</Text>
            </View>
          </View>

          <View className='circuit-board' style={{ height: `${boardHeight}px` }}>
            <View className='grid-bg' />
            <WireLayer
              wires={model.wires}
              devices={model.devices}
              simulation={simulation}
              onSelectWire={setSelectedId}
            />
            {model.devices.map((device) => (
              <BoardDevice
                key={device.id}
                device={device}
                selected={selectedId === device.id}
                effect={simulation.effects[device.id]}
                onSelect={setSelectedId}
                onToggleSwitch={toggleSwitch}
              />
            ))}
            <View className='board-legend positive'>正极母线</View>
            <View className='board-legend negative'>负极回线</View>
          </View>

          <View className='connection-strip'>
            {model.wires.map((wire) => {
              const status = simulation.wires[wire.id]
              return (
                <View key={wire.id} className='wire-toggle'>
                  <View className='wire-copy' onClick={() => setSelectedId(wire.id)}>
                    <Text className='wire-name'>{wire.label}</Text>
                    <Text className='wire-value'>
                      {wire.connected
                        ? status?.energized
                          ? `${formatNumber(status.voltage ?? 0, 1)}V 有电`
                          : '已连接'
                        : '已断开'}
                    </Text>
                  </View>
                  <Button
                    className={`toggle-button ${wire.connected ? 'is-on' : ''}`}
                    onClick={() => setModel((current) => updateWire(current, wire.id, !wire.connected))}
                  >
                    {wire.connected ? '断开' : '接入'}
                  </Button>
                </View>
              )
            })}
          </View>
        </View>

        <View className='inspector-panel'>
          <Text className='panel-title'>属性与验证</Text>
          {selectedDevice && (
            <View className='inspector-card'>
              <View className='inspector-head'>
                <View className={`palette-icon palette-${selectedDevice.kind}`}>
                  <ComponentIllustration kind={selectedDevice.kind} compact />
                </View>
                <View>
                  <Text className='inspector-title'>{selectedDevice.label}</Text>
                  <Text className='inspector-type'>{getDeviceDefinition(selectedDevice.kind).name}</Text>
                </View>
              </View>
              <View className='metric-row'>
                <Text>状态</Text>
                <Text>{simulation.effects[selectedDevice.id]?.label ?? (selectedDevice.isClosed ? '闭合' : '就绪')}</Text>
              </View>
              {selectedDevice.kind === 'power-positive' && (
                <View className='control-stack'>
                  <Text className='field-label'>输出电压</Text>
                  <View className='voltage-control wide'>
                    <Button className='step-button' onClick={() => setVoltage(voltage - 1)}>-</Button>
                    <Text>{voltage}V</Text>
                    <Button className='step-button' onClick={() => setVoltage(voltage + 1)}>+</Button>
                  </View>
                </View>
              )}
              {isConductiveControlKind(selectedDevice.kind) && (
                <Button className='full-button' onClick={() => toggleSwitch(selectedDevice.id)}>
                  {selectedDevice.isClosed ? '断开开关' : '闭合开关'}
                </Button>
              )}
              {isLoadKind(selectedDevice.kind) && (
                <View className='metric-grid'>
                  <View>
                    <Text className='metric-label'>端电压</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.voltage ?? 0)}V
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>电流</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.current ?? 0)}A
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>功率</Text>
                    <Text className='metric-value'>
                      {formatNumber(simulation.effects[selectedDevice.id]?.power ?? 0)}W
                    </Text>
                  </View>
                  <View>
                    <Text className='metric-label'>额定</Text>
                    <Text className='metric-value'>{selectedDevice.ratedVoltage ?? 12}V</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {selectedWire && (
            <View className='inspector-card'>
              <Text className='inspector-title'>{selectedWire.label}</Text>
              <Text className='wire-detail'>
                {selectedWire.from.deviceId}.{selectedWire.from.terminalId} → {selectedWire.to.deviceId}.{selectedWire.to.terminalId}
              </Text>
              <Button
                className='full-button'
                onClick={() => setModel((current) => updateWire(current, selectedWire.id, !selectedWire.connected))}
              >
                {selectedWire.connected ? '断开这根导线' : '接入这根导线'}
              </Button>
            </View>
          )}

          <View className='summary-card'>
            <Text className='summary-title'>仿真结果</Text>
            <View className='metric-row'>
              <Text>总电流</Text>
              <Text>{formatNumber(simulation.totalCurrent)}A</Text>
            </View>
            <View className='metric-row'>
              <Text>接入负载</Text>
              <Text>{loadDevices.length} 个</Text>
            </View>
            <View className='metric-row'>
              <Text>电源</Text>
              <Text>{simulation.supplyVoltage}V DC</Text>
            </View>
          </View>

          <View className='issue-list'>
            {simulation.issues.map((issue, index) => (
              <View key={`${issue.message}-${index}`} className={`issue issue-${issue.severity}`}>
                <Text>{issue.message}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className='effects-bar'>
        {loadDevices.map((device) => {
          const effect = simulation.effects[device.id]
          return (
            <View key={device.id} className={`effect-pill ${effect?.active ? 'is-active' : ''}`}>
              <Text className='effect-name'>{device.label}</Text>
              <Text className='effect-value'>{effect?.label ?? '未通电'}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
