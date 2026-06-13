import { Button, Text, View } from '@tarojs/components'

export type AppModuleId = 'learn' | 'simulate' | 'bank' | 'library' | 'account'

export const APP_MODULES: Array<{
  id: AppModuleId
  label: string
  shortLabel: string
  description: string
}> = [
  {
    id: 'simulate',
    label: '仿真工作台',
    shortLabel: '仿真',
    description: '接线、运行、测量'
  },
  {
    id: 'learn',
    label: '训练路径',
    shortLabel: '学习',
    description: '课程、挑战、故障'
  },
  {
    id: 'bank',
    label: '题库测评',
    shortLabel: '题库',
    description: '知识题、取证模拟'
  },
  {
    id: 'library',
    label: '元件素材',
    shortLabel: '素材',
    description: '图像元件、规格速查'
  },
  {
    id: 'account',
    label: '账号付费',
    shortLabel: '账号',
    description: '套餐、权限、接口'
  }
]

export function getAdPlacementForModule(moduleId: AppModuleId) {
  if (moduleId === 'library') return 'library_banner'
  return 'hidden'
}

export function AppModuleNav({
  activeModule,
  onChange
}: {
  activeModule: AppModuleId
  onChange: (moduleId: AppModuleId, source?: string) => void
}) {
  return (
    <View className='app-module-nav'>
      {APP_MODULES.map((item) => (
        <Button
          key={item.id}
          className={`app-module-tab module-${item.id} ${activeModule === item.id ? 'is-active' : ''}`}
          onClick={() => onChange(item.id, 'module_nav')}
        >
          <View className='app-module-tab-icon'>
            <View className='icon-part part-a' />
            <View className='icon-part part-b' />
            <View className='icon-part part-c' />
          </View>
          <View className='app-module-tab-copy'>
            <Text className='app-module-tab-title'>{item.label}</Text>
            <Text className='app-module-tab-desc'>{item.description}</Text>
          </View>
        </Button>
      ))}
    </View>
  )
}

export function MobileBottomNav({
  activeModule,
  onChange
}: {
  activeModule: AppModuleId
  onChange: (moduleId: AppModuleId, source?: string) => void
}) {
  return (
    <View className='mobile-bottom-nav'>
      {APP_MODULES.map((item) => (
        <Button
          key={item.id}
          className={`mobile-nav-button nav-${item.id} ${activeModule === item.id ? 'is-active' : ''}`}
          onClick={() => onChange(item.id, 'bottom_nav')}
        >
          <View className='mobile-nav-icon'>
            <View className='icon-part part-a' />
            <View className='icon-part part-b' />
            <View className='icon-part part-c' />
          </View>
          <Text>{item.shortLabel}</Text>
        </Button>
      ))}
    </View>
  )
}
