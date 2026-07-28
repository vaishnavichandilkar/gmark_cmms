import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[type="email"]', 'superadmin@hypn.com');
    await page.type('input[type="password"]', 'Admin@123');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
    ]);
    
    const html = await page.$eval('#root', el => el.innerHTML);
    console.log('HTML CONTENT:', html.substring(0, 1000));
    
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
