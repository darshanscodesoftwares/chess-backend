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

  console.log("🔍 Starting Puppeteer...");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
  });

  const page = await browser.newPage();

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

  await page.goto(playersUrl, {
    waitUntil: "networkidle2",
    timeout: 120000,
  });

  // Wait for ANY known table structure
  const tableSelectors = ["table.CRs1", "table.CRs2", "table.CRs3", "table.CRs"];
  let tableFound = null;

  for (const selector of tableSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
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

  await page.goto(resultsUrl, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // ====== ROUND DETECTION (FIXED) ======
  let detectedRound = round;

  try {
    await page.waitForSelector("#P1_txt_rd", { timeout: 15000 });

    detectedRound = await page.$eval(
      "#P1_txt_rd",
      (el) => el.getAttribute("value")?.trim()
    );
  } catch {
    console.log("⚠️ Round number not found via input field.");
  }

  // Fallback to URL param
  if (!detectedRound || detectedRound === "Unknown") {
    const url = page.url();
    const params = new URLSearchParams(url.split("?")[1]);
    detectedRound = params.get("rd") || round;
  }

  console.log("🎯 Detected Round:", detectedRound);

  // ============= Pairings Table Detection =============
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
      await page.waitForSelector(selector, { timeout: 7000 });
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

  return {
    round: detectedRound,
    pairings: enrichedPairings,
  };
};
