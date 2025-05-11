const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function getCookies() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const [page] = await browser.pages();
  await page.goto(
    'https://steamcommunity.com/login/home/?goto=',
    { waitUntil: 'networkidle2', timeout: 0 }
  );

  // read credentials
  const { username, password } =
    JSON.parse(await fs.readFile('login_info.json', 'utf8'));

  // wait for and type into the form
  await page.waitForSelector('input[type="text"]', { visible: true });
  await page.type('input[type="text"]', username);
  await page.type('input[type="password"]', password);

  // click & wait for the navigation to finish
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 0}),
  ]);
  let steamUsername = page.url().replace('https://steamcommunity.com/profiles/', '');

  // now go to the inventory page
  await page.goto(
    `https://steamcommunity.com/profiles/${steamUsername}/inventory/`,
    { waitUntil: 'networkidle2', timeout: 0 }
  );

  // small pause so everything settles
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  page.close()
  return browser;
}

module.exports = { getCookies };
