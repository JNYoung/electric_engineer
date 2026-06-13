import { Capacitor, registerPlugin } from '@capacitor/core'

interface ElectricDisplayPlugin {
  lockPortrait(): Promise<void>
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
  await ElectricDisplay.lockPortrait()
  await ElectricDisplay.exitImmersive()
}
