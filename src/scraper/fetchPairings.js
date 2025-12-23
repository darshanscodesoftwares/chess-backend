// const puppeteer = require("puppeteer");

// module.exports = async function fetchPairings(dbKey, sidKey, round) {
//   const playersUrl = `https://chess-results.com/tnr${dbKey}.aspx?lan=1&art=0&turdet=YES&SNode=S0`;
//   const resultsUrl = `https://chess-results.com/Results.aspx?tnr=${dbKey}&lan=1&art=2&rd=${round}&flag=30&sid=${sidKey}`;

//   console.log("🔍 Starting Puppeteer...");

//   const browser = await puppeteer.launch({
//     headless: false,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     defaultViewport: null,
//   });

//   const page = await browser.newPage();

//   // Force desktop mode
//   await page.setExtraHTTPHeaders({
//     "Accept-Language": "en-US,en;q=0.9",
//   });

//   await page.setViewport({ width: 1400, height: 900 });

//   await page.setUserAgent(
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
//   );

//   // ============= 1️⃣ Load Starting List Page =============
//   console.log("🌐 Loading Starting Rank Page:", playersUrl);

//   await page.goto(playersUrl, {
//     waitUntil: "domcontentloaded",
//     timeout: 120000,
//   });

//   // Wait for ANY known table structure
//   const tableSelectors = ["table.CRs1", "table.CRs2", "table.CRs3", "table.CRs"];
//   let tableFound = false;

//   for (const selector of tableSelectors) {
//     try {
//       await page.waitForSelector(selector, { timeout: 3000 });
//       tableFound = selector;
//       break;
//     } catch { }
//   }

//   if (!tableFound) {
//     console.log("❌ No starting list table found!");
//     await browser.close();
//     return { round: null, pairings: [] };
//   }

//   console.log("✅ Starting List Table Found:", tableFound);

//   // Extract players
//   const playerList = await page.evaluate((selector) => {
//     const table = document.querySelector(selector);
//     if (!table) return [];

//     const rows = [...table.querySelectorAll("tr")];
//     return rows
//       .map((row) => {
//         const sno = row.querySelector("td.CRc")?.innerText?.trim();
//         const name = row.querySelector("a.CRdb")?.innerText?.trim();
//         if (!sno || !name) return null;

//         return {
//           sno,
//           name: name.toLowerCase().replace(/[.,]/g, "").trim(),
//         };
//       })
//       .filter(Boolean);
//   }, tableFound);

//   console.log(`🎯 Loaded ${playerList.length} players`);
//   const snoMap = Object.fromEntries(playerList.map((p) => [p.name, p.sno]));

//   const normalize = (n) => n?.toLowerCase()?.replace(/[.,]/g, "").trim();

//   // ============= 2️⃣ Load Pairings Page =============
//   console.log("🌐 Loading Pairings Page:", resultsUrl);

//   await page.goto(resultsUrl, {
//     waitUntil: "domcontentloaded",
//     timeout: 1800,
//   });

//   // Detect round number
//   try {
//     await page.waitForSelector("#P1_txt_rd", { timeout: 15000 });
//     round = await page.$eval("#P1_txt_rd", (el) => el.value.trim());
//   } catch {
//     console.log("⚠️ Round number not found.");
//   }

//   console.log("🎯 Round:", round);

//   // Multiple possible tables for pairings (Ch-R is inconsistent)
//   const pairingSelectors = [
//     "#P1_GridErg",
//     "table.GridErg",
//     "#P1_GridResult",
//     "table.Grid",
//     "table.tgrid",
//   ];

//   let pairingTable = null;
//   for (const selector of pairingSelectors) {
//     try {
//       await page.waitForSelector(selector, { timeout: 5000 });
//       pairingTable = selector;
//       break;
//     } catch { }
//   }

//   if (!pairingTable) {
//     console.log("❌ Could not find pairings table!");
//     await browser.close();
//     return { round, pairings: [] };
//   }

//   console.log("✅ Pairings Table Found:", pairingTable);

//   // Extract Pairings
//   const pairings = await page.evaluate((selector) => {
//     const table = document.querySelector(selector);
//     if (!table) return [];

//     const rows = [...table.querySelectorAll("tbody tr")];
//     return rows
//       .map((row) => {
//         const cells = row.querySelectorAll("td");
//         if (cells.length < 3) return null;

//         const board = cells[0]?.innerText?.trim();
//         const playerA = cells[1]?.innerText?.trim().replace(/,$/, "");
//         const playerB = cells[2]?.innerText?.trim().replace(/,$/, "");

//         const whiteLink = cells[1]?.querySelector("a");
//         const blackLink = cells[2]?.querySelector("a");

//         const whiteId = whiteLink
//           ? new URLSearchParams(whiteLink.href.split("?")[1]).get("spi")
//           : null;

//         const blackId = blackLink
//           ? new URLSearchParams(blackLink.href.split("?")[1]).get("spi")
//           : null;

