import {test,expect} from '@playwright/test'
const profiles=[['laptop',1366,768],['ipad-portrait',834,1194],['ipad-landscape',1194,834],['phone',393,851],['small-phone',360,640],['phone-landscape',851,393]]
for(const [profile,width,height] of profiles){
 test(`playable boards and controls stay usable at ${profile}`,async({page},testInfo)=>{
  test.setTimeout(60_000)
  await page.setViewportSize({width,height})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('./#xiangqi')
  const nav=page.getByRole('navigation',{name:'Chọn trò chơi'})
  for(const id of ['xiangqi','chess','go','co-ca-ngua']){
   await nav.locator(`a[href="#${id}"]`).click()
   if(id==='co-ca-ngua')await page.getByRole('button',{name:'Bắt đầu chơi',exact:true}).click()
   const screen=page.locator(`.play-${id}`),board=screen.locator('.play-board-frame')
   await expect(board).toBeInViewport({ratio:1})
   const bounds=await board.boundingBox()
   expect(bounds.width).toBeGreaterThanOrEqual(id==='xiangqi'?240:Math.min(width-40,280))
   await expect(screen.getByRole('status')).toBeInViewport()
   await expect(screen.locator('.play-controls')).toBeInViewport({ratio:1})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   if(['laptop','phone','phone-landscape','small-phone'].includes(profile))await testInfo.attach(`${id}-${profile}`,{body:await page.screenshot(),contentType:'image/png'})
  }
  expect(errors).toEqual([])
 })
}

test('options close after actions, outside click and Escape without losing the game',async({page})=>{
 await page.goto('./#chess')
 await page.locator('[data-square=e2]').click();await page.locator('[data-square=e4]').click()
 const tools=page.locator('.play-chess .play-tools'),summary=tools.locator('summary')
 await summary.click();await tools.getByRole('button',{name:'Xoay bàn',exact:true}).click()
 await expect(tools).not.toHaveAttribute('open','')
 await expect(page.getByRole('grid',{name:'Bàn cờ vua'}).locator('button').first()).toHaveAttribute('data-square','h1')
 await summary.click();await page.locator('[data-square=e5]').click()
 await expect(tools).not.toHaveAttribute('open','')
 await expect(page.locator('[data-square=e4]')).toHaveAttribute('aria-label',/Trắng Tốt/)
 await summary.click();await page.keyboard.press('Escape')
 await expect(tools).not.toHaveAttribute('open','')
 await expect(summary).toBeFocused()
})

test('unavailable browser storage warns the player and still allows legal play',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}}))
 await page.goto('./#xiangqi')
 await expect(page.locator('.play-xiangqi .play-save-warning')).toBeVisible()
 const board=page.getByRole('grid',{name:'Bàn cờ tướng'})
 await board.locator('[data-row="6"][data-col="0"]').click()
 await board.locator('[data-row="5"][data-col="0"]').click()
 await expect(board.locator('[data-row="5"][data-col="0"]')).toHaveAttribute('aria-label',/Đỏ soldier/)
 await expect(page.getByRole('status')).toContainText('Đen')
})


test('small Go overview clearly offers a playable zoom before selecting intersections',async({page,hasTouch})=>{
 await page.setViewportSize({width:360,height:640})
 await page.goto('./#go')
 await page.getByRole('button',{name:'Bỏ lượt',exact:true}).click()
 await page.getByRole('button',{name:'Bỏ lượt',exact:true}).click()
 const prompt=page.getByRole('button',{name:'Phóng to để chọn giao điểm',exact:true})
 await expect(prompt).toBeInViewport({ratio:1})
 if(hasTouch)await prompt.tap();else await prompt.click()
 await expect(prompt).not.toBeVisible()
 await expect(page.getByRole('button',{name:'Toàn bàn',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Chơi tiếp',exact:true}).click()
 const target=page.getByTestId('go-0-0')
 const box=await target.boundingBox();expect(box.width).toBeGreaterThanOrEqual(32)
 if(hasTouch)await target.tap();else await target.click()
 await expect(target).toHaveAttribute('aria-label',/Đen/)
})
