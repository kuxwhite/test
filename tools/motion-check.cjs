// Frames for checking the living header (Playwright, 402×874).
//   npm run dev  (port 5173), then: node tools/motion-check.cjs
// Writes reference/motion-check/{flights,hotels}-{1..4}.png (1 s apart) and scroll-{0,150,300}.png.
const { chromium } = require('playwright')
const OUT = 'reference/motion-check'
;(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(process.env.URL || 'http://localhost:5173/')
  await p.waitForTimeout(2500)
  for (const tab of ['Flights', 'Hotels']) {
    await p.click(`role=tab[name="${tab}"]`)
    await p.waitForTimeout(1500)
    for (let i = 1; i <= 4; i++) {
      await p.screenshot({ path: `${OUT}/${tab.toLowerCase()}-${i}.png` })
      if (i < 4) await p.waitForTimeout(1000)
    }
  }
  await p.click('role=tab[name="Flights"]')
  await p.waitForTimeout(1200)
  for (const y of [0, 150, 300]) {
    await p.evaluate((v) => window.scrollTo(0, v), y)
    await p.waitForTimeout(500)
    await p.screenshot({ path: `${OUT}/scroll-${y}.png` })
  }
  console.log('errors:', errs.length ? errs : 'none')
  await b.close()
})()
