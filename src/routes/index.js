const express = require("express");
const crypto = require("crypto");
const fetchTournamentKeys = require("../scraper/fetchKeys");
const fetchPairings = require("../scraper/fetchPairings");
const Arbiter = require("../models/Arbiter");
const Assignment = require("../models/Assignment");
const Round = require("../models/Round");
const generateXML = require("../utils/xmlGenerator");   // ✅ Correct import
const sendResults = require("../uploader/sendResults");

const router = express.Router();

/* ------------------- ADMIN LOGIN ------------------- */
router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Invalid password" });
});

/* ------------------- SCRAPER ROUTES ------------------- */
router.get("/tournament/keys", async (req, res) => {
  try {
    const keys = await fetchTournamentKeys(req.query.url);
    if (!keys) return res.status(400).json({ success: false });
    return res.json({ success: true, ...keys });
  } catch (err) {
    console.error("❌ /tournament/keys:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tournament/pairings", async (req, res) => {
  try {
    const { dbKey, sidKey, round: clientRound } = req.body;

    if (!dbKey || !sidKey) {
      return res.status(400).json({
        success: false,
        error: "Missing dbKey or sidKey",
      });
    }

    // 🟢 Use round from client IF provided (from fetchKeys)
    // Otherwise fallback to scraping inside fetchPairings
    const { round: scrapedRound, pairings } = await fetchPairings(
      dbKey,
      sidKey,
      clientRound
    );

    const finalRound = clientRound || scrapedRound || "Unknown";

    // Save round snapshot only if valid
    if (finalRound && pairings && pairings.length > 0) {
      await Round.findOneAndUpdate(
        { dbKey, round: finalRound },
        {
          dbKey,
          sidKey,
          round: finalRound,
          pairings: pairings.map((p) => ({
            board: p.board,
            playerA: p.playerA,
            playerB: p.playerB,
            whiteSNo: p.whiteSNo || null,
            blackSNo: p.blackSNo || null,
          })),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return res.json({
      success: true,
      round: finalRound,
      pairings,
    });
  } catch (err) {
    console.error("❌ /tournament/pairings:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ------------------- ARBITERS ------------------- */
router.post("/arbiters", async (req, res) => {
  const arbiter = await Arbiter.create(req.body);
  res.json({ success: true, arbiter });
});

router.get("/arbiters", async (req, res) => {
  const arbiters = await Arbiter.find();
  res.json({ success: true, arbiters });
});

/* ------------------- ASSIGNMENTS ------------------- */
router.post("/assignments", async (req, res) => {
  const token = crypto.randomBytes(16).toString("hex");

  const { dbKey, sidKey, round, arbiterId, boardFrom, boardTo, pairings } = req.body;

  const from = Number(boardFrom);
  const to = Number(boardTo);

  const filteredPairings = (pairings || []).filter((p) => {
    const b = Number(p.board);
    return !isNaN(b) && b >= from && b <= to;
  });

  const assignment = await Assignment.create({
    token,
    dbKey,
    sidKey,
    round,
    arbiter: arbiterId,
    boardFrom: from,
    boardTo: to,
    pairings: filteredPairings,
    results: [],
  });

  const shareUrl = `${process.env.BASE_URL}/arbiter/${token}`;
  res.json({ success: true, shareUrl, assignment });
});

router.get("/assignments", async (req, res) => {
  try {
    const { dbKey, round } = req.query;
    const filter = {};

    if (dbKey) filter.dbKey = dbKey;
    if (round) filter.round = round;

    const assignments = await Assignment.find(filter)
      .populate("arbiter")
      .sort({ createdAt: 1 });

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error("❌ /assignments:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/assignments/by-token/:token", async (req, res) => {
  const assignment = await Assignment.findOne({
    token: req.params.token,
  }).populate("arbiter");

  if (!assignment) return res.status(404).json({ success: false });
  res.json({ success: true, assignment });
});

router.post("/assignments/by-token/:token/results", async (req, res) => {
  const assignment = await Assignment.findOne({ token: req.params.token });
  if (!assignment) {
    return res.status(404).json({ success: false, error: "Assignment not found" });
  }

  assignment.results = req.body.results;
  await assignment.save();

  res.json({ success: true });
});

/* ------------------- LIVE SUBMISSION TO CHESS-RESULTS ------------------- */
router.post("/results/upload", async (req, res) => {
  const response = await sendResults(req.body);
  res.json(response);
});

/* ------------------- MERGED RESULTS ------------------- */
router.get("/tournament/merged-results", async (req, res) => {
  try {
    const { dbKey, round } = req.query;
    if (!dbKey || !round) {
      return res.status(400).json({ success: false, error: "dbKey and round are required" });
    }

    const baseRound = await Round.findOne({ dbKey, round });

    if (!baseRound) {
      return res.status(404).json({ success: false, error: "Round snapshot not found" });
    }

    const assignments = await Assignment.find({ dbKey, round });

    const resultByBoard = {};
    assignments.forEach((a) => {
      (a.results || []).forEach((r) => {
        resultByBoard[String(r.board)] = r.result;
      });
    });

    const merged = baseRound.pairings.map((p) => ({
      board: p.board,
      playerA: p.playerA,
      playerB: p.playerB,
      whiteSNo: p.whiteSNo,
      blackSNo: p.blackSNo,
      result: resultByBoard[String(p.board)] || "",
    }));

    return res.json({
      success: true,
      dbKey,
      round,
      pairings: merged,
    });
  } catch (err) {
    console.error("❌ /tournament/merged-results:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------- XML DOWNLOAD ------------------- */
router.post("/tournament/xml", async (req, res) => {
  try {
    const { dbKey, round } = req.body;

    if (!dbKey || !round) {
      return res.status(400).json({ success: false, error: "dbKey and round are required" });
    }

    const baseRound = await Round.findOne({ dbKey, round });
    if (!baseRound) {
      return res.status(404).json({ success: false, error: "Round snapshot not found" });
    }

    const assignments = await Assignment.find({ dbKey, round });

    const resultByBoard = {};
    assignments.forEach((a) => {
      (a.results || []).forEach((r) => {
        resultByBoard[String(r.board)] = r.result;
      });
    });

    const merged = baseRound.pairings.map((p) => ({
      board: p.board,
      result: resultByBoard[p.board],
      whiteSNo: p.whiteSNo,
      blackSNo: p.blackSNo,
    }));

    const xml = generateXML(round, merged);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Round_${round}_Results.xml`
    );
    res.setHeader("Content-Type", "application/xml");

    return res.status(200).send(xml);
  } catch (err) {
    console.error("❌ Error generating XML:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
