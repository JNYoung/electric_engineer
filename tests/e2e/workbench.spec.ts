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
  await page.locator(selector).scrollIntoViewIfNeeded()
  await page.locator(selector).evaluate((node, drag) => {
    const rect = node.getBoundingClientRect()
    const startX = rect.left + rect.width / 2
    const startY = rect.top + rect.height / 2
    const dispatchMouse = (target: EventTarget, type: string, x: number, y: number) => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      }))
    }

    dispatchMouse(node, 'mousedown', startX, startY)
    for (let step = 1; step <= 8; step += 1) {
      dispatchMouse(window, 'mousemove', startX + (drag.deltaX * step) / 8, startY + (drag.deltaY * step) / 8)
    }
    dispatchMouse(window, 'mouseup', startX + drag.deltaX, startY + drag.deltaY)
  }, { deltaX, deltaY })
}

async function isMobileViewport(page: Page) {
  return (page.viewportSize()?.width ?? await page.evaluate(() => window.innerWidth)) <= 760
}

async function waitForBoardLayoutReady(page: Page) {
  if (!(await isMobileViewport(page))) return

  await expect.poll(async () =>
    page.locator('.circuit-board').evaluate((board) => getComputedStyle(board).transform)
  ).not.toBe('none')
}

async function openMobileTab(page: Page, label: string) {
  const moduleIdByLabel: Record<string, string> = {
    学习: 'learn',
    仿真: 'simulate',
    题库: 'bank',
    素材: 'library',
    账号: 'account'
  }
  const moduleId = moduleIdByLabel[label]
  if (!moduleId) {
    throw new Error(`Unknown app module: ${label}`)
  }

  const button = (await isMobileViewport(page))
    ? page.locator(`.mobile-nav-button.nav-${moduleId}`)
    : page.locator(`.app-module-tab.module-${moduleId}`)
  await button.click()
  await expect(button).toHaveClass(/is-active/)
}

async function expectCircuitStatus(page: Page, status: string) {
  await expect(page.locator('.canvas-status-bar')).toContainText(status)
}

async function toggleMainSwitch(page: Page) {
  const switchButton = page.locator('.circuit-board .device-switch .inline-switch').first()
  await switchButton.scrollIntoViewIfNeeded()
  await switchButton.click()
}

async function addPaletteDevice(page: Page, name: string) {
  await openMobileTab(page, '素材')
  const paletteItem = page.locator('.palette-item').filter({ hasText: name }).first()
  await paletteItem.scrollIntoViewIfNeeded()
  await paletteItem.locator('.small-action').click()
  await openMobileTab(page, '仿真')
}

async function gotoWorkbench(page: Page) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle(/电工大师/)
  await expect(page.locator('.app-shell')).toBeVisible()
  await expectCircuitStatus(page, '回路接通')
  await waitForBoardLayoutReady(page)
}

