import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'societyadmin@hypn.com');
    await page.type('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.$eval('#root', el => el.innerHTML);
    console.log('HTML CONTENT:', html);
    
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
