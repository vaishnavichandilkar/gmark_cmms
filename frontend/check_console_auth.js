import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    // Go to login page first to set origin
    await page.goto('http://localhost:5173/login');
    
    // Inject fake token to bypass auth check
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token');
      // Redux state is needed, wait, the app uses Redux for auth!
      // I can just login via the UI!
    });
    
    // Type email and password
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
