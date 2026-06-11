export const Capacitor = {
  getPlatform() {
    return 'web'
  }
}

export function registerPlugin<T>(): T {
  const noop = () => Promise.resolve()

  return {
    initialize: noop,
    logEvent: noop,
    setUserId: noop,
    setUserProperty: noop,
    showBanner: noop,
    hideBanner: noop
  } as T
}