test.describe('electric workbench e2e', () => {
  test('loads the connected circuit and toggles the main switch', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '仿真')
    const meterPanel = page.locator('.meter-panel')
    await expect(meterPanel).toContainText('虚拟万用表')
    await expect(meterPanel).toContainText('电源端电压')
    await expect(meterPanel).toContainText('照明灯支路电流')
    await expect(meterPanel).toContainText('支路电流和')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('转速 100%')
    await expectNoIconText(page)
    await expectDevicesInsideBoard(page)
    await expect(page.locator('.topbar')).toHaveCount(0)
    await expect(page.locator('.toolbar')).toHaveCount(0)
    await expect(page.locator('.canvas-status-bar')).toContainText('电流')
    await expect(page.locator('.canvas-status-bar')).toContainText('状态')
    const sourceVoltage = page.locator('.device-power-positive .node-voltage-control')
    await expect(sourceVoltage).toContainText('12V')
    await sourceVoltage.locator('.node-step-button').last().click()
    await expect(sourceVoltage).toContainText('13V')
    await expect(page.locator('.summary-card')).toContainText('13V DC')
    await sourceVoltage.locator('.node-step-button').first().click()
    await expect(sourceVoltage).toContainText('12V')

    await toggleMainSwitch(page)
    await expectCircuitStatus(page, '等待接通')
    await expect(meterPanel).toContainText('待接线')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('未通电')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('未通电')

    await toggleMainSwitch(page)
    await expectCircuitStatus(page, '回路接通')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('drags board components and switches a wire between smooth and orthogonal paths', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '仿真')
    const lampSelector = '.circuit-board .device-lamp'
    await page.locator(lampSelector).scrollIntoViewIfNeeded()
    const before = await devicePosition(page, lampSelector)
    await dragDevice(page, lampSelector, 92, 44)

    await expect.poll(async () => (await devicePosition(page, lampSelector)).left).toBeGreaterThan(before.left + 30)
    const after = await devicePosition(page, lampSelector)
    expect(after.top).toBeGreaterThan(before.top + 16)
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
    await openMobileTab(page, '仿真')
    const lampReturn = page.locator('.wire-toggle').filter({ hasText: '灯泡回负极' })
    await lampReturn.locator('.toggle-button').click()

    await expect(lampReturn).toContainText('已断开')
    await expectCircuitStatus(page, '回路接通')
    await expect(page.locator('.meter-panel')).toContainText('OL')
    await expect(page.locator('.meter-panel')).toContainText('接回 灯泡回负极')
    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('未通电')
    await expect(page.locator('.effect-pill').filter({ hasText: '排风扇' })).toContainText('转速 100%')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('loads a training challenge and updates the score after repair', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '学习')
    await expect(page.locator('.fault-scenario-panel')).toContainText('故障场景库')
    await expect(page.locator('.fault-scenario-panel')).toContainText('低压模块过压样本')
    await page.locator('.challenge-card').filter({ hasText: '照明支路排障' }).locator('.challenge-action').click()

    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('未通电')
    await expect(page.locator('.training-card')).toContainText('灯泡回线已接回负极')
    await expect(page.locator('.training-card')).toContainText('仍处于断开状态')

    const lampReturn = page.locator('.wire-toggle').filter({ hasText: '灯泡回负极' })
    await lampReturn.locator('.toggle-button').click()

    await expect(page.locator('.effect-pill').filter({ hasText: '照明灯' })).toContainText('亮度 100%')
    await expect(page.locator('.training-card')).toContainText('100%')

    await openMobileTab(page, '学习')
    await page.locator('.fault-scenario-card').filter({ hasText: '低压模块过压样本' }).locator('.scenario-action').click()
    await expect(page.locator('.safety-card')).toContainText('可能过压')
    await openMobileTab(page, '题库')
    await expect(page.locator('.knowledge-board')).toContainText('电工实操')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('answers knowledge questions across foundation and professional tracks', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '题库')
    await expect(page.locator('.knowledge-board')).toContainText('基础电学')
    await expect(page.locator('.knowledge-board')).toContainText('欧姆定律与电功率')
    const reviewNotebook = page.locator('.review-notebook-panel')
    const measurementPanel = page.locator('.measurement-panel')
    const formulaPanel = page.locator('.formula-panel')
    await expect(measurementPanel).toContainText('测量证据')
    await expect(measurementPanel).toContainText('可测量')
    await expect(measurementPanel).toContainText('照明灯电流')
    await expect(formulaPanel).toContainText('公式验算')
    await expect(formulaPanel).toContainText('可验算')
    await expect(formulaPanel).toContainText('I = U / R')
    await expect(formulaPanel).toContainText('P = U × I')
    await expect(reviewNotebook).toContainText('错题复训')
    await expect(reviewNotebook).toContainText('已清空')

    const ohmQuestion = page.locator('.knowledge-question').filter({ hasText: '欧姆定律计算' })
    await ohmQuestion.locator('.choice-button').filter({ hasText: '0.5A' }).click()
    await expect(ohmQuestion).toContainText('回答正确')
    await expect(page.locator('.knowledge-score')).toContainText('33%')

    const parallelQuestion = page.locator('.knowledge-question').filter({ hasText: '并联支路判断' })
    await parallelQuestion.locator('.choice-button').filter({ hasText: '各约 6V' }).click()
    await expect(parallelQuestion).toContainText('需要复盘')
    await expect(reviewNotebook).toContainText('待复训')
    await expect(reviewNotebook).toContainText('并联支路判断')
    await expect(reviewNotebook).toContainText('错选：各约 6V')
    await expect(reviewNotebook).toContainText('未完成')

    await page.locator('.knowledge-track-tab').filter({ hasText: '大学电路' }).click()
    await expect(page.locator('.knowledge-board')).toContainText('节点法与线性电路')
    await expect(page.locator('.simulation-check-list')).toContainText('KCL 电流守恒')
    await expect(measurementPanel).toContainText('KCL 误差')
    await expect(formulaPanel).toContainText('KCL 节点电流')
    await expect(formulaPanel).toContainText('Req = U / I总')
    const kclQuestion = page.locator('.knowledge-question').filter({ hasText: 'KCL 节点电流' })
    await kclQuestion.locator('.choice-button').filter({ hasText: '1.0A' }).click()
    await expect(kclQuestion).toContainText('回答正确')

    await page.locator('.knowledge-track-tab').filter({ hasText: '电工实操' }).click()
    await expect(page.locator('.knowledge-board')).toContainText('低压控制与安全排障')
    await expect(page.locator('.simulation-check-list')).toContainText('低压训练电源')
    await expect(measurementPanel).toContainText('训练电源')
    await expect(measurementPanel).toContainText('保护器件')
    await expect(formulaPanel).toContainText('低压训练电源')
    await expect(formulaPanel).toContainText('保护链计数')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('runs professional assessment sessions and exposes material specs', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '素材')
    await expect(page.locator('.material-spec-panel')).toContainText('素材规格速查')
    await expect(page.locator('.material-spec-panel')).toContainText('照明灯')
    await expect(page.locator('.material-spec-panel')).toContainText('PLC 控制器')
    await expect(page.locator('.material-finder-panel')).toContainText('素材训练检索')
    await page.locator('.material-finder-panel').locator('.material-query-button').filter({ hasText: 'NPN' }).click()
    await expect(page.locator('.material-finder-panel')).toContainText('接近开关')
    await expect(page.locator('.material-finder-panel')).toContainText('NPN/PNP')
    await expect(page.locator('.material-kit-panel')).toContainText('素材实训包')
    await expect(page.locator('.material-kit-panel')).toContainText('电工低压控制排障包')
    await expect(page.locator('.material-kit-panel')).toContainText('素材齐备')
    await expect(page.locator('.material-kit-panel')).toContainText('电磁阀')

    await openMobileTab(page, '题库')
    await expect(page.locator('.assessment-board')).toContainText('专业考试模拟')
    await expect(page.locator('.assessment-board')).toContainText('基础电学能力测验')
    await expect(page.locator('.assessment-board')).toContainText('仿真准备度')
    await expect(page.locator('.assessment-board')).toContainText('3/3')
    await expect(page.locator('.assessment-board')).toContainText('练习复盘')
    await expect(page.locator('.assessment-board')).toContainText('未开始')
    const stationPanel = page.locator('.station-panel')
    await expect(stationPanel).toContainText('考试工位')
    await expect(stationPanel).toContainText('待补证据')
    await expect(stationPanel).toContainText('理论答题')
    await expect(stationPanel).toContainText('仪表证据')
    const certificationPanel = page.locator('.certification-panel')
    await expect(certificationPanel).toContainText('认证准入')
    await expect(certificationPanel).toContainText('基础电学测验准入')
    await expect(certificationPanel).toContainText('待完成')

    await page.locator('.assessment-question').filter({ hasText: '欧姆定律计算' }).locator('.choice-button').filter({ hasText: '0.5A' }).click()
    await page.locator('.assessment-question').filter({ hasText: '并联支路判断' }).locator('.choice-button').filter({ hasText: '各约 12V' }).click()
    await page.locator('.assessment-question').filter({ hasText: '电功率意义' }).locator('.choice-button').filter({ hasText: '通常增大' }).click()
    await expect(stationPanel).toContainText('可提交')
    await expect(stationPanel).toContainText('3/3')
    await expect(certificationPanel).toContainText('可提交')
    await expect(certificationPanel).toContainText('3/3')

    await openMobileTab(page, '仿真')
    await toggleMainSwitch(page)
    await openMobileTab(page, '题库')
    await expect(page.locator('.assessment-board')).toContainText('当前没有形成可测工作电流')
    await expect(page.locator('.assessment-board')).toContainText('闭合主开关')
    await expect(stationPanel).toContainText('待补证据')
    await expect(certificationPanel).toContainText('待补仿真')
    await openMobileTab(page, '仿真')
    await toggleMainSwitch(page)
    await openMobileTab(page, '题库')

    await page.locator('.assessment-tab').filter({ hasText: '电工取证' }).click()
    await expect(page.locator('.assessment-board')).toContainText('电工实操取证模拟')
    await expect(page.locator('.assessment-metrics')).toContainText('85%')
    await expect(page.locator('.assessment-board')).toContainText('4/4')
    await expect(page.locator('.assessment-board')).toContainText('安全隔离')
    await expect(page.locator('.assessment-board')).toContainText('低压训练电源')

    const lockoutQuestion = page.locator('.assessment-question').filter({ hasText: '排障流程' })
    await lockoutQuestion.locator('.choice-button').filter({ hasText: '先断电并确认无危险' }).click()
    await expect(lockoutQuestion).toContainText('计分通过')
    await expect(page.locator('.assessment-metrics')).toContainText('25/110')
    await expect(page.locator('.practice-report-panel')).toContainText('进行中')
    await expect(page.locator('.practice-report-panel')).toContainText('完成20%')
    await expect(page.locator('.practice-report-panel')).toContainText('正确100%')

    await openMobileTab(page, '素材')
    await page.locator('.mobile-section-library .domain-tab').filter({ hasText: '装修工控' }).click()
    await expect(page.locator('.material-spec-panel')).toContainText('智能网关')
    await expect(page.locator('.material-kit-panel')).toContainText('装修智能联动包')
    await expect(page.locator('.material-kit-panel')).toContainText('窗帘电机')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('switches commercial domains and exposes auth and billing hooks', async ({ page }) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)
    await openMobileTab(page, '素材')
    await expect(page.locator('.mobile-section-library .commercial-dashboard')).toContainText('工程工控')
    await expect(page.locator('.mobile-section-library .commercial-dashboard')).toContainText('已解锁')
    await expect(page.locator('.mobile-section-library .commercial-dashboard')).toContainText('待解锁')
    await expect(page.locator('.palette-panel')).toContainText('PLC 控制器')
    await expect(page.locator('.palette-panel')).toContainText('断路器')
    await expect(page.locator('.palette-panel')).toContainText('开关电源')
    await expect(page.locator('.palette-panel')).toContainText('三相异步电动机')
    await openMobileTab(page, '账号')
    await expect(page.locator('.commerce-panel')).toContainText('账户与权益')
    await expect(page.locator('.commerce-panel')).toContainText('待解锁：PLC 控制器')
    await expect(page.locator('.feature-gate-row').filter({ hasText: '高级工程工控元件' })).toContainText('专业版')
    await expect(page.locator('.commerce-panel')).not.toContainText('/api/')

    await openMobileTab(page, '素材')
    await page.locator('.mobile-section-library .domain-tab').filter({ hasText: '装修工控' }).click()
    await expect(page.locator('.palette-panel')).toContainText('装修工控元件库')
    await expect(page.locator('.palette-item').filter({ hasText: '智能开关面板' })).toHaveCount(1)

    await openMobileTab(page, '账号')
    await expect(page.locator('.commerce-panel')).toContainText('账户与权益')
    await expect(page.locator('.commerce-panel')).toContainText('待解锁：门禁控制器')
    await expect(page.locator('.feature-gate-row').filter({ hasText: '项目导出' })).toContainText('专业版')
    await expect(page.locator('.commerce-panel')).not.toContainText('/api/')
    await page.locator('.plan-card').filter({ hasText: '专业版' }).locator('.plan-action').click()
    await expect(page.locator('.commerce-panel')).toContainText('专业版账号')
    await expect(page.locator('.commerce-panel')).toContainText('开通团队版')
    await expect(page.locator('.feature-gate-row').filter({ hasText: '项目导出' })).toContainText('已解锁')

    await expectHealthyRuntime(runtimeProblems)
  })

  test('keeps the main workbench panels reachable on each compatibility viewport', async ({ page }, testInfo) => {
    const runtimeProblems = watchRuntimeHealth(page)

    await gotoWorkbench(page)

    if (testInfo.project.name.includes('mobile')) {
      await expect(page.locator('.canvas-status-bar')).toBeVisible()
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
      await expect(page.locator('.canvas-panel')).toBeVisible()
      await expect(page.locator('.inspector-panel')).toBeVisible()
      await expect(page.locator('.meter-panel')).toBeVisible()
      await expect(page.locator('.palette-panel')).not.toBeVisible()
      await expectDevicesInsideBoard(page)

      await openMobileTab(page, '学习')
      await expect(page.locator('.learning-dashboard')).toBeVisible()
      await expect(page.locator('.canvas-panel')).not.toBeVisible()

      await openMobileTab(page, '素材')
      await expect(page.locator('.palette-panel')).toBeVisible()
      await expect(page.locator('.material-spec-panel')).toBeVisible()
      await expect(page.locator('.canvas-panel')).not.toBeVisible()
      await expect(page.locator('.palette-item').filter({ hasText: '超声波测距' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '温湿度传感器' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '断路器' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '三相异步电动机' })).toHaveCount(1)

      await openMobileTab(page, '题库')
      await expect(page.locator('.knowledge-board')).toBeVisible()
      await expect(page.locator('.assessment-board')).toBeVisible()
      await expect(page.locator('.workspace')).not.toBeVisible()

      await openMobileTab(page, '账号')
      await expect(page.locator('.commerce-panel')).toBeVisible()
      await expect(page.locator('.canvas-panel')).not.toBeVisible()
    } else {
      await expect(page.locator('.app-module-nav')).toBeVisible()
      await expect(page.locator('.app-module-tab.module-simulate')).toHaveClass(/is-active/)
      await expect(page.locator('.canvas-panel')).toBeVisible()
      await expect(page.locator('.inspector-panel')).toBeVisible()
      await expect(page.locator('.palette-panel')).not.toBeVisible()
      await expectDevicesInsideBoard(page)

      await openMobileTab(page, '素材')
      await expect(page.locator('.palette-panel')).toBeVisible()
      await expect(page.locator('.material-spec-panel')).toBeVisible()
      await expect(page.locator('.canvas-panel')).not.toBeVisible()
      await expect(page.locator('.palette-item').filter({ hasText: '超声波测距' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '温湿度传感器' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '断路器' })).toHaveCount(1)
      await expect(page.locator('.palette-item').filter({ hasText: '三相异步电动机' })).toHaveCount(1)
    }
    await expectNoIconText(page)

    await expectHealthyRuntime(runtimeProblems)
  })
})
