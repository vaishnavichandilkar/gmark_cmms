import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // Type email and password
    await page.type('input[type="email"]', 'superadmin@hypn.com');
    await page.type('input[type="password"]', 'Admin@123');
    
    // Click submit and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
    ]);
    
    console.log('Logged in successfully!');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
