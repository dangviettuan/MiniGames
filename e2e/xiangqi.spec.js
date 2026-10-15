import { test, expect } from '@playwright/test'
const boardFor=page=>page.getByRole('grid',{name:'Bàn cờ tướng'})
const cell=(page,r,c)=>boardFor(page).locator(`[data-row="${r}"][data-col="${c}"]`)
async function press(page,locator){await expect(locator).toBeInViewport({ratio:1});if(await page.evaluate(()=>navigator.maxTouchPoints>0))await locator.tap();else await locator.click()}
async function move(page,from,to){await press(page,cell(page,...from));await expect(cell(page,...to)).toHaveAttribute('aria-label',/có thể đi tới/);await press(page,cell(page,...to))}
async function tools(page){await press(page,page.getByLabel('Tùy chọn Cờ tướng',{exact:true}))}
async function fullPlayVisible(page){await expect(boardFor(page)).toBeInViewport({ratio:1});for(const name of [/Undo/,/Redo/,'Xoay bàn'])await expect(page.getByRole('button',{name})).toBeInViewport({ratio:1});await expect(page.getByRole('status')).toBeInViewport({ratio:1});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>scrollY)).toBe(0)}
const mate=[[[6,4],[5,4]],[[3,0],[4,0]],[[5,4],[4,4]],[[3,8],[4,8]],[[4,4],[4,3]],[[3,4],[4,4]],[[7,7],[4,7]],[[4,4],[5,4]],[[4,7],[4,4]],[[5,4],[5,3]],[[7,1],[7,2]],[[5,3],[6,3]],[[7,2],[7,1]],[[6,3],[7,3]],[[9,0],[8,0]],[[7,3],[8,3]],[[7,1],[7,4]]]
test.beforeEach(async({page})=>{await page.goto('./#xiangqi')})

test('alternating capture, last-move highlights, Undo and Redo restore pieces',async({page})=>{
 await fullPlayVisible(page);await move(page,[6,0],[5,0]);await move(page,[3,0],[4,0]);await move(page,[5,0],[4,0])
 await expect(cell(page,4,0)).toHaveAttribute('aria-label',/Đỏ soldier/)
 await expect(cell(page,5,0)).toHaveClass(/xq-last-origin/);await expect(cell(page,4,0)).toHaveClass(/xq-last-destination/)
 await press(page,page.getByRole('button',{name:/Undo/}));await expect(cell(page,4,0)).toHaveAttribute('aria-label',/Đen soldier/)
 await press(page,page.getByRole('button',{name:/Redo/}));await expect(cell(page,4,0)).toHaveAttribute('aria-label',/Đỏ soldier/);await fullPlayVisible(page)
})
test('invalid moves give feedback, selected Vietnamese piece and capture ring are clear',async({page})=>{
 await press(page,cell(page,6,0));await expect(page.getByRole('status')).toContainText('Đã chọn Tốt Đỏ')
 await press(page,cell(page,6,1));await expect(page.getByRole('alert')).toContainText('Nước đi không hợp lệ');await expect(cell(page,6,0)).toHaveAttribute('aria-pressed','true')
 await press(page,cell(page,6,0));await expect(cell(page,6,0)).toHaveAttribute('aria-pressed','false')
 await move(page,[6,0],[5,0]);await move(page,[3,0],[4,0]);await press(page,cell(page,5,0));await expect(cell(page,4,0)).toHaveClass(/xq-capture/);await fullPlayVisible(page)
})
test('reload preserves cursor, redo branch and orientation; new move truncates branch',async({page})=>{
 await move(page,[6,0],[5,0]);await move(page,[3,0],[4,0]);await press(page,page.getByRole('button',{name:/Undo/}));await press(page,page.getByRole('button',{name:'Xoay bàn'}))
 await page.reload();await expect(boardFor(page)).toHaveAttribute('data-flipped','true');await expect(cell(page,5,0)).toHaveAttribute('aria-label',/Đỏ soldier/);await expect(page.getByRole('button',{name:/Redo/})).toBeEnabled()
 await press(page,page.getByRole('button',{name:/Redo/}));await expect(cell(page,4,0)).toHaveAttribute('aria-label',/Đen soldier/)
 await press(page,page.getByRole('button',{name:/Undo/}));await move(page,[3,2],[4,2]);await expect(page.getByRole('button',{name:/Redo/})).toBeDisabled();await fullPlayVisible(page)
})
test('tools coordinate toggle, rotation, cancel-safe and confirmed new game',async({page})=>{
 await move(page,[6,0],[5,0]);await tools(page);await page.getByLabel('Hiện tọa độ hàng,cột').check();await expect(page.locator('.xq-coordinate')).toHaveCount(90)
 await page.getByRole('button',{name:'Ván mới',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Tiếp tục ván này'}).click();await expect(cell(page,5,0)).toHaveAttribute('aria-label',/Đỏ soldier/)
 await tools(page);await page.getByRole('button',{name:'Ván mới',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Tạo ván mới',exact:true}).click()
 await expect(cell(page,6,0)).toHaveAttribute('aria-label',/Đỏ soldier/);await expect(page.getByRole('button',{name:/Undo/})).toBeDisabled();await expect(page.getByRole('button',{name:/Redo/})).toBeDisabled()
})
test('legal double cannon mate persists terminal result and Undo/Redo works after reload',async({page})=>{
 for(const[from,to]of mate)await move(page,from,to)
 await expect(page.getByRole('status')).toContainText('Thắng: Đỏ • Chiếu bí');await fullPlayVisible(page);await page.reload();await expect(page.getByRole('status')).toContainText('Thắng: Đỏ • Chiếu bí')
 await press(page,cell(page,0,4));await expect(boardFor(page).locator('[aria-pressed="true"]')).toHaveCount(0)
 await press(page,page.getByRole('button',{name:/Undo/}));await expect(page.getByRole('status')).not.toContainText('Thắng:')
 await press(page,page.getByRole('button',{name:/Redo/}));await expect(page.getByRole('status')).toContainText('Thắng: Đỏ • Chiếu bí')
})
test('corrupted saved record safely returns to opening',async({page})=>{
 await page.evaluate(()=>localStorage.setItem('minigames:game:v1:xiangqi',JSON.stringify({version:1,data:{board:null,turn:'wrong',timeline:[{}],cursor:1}})));await page.reload()
 await expect(cell(page,6,0)).toHaveAttribute('aria-label',/Đỏ soldier/);await expect(page.getByRole('button',{name:/Undo/})).toBeDisabled();await move(page,[6,0],[5,0])
})
test('whole board, status and controls fit laptop, tablet and small phone profiles without scrolling',async({page},testInfo)=>{
 for(const[width,height]of [[1366,768],[1194,834],[834,1194],[393,851],[360,640],[851,393]]){
  await page.setViewportSize({width,height});await fullPlayVisible(page);await move(page,[6,2],[5,2]);await press(page,page.getByRole('button',{name:/Undo/}));await press(page,cell(page,6,2));await press(page,cell(page,6,3));await expect(page.getByRole('alert')).toBeInViewport({ratio:1});await press(page,cell(page,6,2));await fullPlayVisible(page);await page.screenshot({path:testInfo.outputPath(`xiangqi-${width}x${height}.png`)})
 }
})
