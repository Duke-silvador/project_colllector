import asyncio
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':1100,'height':820},device_scale_factor=1)
  errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda msg: errors.append('console '+msg.text) if msg.type=='error' else None)
  await page.goto('http://127.0.0.1:8765/index.html',wait_until='domcontentloaded')
  await page.wait_for_timeout(750)
  print('HOME',await page.title(),'errors=',errors)
  for game in ['checkers','reversi','connect4','fox','saut','north','nim','chess2','chess4']:
   await page.locator('[data-open-game="'+game+'"]').first.click()
   await page.wait_for_timeout(250)
   viewport=page.locator('#board-3d-viewport');cl=await viewport.get_attribute('class');cv=viewport.locator('canvas.webgl-board')
   view=await viewport.evaluate('(el)=>getComputedStyle(el).display')
   count=await cv.evaluate('(el)=>({width:el.width,height:el.height})')
   print(game,view,cl,count,'err',errors[-2:]);
   if game=='checkers':await cv.screenshot(path='/mnt/data/chess_work/checkers_preview.png')
  await page.locator('[data-tab="extras"]').first.click(); await page.wait_for_timeout(350)
  print('EXTRAS', await page.locator('#bonus-3d').get_attribute('class'),errors[-4:])
  await page.locator('[data-extra-start="memory"]').first.click();await page.wait_for_timeout(350)
  print('MEMORY', await page.locator('#bonus-3d').get_attribute('class'),errors[-4:])
  await page.locator('[data-tab="shogi"]').first.click();await page.wait_for_timeout(200)
  await page.locator('[data-shogi="match"]').first.click();await page.wait_for_timeout(350)
  print('SHOGI',await page.locator('.shogi-webgl-slot').get_attribute('class'), await page.locator('.shogi-webgl-canvas').evaluate('(el)=>({w:el.width,h:el.height})'),errors[-4:])
  await page.screenshot(path='/mnt/data/chess_work/shogi_preview.png',full_page=True)
  for path in ['go','peace']:
   await page.goto('http://127.0.0.1:8765/'+path+'.html',wait_until='domcontentloaded');await page.wait_for_timeout(350)
   print(path,await page.locator('#'+path+'-webgl').get_attribute('class'),errors[-4:])
  await browser.close()
asyncio.run(main())
