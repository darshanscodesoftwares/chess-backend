const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

module.exports = async function fetchPairings(dbKey, sidKey, round) {
  if (!dbKey || !sidKey) {
    throw new Error("INVALID_DB_OR_SID_KEY");
  }

  const playersUrl = `https://chess-results.com/tnr${dbKey}.aspx?lan=1&art=0&turdet=YES&SNode=S0`;
  const resultsUrl = `https://chess-results.com/Results.aspx?tnr=${dbKey}&lan=1&art=2&rd=${round || 1}&flag=30&sid=${sidKey}`;

  const startTime = Date.now();
  console.log("🔍 Starting Puppeteer with @sparticuz/chromium...");

  // Use @sparticuz/chromium for container/serverless environments
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // ⏱️ Render-safe timeouts
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  // ⚡ Block heavy resources
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "font", "media"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setViewport({ width: 1400, height: 900 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
  );

  /* ================= STARTING LIST ================= */

  console.log("🌐 Loading Starting Rank Page");
  await page.goto(playersUrl, { waitUntil: "domcontentloaded" });

  const tableSelectors = ["table.CRs1", "table.CRs2", "table.CRs3", "table.CRs"];
  let tableFound = null;

  for (const selector of tableSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 15000 });
      tableFound = selector;
      break;
    } catch { }
  }

  if (!tableFound) {
    await browser.close();
    throw new Error("STARTING_LIST_NOT_FOUND");
  }

  const playerList = await page.evaluate((selector) => {
    const table = document.querySelector(selector);
    return [...table.querySelectorAll("tr")]
      .map((row) => {
        const sno = row.querySelector("td.CRc")?.innerText?.trim();
        const name = row.querySelector("a.CRdb")?.innerText?.trim();
        if (!sno || !name) return null;
        return {
          sno,
          name: name.toLowerCase().replace(/[.,]/g, "").trim(),
        };
      })
      .filter(Boolean);
  }, tableFound);

  console.log(`🎯 Loaded ${playerList.length} players`);

  const snoMap = Object.fromEntries(playerList.map((p) => [p.name, p.sno]));
  const normalize = (n) => n?.toLowerCase()?.replace(/[.,]/g, "").trim();

  /* ================= PAIRINGS PAGE ================= */

  console.log("🌐 Loading Pairings Page");
  await page.goto(resultsUrl, { waitUntil: "domcontentloaded" });

  // Auto-login if required
  const loginPanel = await page.$("#P1_Panel_Login");
  if (loginPanel) {
    console.log("🔐 Auto-login required");

    await page.type("#P1_txt_tnr_login", dbKey, { delay: 10 });
    await page.type("#P1_txt_SID", sidKey, { delay: 10 });
    await page.click("#P1_cb_login");

    await page.waitForSelector("#P1_Panel_Login", { hidden: true, timeout: 20000 });
  }

  // Round detection
  let detectedRound = null;
  try {
    detectedRound = await page.$eval("#P1_txt_rd", (el) => el.value?.trim());
  } catch { }

  detectedRound = detectedRound || round || "1";
  console.log("🎯 Detected Round:", detectedRound);

  /* ================= PAIRINGS TABLE ================= */

  const pairingSelectors = [
    "#P1_GridErg",
    "table.GridErg",
    "#P1_GridResult",
    "table.Grid",
    "table.tgrid",
  ];

  let pairingTable = null;
  for (const selector of pairingSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 15000 });
      pairingTable = selector;
      break;
    } catch { }
  }

  if (!pairingTable) {
    await browser.close();
    throw new Error("PAIRINGS_TABLE_NOT_FOUND");
  }

  const pairings = await page.evaluate((selector) => {
    const rows = [...document.querySelector(selector).querySelectorAll("tbody tr")];
    return rows
      .map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 3) return null;
        return {
          board: cells[0].innerText.trim(),
          playerA: cells[1].innerText.trim().replace(/,$/, ""),
          playerB: cells[2].innerText.trim().replace(/,$/, ""),
        };
      })
      .filter(Boolean);
  }, pairingTable);

  const enrichedPairings = pairings.map((p) => ({
    ...p,
    whiteSNo: snoMap[normalize(p.playerA)] || null,
    blackSNo: snoMap[normalize(p.playerB)] || null,
  }));

  await browser.close();

  console.log(`⚡ Scraping completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  return {
    round: detectedRound,
    pairings: enrichedPairings,
  };
};