//         const select = cells[3]?.querySelector("select");
//         const resultOptions = select
//           ? [...select.options].map((opt) => ({
//             value: opt.value,
//             label: opt.textContent.trim(),
//             selected: opt.selected,
//           }))
//           : [];

//         return {
//           board,
//           playerA,
//           playerB,
//           whiteId,
//           blackId,
//           resultOptions,
//         };
//       })
//       .filter(Boolean);
//   }, pairingTable);

//   console.log(`🧩 Found ${pairings.length} pairings`);

//   // Attach SNo
//   const enrichedPairings = pairings.map((p) => ({
//     ...p,
//     whiteSNo: snoMap[normalize(p.playerA)] || null,
//     blackSNo: snoMap[normalize(p.playerB)] || null,
//   }));

//   console.table(enrichedPairings, [
//     "board",
//     "playerA",
//     "whiteSNo",
//     "playerB",
//     "blackSNo",
//   ]);

//   await browser.close();

//   return { round, pairings: enrichedPairings };
// };

const puppeteer = require("puppeteer");

module.exports = async function fetchPairings(dbKey, sidKey, round) {
  const playersUrl = `https://chess-results.com/tnr${dbKey}.aspx?lan=1&art=0&turdet=YES&SNode=S0`;
  const resultsUrl = `https://chess-results.com/Results.aspx?tnr=${dbKey}&lan=1&art=2&rd=${round}&flag=30&sid=${sidKey}`;

  const startTime = Date.now();
  console.log("🔍 Starting Puppeteer...");

  // ⚡ Use headless mode for speed (set DEBUG_BROWSER=true to see UI)
  const isDebugMode = process.env.DEBUG_BROWSER === "true";

  const browser = await puppeteer.launch({
    headless: isDebugMode ? false : "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // ⚡ Block heavy resources to speed up page loads
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const resourceType = req.resourceType();
    const url = req.url();

    // Block images, fonts, media, ads, analytics
    if (
      resourceType === "image" ||
      resourceType === "font" ||
      resourceType === "media" ||
      url.includes("google-analytics") ||
      url.includes("googletagmanager") ||
      url.includes("doubleclick") ||
      url.includes("analytics") ||
      url.includes("/ads/")
    ) {
      req.abort();
    } else {
      // Allow: document, stylesheet, script, xhr, fetch
      req.continue();
    }
  });

  // Force desktop mode
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  await page.setViewport({ width: 1400, height: 900 });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
  );

  // ============= 1️⃣ Load Starting Rank Page =============
  console.log("🌐 Loading Starting Rank Page:", playersUrl);

  // ⚡ Use domcontentloaded instead of networkidle2 for faster navigation
  await page.goto(playersUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // ⚡ Wait for ANY known table structure (targeted wait)
  const tableSelectors = ["table.CRs1", "table.CRs2", "table.CRs3", "table.CRs"];
  let tableFound = null;

  for (const selector of tableSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      tableFound = selector;
      break;
    } catch {}
  }

  if (!tableFound) {
    console.log("❌ No starting list table found!");
    await browser.close();
    return { round: null, pairings: [] };
  }

  console.log("✅ Starting List Table Found:", tableFound);

  // Extract players
  const playerList = await page.evaluate((selector) => {
    const table = document.querySelector(selector);
    if (!table) return [];

    const rows = [...table.querySelectorAll("tr")];
    return rows
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

  const normalize = (n) =>
    n?.toLowerCase()?.replace(/[.,]/g, "").trim();

  // ============= 2️⃣ Load Pairings Page =============
  console.log("🌐 Loading Pairings Page:", resultsUrl);

  // ⚡ Use domcontentloaded for faster initial load
  await page.goto(resultsUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // ============= 🔐 AUTO-LOGIN (If Required) =============
  console.log("🔍 Checking for login panel...");

  try {
    // ⚡ Reduced timeout - login panel appears quickly or not at all
    const loginPanelExists = await page.waitForSelector("#P1_Panel_Login", {
      timeout: 8000,
      visible: true,
    }).then(() => true).catch(() => false);

    if (loginPanelExists) {
      console.log("🔐 Login panel detected! Auto-filling credentials...");

      // Wait for all login inputs to be present
      await page.waitForSelector("#P1_txt_tnr_login", { timeout: 3000 });
      await page.waitForSelector("#P1_txt_SID", { timeout: 3000 });
      await page.waitForSelector("#P1_cb_login", { timeout: 3000 });

      // ⚡ Clear and fill DB Key input (faster approach)
      await page.click("#P1_txt_tnr_login", { clickCount: 3 });
      await page.type("#P1_txt_tnr_login", dbKey, { delay: 10 });
      console.log("✅ DB Key filled:", dbKey);

      // ⚡ Clear and fill SID Key input (faster approach)
      await page.click("#P1_txt_SID", { clickCount: 3 });
      await page.type("#P1_txt_SID", sidKey, { delay: 10 });
      console.log("✅ SID Key filled:", sidKey);

      // Click login button
      console.log("🔐 Clicking login button...");
      await page.click("#P1_cb_login");

      // ⚡ Wait for login panel to disappear (faster than waiting for navigation)
      await page.waitForSelector("#P1_Panel_Login", { hidden: true, timeout: 15000 });

      console.log("✅ Auto-login successful! Proceeding to scrape pairings...");
    } else {
      console.log("ℹ️ No login panel detected - proceeding directly");
    }
  } catch (loginErr) {
    console.warn("⚠️ Auto-login failed or timed out:", loginErr.message);
    console.warn("⚠️ Leaving browser open for manual fallback...");
    // TODO: If Chess-Results changes login HTML, update selectors:
    // #P1_Panel_Login, #P1_txt_tnr_login, #P1_txt_SID, #P1_cb_login

    // Do NOT crash - attempt to continue scraping
    // Manual intervention may be possible if browser stays open
  }

  // ====== ROUND DETECTION (FIXED) ======
  let detectedRound = null;

  // 1️⃣ Primary: Try disabled input field
  try {
    // ⚡ Reduced timeout - element appears quickly after login
    await page.waitForSelector("#P1_txt_rd", { timeout: 8000 });

    detectedRound = await page.$eval(
      "#P1_txt_rd",
      (el) => el.getAttribute("value")?.trim() || el.value?.trim()
    );

    if (detectedRound) {
      console.log("✅ Round detected from #P1_txt_rd input:", detectedRound);
    }
  } catch (err) {
    console.log("⚠️ Round input field #P1_txt_rd not found or timeout");
  }

  // 2️⃣ Secondary: Fallback to URL parameter
  if (!detectedRound || detectedRound === "" || detectedRound.toLowerCase() === "unknown") {
    console.log("⚠️ Primary detection failed or returned invalid value, trying URL fallback...");
    const url = page.url();
    const params = new URLSearchParams(url.split("?")[1]);
    const urlRound = params.get("rd");

    if (urlRound && urlRound !== "" && urlRound.toLowerCase() !== "unknown") {
      detectedRound = urlRound.trim();
      console.log("✅ Round detected from URL parameter:", detectedRound);
    }
  }

  // 3️⃣ Final validation: NEVER allow invalid values
  if (!detectedRound || detectedRound === "" || detectedRound.toLowerCase() === "unknown" || detectedRound === "undefined") {
    console.error("❌ CRITICAL: Round detection failed completely. Round is invalid:", detectedRound);
    detectedRound = null; // Set to null instead of invalid string
  }

  console.log("🎯 Final Detected Round:", detectedRound);

  // ============= Pairings Table Detection =============
  const pairingSelectors = [
    "#P1_GridErg",
    "table.GridErg",
    "#P1_GridResult",
    "table.Grid",
    "table.tgrid",
  ];

  let pairingTable = null;

  // ⚡ Reduced timeout - table appears quickly once page is ready
  for (const selector of pairingSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      pairingTable = selector;
      break;
    } catch {}
  }

  if (!pairingTable) {
    console.log("❌ Could not find pairings table!");
    await browser.close();
    return { round: detectedRound, pairings: [] };
  }

  console.log("✅ Pairings Table Found:", pairingTable);

  // ============= Extract Pairings =============
  const pairings = await page.evaluate((selector) => {
    const table = document.querySelector(selector);
    if (!table) return [];

    const rows = [...table.querySelectorAll("tbody tr")];

    return rows
      .map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 3) return null;

        const board = cells[0]?.innerText?.trim();
        const playerA = cells[1]?.innerText?.trim().replace(/,$/, "");
        const playerB = cells[2]?.innerText?.trim().replace(/,$/, "");

        const whiteLink = cells[1]?.querySelector("a");
        const blackLink = cells[2]?.querySelector("a");

        const whiteId = whiteLink
          ? new URLSearchParams(whiteLink.href.split("?")[1]).get("spi")
          : null;

        const blackId = blackLink
          ? new URLSearchParams(blackLink.href.split("?")[1]).get("spi")
          : null;

        const select = cells[3]?.querySelector("select");

        const resultOptions = select
          ? [...select.options].map((opt) => ({
              value: opt.value,
              label: opt.textContent.trim(),
              selected: opt.selected,
            }))
          : [];

        return {
          board,
          playerA,
          playerB,
          whiteId,
          blackId,
          resultOptions,
        };
      })
      .filter(Boolean);
  }, pairingTable);

  console.log(`🧩 Found ${pairings.length} pairings`);

  // ============= Attach SNo Mapping =============
  const enrichedPairings = pairings.map((p) => ({
    ...p,
    whiteSNo: snoMap[normalize(p.playerA)] || null,
    blackSNo: snoMap[normalize(p.playerB)] || null,
  }));

  console.table(enrichedPairings, [
    "board",
    "playerA",
    "whiteSNo",
    "playerB",
    "blackSNo",
  ]);

  await browser.close();

  // ⚡ Performance timing
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⚡ Total scraping time: ${totalTime}s`);

  return {
    round: detectedRound,
    pairings: enrichedPairings,
  };
};
