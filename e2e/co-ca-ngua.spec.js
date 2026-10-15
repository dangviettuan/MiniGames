import { test, expect } from '@playwright/test'

async function prepare(page, rolls) {
  // Browser randomness only: game state stays private and every move uses the UI.
  await page.addInitScript(values => {
    const original = crypto.getRandomValues.bind(crypto)
    let cursor = 0
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1 && cursor < values.length) {
        array[0] = Math.floor((values[cursor++] - 0.5) / 6 * 4294967296)
        return array
      }
      return original(array)
    }
  }, rolls)
  await page.goto('./#co-ca-ngua')
}
const roll = page => page.getByRole('button', { name: 'Gieo xúc xắc', exact: true }).click()
async function chooseAndMove(page, horse) {
  const panel = page.getByRole('complementary', { name: 'Chọn nước đi' })
  await panel.getByRole('button', { name: new RegExp(`^Ngựa ${horse + 1} `) }).click()
  await page.getByRole('button', { name: new RegExp(`^Đi ngựa ${horse + 1} →`) }).click()
}

test('rules, blocking, dice replay, selection, undo/redo and reset', async ({ page }) => {
  await prepare(page, [6, 1, 2])
  await expect(page.getByRole('heading', { name: 'Chọn luật trước khi chơi' })).toBeVisible()
  await expect(page.getByText(/3, 4, 5, 6/)).toBeVisible()
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  const board = page.getByRole('group', { name: 'Bàn cờ cá ngựa, đường đua 56 ô' })
  await expect(board.getByRole('button', { name: /^Ô đường đua / })).toHaveCount(56)
  // Board and the complete turn loop must be visible together: no turn-by-turn scrolling.
  await expect(board).toBeInViewport({ ratio: page.viewportSize().width < 761 ? 1 : 0.5 })
  await expect(page.getByRole('button', { name: 'Gieo xúc xắc', exact: true })).toBeInViewport()
  await expect(page.getByRole('complementary', { name: 'Chọn nước đi' }).getByRole('button', { name: /^Ngựa 1 / })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Chọn một ngựa để đi' })).toBeInViewport()
  await roll(page)
  await expect(board).toBeInViewport({ ratio: page.viewportSize().width < 761 ? 1 : 0.5 })
  await expect(page.getByRole('button', { name: 'Gieo xúc xắc', exact: true })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('complementary', { name: 'Chọn nước đi' }).getByRole('button', { name: /^Ngựa 1 / })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Chọn một ngựa để đi' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Gieo xúc xắc', exact: true })).toBeDisabled()
  await page.getByRole('complementary', { name: 'Chọn nước đi' }).getByRole('button', { name: /^Ngựa 1 / }).click()
  await board.getByRole('button', { name: /Ô đường đua 1, trống, có thể đi tới/ }).click()
  await expect(board.getByRole('button', { name: 'Ô đường đua 1, Đỏ ngựa 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByLabel('Xúc xắc 6', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(board.getByRole('button', { name: 'Ô đường đua 1, Đỏ ngựa 1' })).toBeVisible()
  await roll(page)
  // Own horse blocks the starting square: only horse 1 can move.
  await expect(page.getByRole('complementary', { name: 'Chọn nước đi' }).getByRole('button', { name: /^Ngựa 2 / })).toBeDisabled()
  await chooseAndMove(page, 0)
  await expect(page.getByText('Lượt Vàng', { exact: true })).toBeVisible()
  await roll(page)
  await expect(page.getByRole('status')).toContainText('không có nước hợp lệ')
  await expect(page.getByText('Lượt Đỏ', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await roll(page)
  await expect(page.getByLabel('Xúc xắc 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('không có nước hợp lệ')
  const size = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: innerWidth }))
  expect(size.doc).toBeLessThanOrEqual(size.viewport)
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp tục ván này' }).click()
  await expect(board).toBeVisible()
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click()
  await page.getByRole('button', { name: 'Đồng ý, chọn lại luật' }).click()
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled()
})

test('four-player setup with six-only rule automatically skips unusable roll', async ({ page }) => {
  await prepare(page, [1, 6])
  await page.getByLabel('Số người chơi').selectOption('4')
  await page.getByLabel('Ra chuồng khi gieo').selectOption('six')
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  await roll(page)
  await expect(page.getByText('Lượt Xanh lá', { exact: true })).toBeVisible()
  await roll(page)
  await chooseAndMove(page, 0)
  await expect(page.getByRole('button', { name: 'Ô đường đua 15, Xanh lá ngựa 1' })).toBeVisible()
  await expect(page.getByText('Lượt Xanh lá', { exact: true })).toBeVisible()
})

test('complete a legal staged-home win and undo/redo the terminal move', async ({ page }) => {
  test.setTimeout(120_000)
  const actions = [
    ...[6, ...Array(10).fill(6), 1].map(die => ({ horse: 0, die })),
    { die: 2 },
    ...[6, ...Array(10).fill(6)].map(die => ({ horse: 1, die })),
    ...[6, ...Array(9).fill(6), 5].map(die => ({ horse: 2, die })),
    { die: 2 },
    ...[6, ...Array(9).fill(6), 4].map(die => ({ horse: 3, die })),
  ]
  await prepare(page, actions.map(a => a.die))
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  for (const action of actions) {
    await roll(page)
    if (action.horse !== undefined) await chooseAndMove(page, action.horse)
  }
  await expect(page.getByRole('status')).toContainText('Đỏ chiến thắng!')
  await expect(page.getByRole('button', { name: 'Gieo xúc xắc', exact: true })).toBeDisabled()
  for (const [slot, horse] of [[3, 4], [4, 3], [5, 2], [6, 1]]) {
    await expect(page.getByRole('button', { name: `Đích Đỏ ô ${slot}, ngựa ${horse}`, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('status')).not.toContainText('chiến thắng')
  await expect(page.getByLabel('Xúc xắc 4', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Đỏ chiến thắng!')
})

test('landing on an opponent starting square captures and undo/redo restores both horses', async ({ page }) => {
  const rolls = [6, 6, 6, 6, 6, 3, 1, 1]
  await prepare(page, rolls)
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  for (let i = 0; i < rolls.length; i++) {
    await roll(page)
    await chooseAndMove(page, 0)
  }
  await expect(page.getByRole('status')).toContainText('Đá ngựa Vàng về chuồng')
  await expect(page.getByRole('button', { name: 'Vàng ngựa 1 trong chuồng', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ô đường đua 29, Đỏ ngựa 1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ô đường đua 29, Vàng ngựa 1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Vàng ngựa 1 trong chuồng', exact: true })).toBeVisible()
})

test('393px phone keeps full board and whole turn dock visible without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 })
  await prepare(page, [6])
  await page.getByLabel('Số người chơi').selectOption('4')
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click()
  const board = page.getByRole('group', { name: 'Bàn cờ cá ngựa, đường đua 56 ô' })
  const panel = page.getByRole('complementary', { name: 'Chọn nước đi' })
  for (let step = 0; step < 2; step++) {
    await expect(board).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Gieo xúc xắc', exact: true })).toBeInViewport({ ratio: 1 })
    for (let horse = 1; horse <= 4; horse++) {
      await expect(panel.getByRole('button', { name: new RegExp(`^Ngựa ${horse} `) })).toBeInViewport({ ratio: 1 })
    }
    await expect(page.getByRole('button', { name: 'Chọn một ngựa để đi' })).toBeInViewport({ ratio: 1 })
    if (step === 0) await roll(page)
  }
  await chooseAndMove(page, 0)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await expect(board).toBeInViewport({ ratio: 1 })
})
