import { test, expect } from '@playwright/test'

test('game navigation preserves each active board and browser history', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  const board = page.getByRole('grid', {name:'Bàn cờ tướng'})
  await board.getByRole('button',{name:/Hàng 7, cột 1, Đỏ soldier/}).click()
  await board.getByRole('button',{name:/Hàng 6, cột 1, trống/}).click()
  const links = page.getByRole('navigation',{name:'Chọn trò chơi'}).getByRole('link')
  const count = await links.count()
  for (let i = 1; i < count; i++) {
    const link = links.nth(i)
    await link.click()
    await expect(link).toHaveAttribute('aria-current','page')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await testInfo.attach(`game-${i}`, {body:await page.screenshot(),contentType:'image/png'})
  }
  await links.first().click()
  await expect(board.getByRole('button',{name:/Hàng 6, cột 1, Đỏ soldier/})).toBeVisible()
  await expect(page.getByRole('button',{name:/Undo|Hoàn tác|Đi lại/})).toBeEnabled()
  await testInfo.attach('xiangqi', {body:await page.screenshot(),contentType:'image/png'})
  if (count > 1) {
    await page.goBack()
    await expect(links.nth(count-1)).toHaveAttribute('aria-current','page')
    await page.goForward()
    await expect(links.first()).toHaveAttribute('aria-current','page')
  }
  expect(errors).toEqual([])
})

test('every available game fits a narrow phone without horizontal page scrolling', async ({page}) => {
  await page.setViewportSize({width:320,height:740})
  await page.goto('./')
  const links = page.getByRole('navigation',{name:'Chọn trò chơi'}).getByRole('link')
  for (let i=0;i<await links.count();i++) {
    await links.nth(i).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
