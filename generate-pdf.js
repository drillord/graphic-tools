const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const htmlPath = 'file://' + path.resolve(__dirname, 'litr-strategy.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Give Google Fonts a moment to load
  await new Promise(r => setTimeout(r, 1500));

  await page.pdf({
    path: 'litr-truhlastvi-strategie.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log('PDF saved: litr-truhlastvi-strategie.pdf');
})();
