import { Capacitor, registerPlugin } from '@capacitor/core'

interface ElectricDisplayPlugin {
  lockLandscape(): Promise<void>
  unlockOrientation(): Promise<void>
  enterImmersive(): Promise<void>
  exitImmersive(): Promise<void>
}

const ElectricDisplay = registerPlugin<ElectricDisplayPlugin>('ElectricDisplay')

export function isNativeAndroidDisplayRuntime() {
  return Capacitor.getPlatform() === 'android'
}

export async function enterNativeLandscapeCheck() {
  if (!isNativeAndroidDisplayRuntime()) return
  await ElectricDisplay.enterImmersive()
  await ElectricDisplay.lockLandscape()
}

export async function exitNativeLandscapeCheck() {
  if (!isNativeAndroidDisplayRuntime()) return
  await ElectricDisplay.unlockOrientation()
  await ElectricDisplay.exitImmersive()
}
