import { expect, test, type Page } from '@playwright/test'

const route = '/#/pages/index/index'

function watchRuntimeHealth(page: Page) {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console error: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`)
  })

  return problems
}

async function expectHealthyRuntime(problems: string[]) {
  expect(problems).toEqual([])
}

async function expectNoIconText(page: Page) {
  const iconsWithText = await page.locator('.component-visual').evaluateAll((nodes) =>
    nodes
      .map((node, index) => ({
        index,
        text: (node.textContent ?? '').trim()
      }))
      .filter((item) => item.text.length > 0)
  )

  expect(iconsWithText).toEqual([])
}

async function expectDevicesInsideBoard(page: Page) {
  const clippedDevices = await page.locator('.circuit-board').evaluate((board) => {
    const boardRect = board.getBoundingClientRect()
    return Array.from(board.querySelectorAll('.device-node'))
      .map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          label: (node.textContent ?? '').trim(),
          left: rect.left - boardRect.left,
          top: rect.top - boardRect.top,
          right: rect.right - boardRect.left,
          bottom: rect.bottom - boardRect.top,
          boardWidth: boardRect.width,
          boardHeight: boardRect.height
        }
      })
      .filter(
        (item) =>
          item.left < 0 ||
          item.top < 0 ||
          item.right > item.boardWidth ||
          item.bottom > item.boardHeight
      )
  })

  expect(clippedDevices).toEqual([])
}

async function devicePosition(page: Page, selector: string) {
  return page.locator(selector).evaluate((node) => {
    const board = node.closest('.circuit-board')
    if (!board) {
      throw new Error('Device is not inside the circuit board')
    }
    const boardRect = board.getBoundingClientRect()
    const rect = node.getBoundingClientRect()
    return {
      left: rect.left - boardRect.left,
      top: rect.top - boardRect.top
    }
  })
}

async function dragDevice(page: Page, selector: string, deltaX: number, deltaY: number) {
  const box = await page.locator(selector).boundingBox()
  if (!box) {
    throw new Error(`Cannot drag missing device: ${selector}`)
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  const endX = startX + deltaX
  const endY = startY + deltaY
  const supportsTouch = await page.evaluate(() => navigator.maxTouchPoints > 0)

  if (supportsTouch) {
    const touchPoint = (x: number, y: number) => ({
      identifier: 1,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
      radiusX: 1,
      radiusY: 1,
      force: 0.5
    })

    await page.locator(selector).dispatchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touchPoint(startX, startY)],
      targetTouches: [touchPoint(startX, startY)],
      changedTouches: [touchPoint(startX, startY)]
    })
    await page.locator('.circuit-board').dispatchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [touchPoint(endX, endY)],
      targetTouches: [touchPoint(endX, endY)],
      changedTouches: [touchPoint(endX, endY)]
    })
    await page.locator('.circuit-board').dispatchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [touchPoint(endX, endY)]
    })
    return
  }

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 8 })
  await page.mouse.up()
}

async function addPaletteDevice(page: Page, name: string) {
  const paletteItem = page.locator('.palette-item').filter({ hasText: name }).first()
  await paletteItem.scrollIntoViewIfNeeded()
  await paletteItem.locator('.small-action').click()
}

async function gotoWorkbench(page: Page) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle(/电工大师/)
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect(page.locator('.app-shell')).toContainText('Web / 小程序电路模拟控制台')
  await expect(page.locator('.run-state')).toContainText('回路接通')
}

test.describe('electric workbench e2e', () => {
  test('loads the connected circuit and toggles the main switch', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('转速 100%')
    await expectNoIconText(page)
    await expectDevicesInsideBoard(page)

    await page.locator('.toolbar .tool-button.primary').click()
    await expect(page.locator('.run-state')).toContainText('等待接通')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('未通电')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('未通电')

    await page.locator('.toolbar .tool-button.primary').click()
    await expect(page.locator('.run-state')).toContainText('回路接通')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('drags board components and switches a wire between smooth and orthogonal paths', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    const before = await devicePosition(page, '.device-lamp')
    await dragDevice(page, '.device-lamp', 92, 44)

    await expect.poll(async () => (await devicePosition(page, '.device-lamp')).left).toBeGreaterThan(before.left + 60)
    const after = await devicePosition(page, '.device-lamp')
    expect(after.top).toBeGreaterThan(before.top + 24)
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')
    await expectDevicesInsideBoard(page)

    const lampFeed = page.locator('.wire-toggle').filter({ hasText: '开关到灯泡' })
    await lampFeed.locator('.wire-copy').click()
    const styleControl = page.locator('.inspector-card').filter({ hasText: '开关到灯泡' }).locator('.segmented-control')
    await expect(styleControl).toBeVisible()

    await styleControl.locator('.style-button').filter({ hasText: '平滑' }).click()
    await expect(styleControl.locator('.style-button.is-active')).toContainText('平滑')
    await expect.poll(async () => page.locator('.wire-segment.is-smooth.is-selected').count()).toBeGreaterThan(0)

    await styleControl.locator('.style-button').filter({ hasText: '折线' }).click()
    await expect(styleControl.locator('.style-button.is-active')).toContainText('折线')
    await expect.poll(async () => page.locator('.wire-segment.is-smooth.is-selected').count()).toBe(0)
    await expect.poll(async () => page.locator('.wire-segment.is-orthogonal.is-selected').count()).toBeGreaterThan(0)

    await expectHealthyRuntime(runtimeProblems)
  })

  test('adds weak-current components as visual schematics and validates their effects', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await addPaletteDevice(page, '步进电机')
    await expect(page.locator('.device-stepper-motor')).toHaveCount(1)
    await expect(page.locator('.effect-pill').filter({ hasText: '步进电机' })).toContainText('步进运行 100%')

    await addPaletteDevice(page, '拨码开关')
    await expect(page.locator('.device-dip-switch')).toHaveCount(1)
    await expect(page.locator('.effect-pill').filter({ hasText: '拨码开关' })).toContainText('输入有效 100%')
    await expect(page.locator('.effect-pill')).toHaveCount(4)
    await expect(page.locator('.wire-toggle')).toHaveCount(9)
    await expectNoIconText(page)
    await expectDevicesInsideBoard(page)

    await expectHealthyRuntime(runtimeProblems)
  })

  test('disconnects one branch while other parallel loads keep running', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    const lampReturn = page.locator('.wire-toggle').filter({ hasText: '灯泡回负极' })
    await lampReturn.locator('.toggle-button').click()

    await expect(lampReturn).toContainText('已断开')
    await expect(page.locator('.run-state')).toContainText('回路接通')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('未通电')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('转速 100%')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('keeps the main workbench panels reachable on each compatibility viewport', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await expect(page.locator('.palette-panel')).toBeVisible()
    await expect(page.locator('.canvas-panel')).toBeVisible()
    await expect(page.locator('.inspector-panel')).toBeVisible()
    await expect(page.locator('.palette-item').filter({ hasText: '超声波测距' })).toHaveCount(1)
    await expect(page.locator('.palette-item').filter({ hasText: '温湿度传感器' })).toHaveCount(1)
    await expectNoIconText(page)
    await expectDevicesInsideBoard(page)

    await expectHealthyRuntime(runtimeProblems)
  })
})
