const settings = require('./settings.json');
const fs = require('fs');
const { getCookies } = require('./steam_login.js');
const { gameId: appId, outputFile } = settings;

function getLastPage(page) {
  return page.evaluate(() => {
    const spans = Array.from(
      document.querySelectorAll('span.market_paging_pagelink')
    );
    const nums = spans
      .map(s => parseInt(s.textContent.trim(), 10))
      .filter(n => !isNaN(n));
    return nums.length ? nums[nums.length - 1] : NaN;
  });
}

(async () => {
    const browser = await getCookies()
    const page = await browser.newPage();
    const headers = {
        "Referer": 'https://steamcommunity.com/market',
        "User-Agent": 'did it work??',
    }

    //creates write stream to write to the csv file
    const writeStream = fs.createWriteStream(outputFile + '.csv', { flags: 'a' });
    writeStream.write("hash_name, item_nameid")
    let firstPath = `https://steamcommunity.com/market/search?appid=${appId}&sort_column=quantity#p1_quantity_desc`;
    await page.goto(firstPath, { waitUntil: 'networkidle2' });
    const totalPages = await getLastPage(page);

    for (let pages = 1; pages <= totalPages; pages++)
    {
        var url = `https://steamcommunity.com/market/search?appid=${appId}&sort_column=quantity#p${pages}_quantity_desc`;
        var links = [];
        await page.setExtraHTTPHeaders(headers);
        var redirect = await page.goto(url);
        try{
            if (pages != totalPages)
            {
                await page.waitForSelector('#result_9', { timeout: 5000 });
            }
            else {
                const maxIndex = await page.$$eval('[id^="result_"]', elems => {
                    const nums = elems
                      .map(el => {
                        const m = el.id.match(/^result_(\d+)$/);
                        return m ? parseInt(m[1], 10) : null;
                      })
                      .filter(n => n !== null);
                    return nums.length ? Math.max(...nums) : -1;
                  });
                  await page.waitForSelector(`#result_${maxIndex}`, { timeout: 5000 });
            }
        }catch(error)
        {
            //keeps refreshing main webpage if too many requests sent
            while (redirect.status() == 429)
            {
                await new Promise(resolve => setTimeout(resolve, 10000));
                redirect = await page.reload();
                console.log('Too many requests, refreshed the page');
            }
        }

        // gets the total number of listings on the current page
        const elements = await page.$$('.market_listing_row_link');
        for (let i = 0; i < elements.length; i++)
        {
            const linkHref = await (await elements[i].getProperty('href')).jsonValue();
            links[i] = linkHref;
        }

        // scrapes the main webpage
        for (let i = 0; i < links.length; i++)
        {
            await page.setExtraHTTPHeaders(headers);
            var follow_url = await page.goto(links[i]);

            // keeps refreshing listing page if too many requests sent
            while (follow_url.status() == 429)
            {
                await new Promise(resolve => setTimeout(resolve, 10000));
                follow_url = await page.reload();
                console.log('Too many requests, refreshed the page');
            }
            let resp = await page.waitForResponse(r => r.url().includes('item_nameid'));
            const url = resp.url();
            let m = url.match(/item_nameid=(\d+)/);
            const item_id = m ? m[1] : null;
            const hash_name = follow_url.url().replace(`https://steamcommunity.com/market/listings/${appId}/`, '');
            const item_information = '\n' + hash_name + ',' + item_id + ',';

            // writes to the file
            let isWritable = writeStream.write(item_information);
            if (!isWritable) {
                console.log('could not write: ' + item_information);
            }
            console.log(item_id);
        }
    }
    writeStream.end();
})();