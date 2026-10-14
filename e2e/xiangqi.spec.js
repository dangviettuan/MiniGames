import { test, expect } from '@playwright/test'

const boardFor = page => page.getByRole('grid', { name: 'Bàn cờ tướng' })
const cell = (page, r, c) => boardFor(page).locator('button').nth(r * 9 + c)
async function move(page, from, to) {
 await cell(page, ...from).click()
 await expect(cell(page, ...to)).toHaveAttribute('aria-label', /có thể đi tới/)
 await cell(page, ...to).click()
}

test.beforeEach(async ({ page }) => { await page.goto('./#xiangqi') })

test('legal alternating moves, capture, Undo and Redo restore board and turn', async ({ page }) => {
 await expect(boardFor(page).locator('button')).toHaveCount(90)
 await move(page, [6,0], [5,0])
 await move(page, [3,0], [4,0])
 await move(page, [5,0], [4,0])
 await expect(cell(page,4,0)).toHaveAttribute('aria-label', /Đỏ soldier/)
 await expect(page.getByRole('status')).toContainText('Đen')
 await page.getByRole('button', { name: /Undo/ }).click()
 await expect(cell(page,4,0)).toHaveAttribute('aria-label', /Đen soldier/)
 await expect(cell(page,5,0)).toHaveAttribute('aria-label', /Đỏ soldier/)
 await expect(page.getByRole('status')).toContainText('Đỏ')
 await page.getByRole('button', { name: /Redo/ }).click()
 await expect(cell(page,4,0)).toHaveAttribute('aria-label', /Đỏ soldier/)
 await expect(cell(page,5,0)).toHaveAttribute('aria-label', /trống/)
 await expect(page.locator('.history .item')).toHaveCount(3)
})

test('illegal moves, opponent selection and deselection leave turn and history intact', async ({ page }) => {
 await cell(page,3,0).click()
 await expect(boardFor(page).locator('[aria-pressed="true"]')).toHaveCount(0)
 await cell(page,6,0).click()
 await expect(cell(page,6,1)).not.toHaveAttribute('aria-label', /có thể đi tới/)
 await cell(page,6,1).click()
 await expect(cell(page,6,0)).toHaveAttribute('aria-label', /Đỏ soldier/)
 await expect(page.getByRole('button', { name: /Undo/ })).toBeDisabled()
 await cell(page,6,0).click()
 await expect(cell(page,6,0)).toHaveAttribute('aria-pressed','true')
 await cell(page,6,0).click()
 await expect(cell(page,6,0)).toHaveAttribute('aria-pressed','false')
 await expect(page.getByRole('status')).toContainText('Bình thường')
})

test('new move after Undo discards Redo branch and new game resets everything', async ({ page }) => {
 await move(page,[6,0],[5,0]); await move(page,[3,0],[4,0])
 await page.getByRole('button', { name: /Undo/ }).click()
 await move(page,[3,2],[4,2])
 await expect(page.getByRole('button', { name: /Redo/ })).toBeDisabled()
 await expect(cell(page,3,0)).toHaveAttribute('aria-label', /Đen soldier/)
 await expect(page.locator('.history .item')).toHaveCount(2)
 await cell(page,6,2).click()
 await page.getByRole('button', { name: 'Ván mới' }).click()
 await expect(cell(page,6,0)).toHaveAttribute('aria-label', /Đỏ soldier/)
 await expect(cell(page,3,2)).toHaveAttribute('aria-label', /Đen soldier/)
 await expect(page.getByRole('button', { name: /Undo/ })).toBeDisabled()
 await expect(page.getByRole('button', { name: /Redo/ })).toBeDisabled()
 await expect(boardFor(page).locator('[aria-pressed="true"]')).toHaveCount(0)
 await expect(page.locator('.history .item')).toHaveCount(0)
})

test('real double cannon checkmate locks play, Undo reopens and Redo restores win', async ({ page }) => {
 // Cooperative legal play from the standard opening. No injected boards or test hooks.
 const game = [
  [[6,4],[5,4]], [[3,0],[4,0]], [[5,4],[4,4]], [[3,8],[4,8]],
  [[4,4],[4,3]], [[3,4],[4,4]], [[7,7],[4,7]], [[4,4],[5,4]],
  [[4,7],[4,4]], [[5,4],[5,3]], [[7,1],[7,2]], [[5,3],[6,3]],
  [[7,2],[7,1]], [[6,3],[7,3]], [[9,0],[8,0]], [[7,3],[8,3]], [[7,1],[7,4]],
 ]
 for (const [from,to] of game) await move(page,from,to)
 await expect(page.getByRole('status')).toContainText('Thắng: Đỏ • Chiếu bí')
 await expect(page.locator('.history .item')).toHaveCount(17)
 await cell(page,0,4).click()
 await expect(boardFor(page).locator('[aria-pressed="true"]')).toHaveCount(0)
 await page.getByRole('button', { name: /Undo/ }).click()
 await expect(page.getByRole('status')).not.toContainText('Thắng:')
 await expect(cell(page,7,1)).toHaveAttribute('aria-label', /Đỏ cannon/)
 await page.getByRole('button', { name: /Redo/ }).click()
 await expect(page.getByRole('status')).toContainText('Thắng: Đỏ • Chiếu bí')
 await page.getByRole('button', { name: 'Ván mới' }).click()
 await expect(page.getByRole('status')).toContainText('Bình thường')
 await expect(page.getByRole('button', { name: /Undo/ })).toBeDisabled()
})

test('board remains inside viewport with distinct touch cells and no page errors', async ({ page }) => {
 const errors=[]; page.on('pageerror', error=>errors.push(error.message))
 const board=boardFor(page), bounds=await board.boundingBox(), viewport=page.viewportSize()
 expect(bounds.width).toBeGreaterThan(250)
 expect(bounds.x).toBeGreaterThanOrEqual(0)
 expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const first=await cell(page,0,0).boundingBox(), last=await cell(page,9,8).boundingBox()
 expect(first.width).toBeGreaterThan(27)
 expect(first.x+first.width).toBeLessThan(last.x)
 await move(page,[9,1],[7,2])
 expect(errors).toEqual([])
})
