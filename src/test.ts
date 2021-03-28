import { Page } from "playwright";

const sentinel = "https://staplespromo.com";
const visited: string[] = [];
const threshold_in_seconds = 2;
const max_capacity = 300;

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=2560,1440']
  });
  const context = await browser.newContext({
    viewport: {
      width: 2560,
      height: 1440,
    }
  });
  // Open new page
  const page = await context.newPage();
  await page.goto(sentinel);
  // Click text=I consent to cookies 
  await page.click('text=I consent to cookies');
  // ---------------------

  await benchmark(sentinel, context);

  await context.close();
  await browser.close();
})();

async function benchmark(address: string, context: { newPage: () => any; }) {
  try {
    let hrefs: string[];
    const page = await context.newPage();
    const start_time = +new Date();
    console.log(`Now visiting ${address}`);
    await page.goto(address);
    const metrics = await getMetrics(page);
    let safeAddress = address.replace(/[^A-Z0-9]/gi, "");
    if (safeAddress.length > 25) {
      safeAddress = `${safeAddress.substring(15,30)}-${start_time}`;
    }
    console.log({ safeAddress });
    page.screenshot({
      path: `screenshots/${safeAddress}.png`,
      fullPage: true,
    });
    const end_time = +new Date();
    const load_time = (end_time - start_time) / 1000;
    if (metrics.data.duration > threshold_in_seconds * 1000) {
      console.log({ metrics });
      console.log(`Total load time for ${address} was ${load_time} seconds`);
    }
    hrefs = await page.$$eval("a", (as: any[]) => as.map((a) => a.href));
    for (const href of hrefs) {
      const hrefHashPosition = href.indexOf("#");
      const hrefWithoutHash =
        hrefHashPosition > -1 ? href.substr(0, hrefHashPosition) : href;
      if (
        !visited.includes(hrefWithoutHash) &&
        href.startsWith(sentinel) &&
        visited.length < max_capacity
      ) {
        visited.push(hrefWithoutHash);
        await benchmark(hrefWithoutHash, context);
      }
    }
  } catch (error) {
    console.log(`Error benchmarking ${address}`);
    console.error({ error });
  }
}

async function getMetrics(
  page: Page
): Promise<{
  format: "PerformanceNavigationTiming";
  data: PerformanceNavigationTiming;
}> {
  return JSON.parse(
    await page.evaluate(() => {
      const [timing] = performance.getEntriesByType("navigation");
      return JSON.stringify({
        data: timing,
      });
    })
  );
}
