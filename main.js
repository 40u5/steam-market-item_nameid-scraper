const settings = require('./settings.json');
const fs = require('fs');
const { getCookies } = require('./steam_login.js');
const { gameId: appId, outputFolder, parallelTabs } = settings;
const path = require('path');

// gets the number of pages in the steam market for a game
function getLastPage(totalCount) {
  return Math.ceil(totalCount / parallelTabs);
}

/* takes page and the current page number and returns an array of 
all the links in the page*/
async function collectPageLinks(page, pageNum) {
  const start = pageNum * parallelTabs;
  const url   =
    `https://steamcommunity.com/market/search/render/` +
    `?appid=${appId}` +
    `&start=${start}` +
    `&count=${parallelTabs}` +
    `&search_descriptions=0` +
    `&sort_column=quantity` +
    `&sort_dir=desc` +
    `&norender=1`;
  
  
  const responsePromise = page.waitForResponse(
    res => res.url().includes('/market/search/render') &&
    res.status() === 200, { timeout: 0 }
  );


  // hit the JSON endpoint
  await handleTooManyRequests(page, () => page.goto(url, { waitUntil: 'networkidle2', timeout: 0}));
  let resp = await responsePromise
  let json = await resp.json();

  // build array of full listing URLs
  const links = [];
  for (const item of json.results) {
    const hashName = encodeURIComponent(item.hash_name);
    const listingUrl =
      `https://steamcommunity.com/market/listings/` +
      `${appId}/${hashName}`;
    links.push(listingUrl);
  }
  return links;
}

/* takes a browser instance and the url of the listing, opens a new page and
gets the item_nameid of the item, then closes the page*/

async function scrapeItem(page, itemUrl) {
  // set headers once
  await page.setExtraHTTPHeaders({
    Referer: 'https://steamcommunity.com/market',
    'User-Agent': 'did it work??',
  });

  // initial navigation, with your 429 handler
  await handleTooManyRequests(page, () =>
    page.goto(itemUrl, { timeout: 0 })
  );

  let resp;
  try {
    // wait up to 20 s for the XHR
    resp = await page.waitForResponse(
      r => r.url().includes('item_nameid='), { timeout: 20_000 }
    );
  } catch (err) {
      await page.reload({ waitUntil: 'networkidle2', timeout: 0 });
      console.log("error getting item_nameid, reloading page and trying again");
      return scrapeItem(page, itemUrl);
  }

  // extract and return
  const url = resp.url()
  const m = url.match(/item_nameid=(\d+)/);
  const itemId = m ? m[1] : null;
  const hashName = itemUrl.replace(`https://steamcommunity.com/market/listings/${appId}/`, '');
  console.log(hashName + ', ' + itemId)
  return { hashName, itemId };
}


async function handleTooManyRequests(page, navigateFn) {
  let resp = await navigateFn();
  while (resp.status() !== 200) {
    console.log(`[${ resp.status() }] Cooling off 20 s and reloading …`);
    await new Promise(r => setTimeout(r, 20000));
    resp = await page.reload({ waitUntil: 'networkidle2', timeout: 0});
  }
  return resp;
}

// main function
(async () => {
  const browser  = await getCookies();
  const mainPage = await browser.newPage();
  await mainPage.setExtraHTTPHeaders({
    Referer: 'https://steamcommunity.com/market',
    'User-Agent': 'did it work??',
  });
  
  const filePath = path.join(outputFolder, `${appId}_output.csv`);
  const header = 'hash_name,item_nameid';

  // Check if file exists and is empty
  let isEmpty = true;
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    isEmpty = stats.size === 0;
  }

  // Open in append mode and write header only if empty
  const ws = fs.createWriteStream(filePath, { flags: 'a' });
  if (isEmpty) {
    ws.write(header + '\n');
  }

  // Prime total_count
  const firstUrl = `https://steamcommunity.com/market/search/render/` +
                   `?appid=${appId}&start=0&count=${parallelTabs}` +
                   `&search_descriptions=0&sort_column=quantity&sort_dir=desc` +
                   `&norender=1`;
  const firstResp = await handleTooManyRequests(mainPage, () =>
    mainPage.goto(firstUrl, { waitUntil: 'networkidle2', timeout: 0})
  );
  const firstJson = await firstResp.json();
  const totalPages = getLastPage(firstJson.total_count);

  // Pre-allocate your page-pool
  const itemPages = [];
  for (let i = 0; i < parallelTabs; i++) {
    const p = await browser.newPage();
    await p.setExtraHTTPHeaders({
      Referer: 'https://steamcommunity.com/market',
      'User-Agent': 'did it work??',
    });
    itemPages.push(p);
  }

  let totalWritten = 0;

  // Loop through each page, scrape in parallel, then write immediately
  for (let currentPage = 0; currentPage <= totalPages; currentPage++) {
    const links = await collectPageLinks(mainPage, currentPage);

    // scrape this page’s links in parallel
    const batch = await Promise.all(
      links.map((link, idx) => scrapeItem(itemPages[idx], link))
    );

    // write each item as soon as we get it
    for (const { hashName, itemId } of batch) {
      ws.write(`${hashName},${itemId}\n`);
      totalWritten++;
    }

    console.log(
      `Finished page ${currentPage}: ` +
      `scraped ${batch.length} items, total written so far = ${totalWritten}`
    );
  }

  // clean up
  ws.end();
  await Promise.all(itemPages.map(p => p.close()));
  await mainPage.close();
  await browser.close();
})();
