import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    // Inject localStorage with dummy auth if it redirects to login
    // Let's first just try navigating.
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
    
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
