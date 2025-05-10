const settings = require('./settings.json');
const fs = require('fs');
const { getCookies } = require('./steam_login.js');
const { gameId: appId, outputFile } = settings;

const PERPAGE = 15;

// gets the number of pages in the steam market for a game
function getLastPage(totalCount) {
  return Math.ceil(totalCount / PERPAGE);
}

/* takes page and the current page number and returns an array of 
all the links in the page*/
async function collectPageLinks(page, pageNum) {
  const start = pageNum * PERPAGE;
  const url   =
    `https://steamcommunity.com/market/search/render/` +
    `?appid=${appId}` +
    `&start=${start}` +
    `&count=${PERPAGE}` +
    `&search_descriptions=0` +
    `&sort_column=quantity` +
    `&sort_dir=desc` +
    `&norender=1`;

  // hit the JSON endpoint
  const resp = await page.goto(url, { waitUntil: 'networkidle2' });
  const json = await resp.json();
  if (!json.success) {
    throw new Error(`Steam API error: ${json.tip}`);
  }

  // build array of full listing URLs
  const links = [];
  for (const item of json.results) {
    const hashName = encodeURIComponent(item.hash_name);
    const listingUrl =
      `https://steamcommunity.com/market/listings/` +
      `${appId}/${hashName}`;
    links.push(listingUrl);
  }

  console.log(`we on page ${pageNum}: found ${links.length} items`);
  return links;
}

/* takes a browser instance and the url of the listing, opens a new page and
gets the item_nameid of the item, then closes the page*/
async function scrapeItem(page, itemUrl) {
  await page.setExtraHTTPHeaders({
    Referer: 'https://steamcommunity.com/market',
    'User-Agent': 'did it work??',
  });

  // Navigate with throttling only on 429
  await handleTooManyRequests(page, () =>
    page.goto(itemUrl)
  );

  // Wait for the XHR containing item_nameid
  const resp = await page.waitForResponse(r => r.url().includes('item_nameid='));
  const url = resp.url()
  const m = url.match(/item_nameid=(\d+)/);
  const itemId = m ? m[1] : null;
  const hashName = itemUrl.replace(`https://steamcommunity.com/market/listings/${appId}/`, '');
  console.log(hashName + ', ' + itemId)
  return { hashName, itemId };
}

async function handleTooManyRequests(page, navigateFn) {
  let resp = await navigateFn();
  while (resp.status() === 429) {
    console.log('[429] Cooling off 10 s and reloading …');
    await new Promise(r => setTimeout(r, 10000));
    resp = await page.reload({ waitUntil: 'networkidle2' });
  }
  return resp
}

// main function
;(async () => {
  const browser  = await getCookies();
  const mainPage = await browser.newPage();
  await mainPage.setExtraHTTPHeaders({
    Referer: 'https://steamcommunity.com/market',
    'User-Agent': 'did it work??',
  });

  // Prepare CSV writer
  const writeStream = fs.createWriteStream(outputFile + '.csv', { flags: 'w' });
  writeStream.write("hash_name,item_nameid\n");

  // Prime total_count
  const firstUrl = `https://steamcommunity.com/market/search/render/` +
                   `?appid=${appId}&start=0&count=${PERPAGE}` +
                   `&search_descriptions=0&sort_column=quantity&sort_dir=desc` +
                   `&norender=1`;
  const firstResp = await handleTooManyRequests(mainPage, () =>
    mainPage.goto(firstUrl, { waitUntil: 'networkidle2' })
  );
  const firstJson = await firstResp.json();
  const totalPages = getLastPage(firstJson.total_count);

  // Pre-allocate your page-pool
  const itemPages = [];
  for (let i = 0; i < PERPAGE; i++) {
    const p = await browser.newPage();
    await p.setExtraHTTPHeaders({
      Referer: 'https://steamcommunity.com/market',
      'User-Agent': 'did it work??',
    });
    itemPages.push(p);
  }

  let totalWritten = 0;

  // Loop through each page, scrape in parallel, then write immediately
  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    const links = await collectPageLinks(mainPage, currentPage);

    // scrape this page’s links in parallel
    const batch = await Promise.all(
      links.map((link, idx) => scrapeItem(itemPages[idx], link))
    );

    // write each item as soon as we get it
    for (const { hashName, itemId } of batch) {
      writeStream.write(`${hashName},${itemId}\n`);
      totalWritten++;
    }

    console.log(
      `Finished page ${currentPage}: ` +
      `scraped ${batch.length} items, total written so far = ${totalWritten}`
    );
  }

  // clean up
  writeStream.end();
  await Promise.all(itemPages.map(p => p.close()));
  await mainPage.close();
  await browser.close();
})();
