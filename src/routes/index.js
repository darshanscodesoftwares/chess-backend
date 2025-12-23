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

    console.log("📥 Client provided round:", clientRound);

    // Pass clientRound to fetchPairings (used for URL construction)
    const { round: scrapedRound, pairings } = await fetchPairings(
      dbKey,
      sidKey,
      clientRound
    );

    console.log("🔍 Scraped round from page:", scrapedRound);

    // ✅ CRITICAL FIX: Prioritize scraped round over client round
    // Scraped round is the source of truth from the actual Chess-Results page
    let finalRound = scrapedRound;

    // Only use clientRound as last resort if scraping completely failed
    if (!finalRound || finalRound === "" || finalRound === "undefined" || finalRound.toLowerCase() === "unknown") {
      console.log("⚠️ Scraped round invalid, checking client round...");

      if (clientRound && clientRound !== "" && clientRound !== "undefined" && clientRound.toLowerCase() !== "unknown") {
        finalRound = clientRound;
        console.log("✅ Using client round as fallback:", finalRound);
      } else {
        console.error("❌ CRITICAL: Both scraped and client rounds are invalid!");
        return res.status(400).json({
          success: false,
          error: "Unable to determine round number. Both page scraping and client data failed.",
        });
      }
    }

    console.log("🎯 Final round to save:", finalRound);

    // ✅ Absolute guard: NEVER save invalid round values
    const invalidValues = ["", "unknown", "undefined", null];
    if (invalidValues.includes(finalRound?.toLowerCase()) || !finalRound) {
      console.error("❌ BLOCKED: Attempted to save invalid round:", finalRound);
      return res.status(400).json({
        success: false,
        error: `Invalid round value detected: "${finalRound}". Cannot save to database.`,
      });
    }

    // Save round snapshot only if valid
    if (finalRound && pairings && pairings.length > 0) {
      console.log(`💾 Saving round ${finalRound} with ${pairings.length} pairings to MongoDB...`);

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

      console.log("✅ Round saved successfully");
    } else {
      console.log("⚠️ Not saving - missing pairings or invalid round");
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
  try {
    const { dbKey, sidKey, round, arbiterId, boardFrom, boardTo, pairings } = req.body;

    // ✅ Validate round value
    const invalidRoundValues = ["", "unknown", "undefined", null];
    if (invalidRoundValues.includes(round?.toLowerCase()) || !round) {
      console.error("❌ BLOCKED: Invalid round in assignment:", round);
      return res.status(400).json({
        success: false,
        error: `Invalid round value: "${round}". Cannot create assignment.`,
      });
    }

    const from = Number(boardFrom);
    const to = Number(boardTo);

    // Validation: Check for valid range
    if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid board range. Boards must be positive numbers.",
      });
    }

    if (from > to) {
      return res.status(400).json({
        success: false,
        error: "Board 'from' cannot be greater than board 'to'.",
      });
    }

    // Validation: Check for overlapping assignments in the same tournament/round
    const existingAssignments = await Assignment.find({ dbKey, round });

    for (const existing of existingAssignments) {
      const existingFrom = existing.boardFrom;
      const existingTo = existing.boardTo;

      // Check if ranges overlap
      // Overlap occurs if: from <= existingTo AND to >= existingFrom
      if (from <= existingTo && to >= existingFrom) {
        const arbiter = await Arbiter.findById(existing.arbiter);
        return res.status(400).json({
          success: false,
          error: `Boards ${from}-${to} overlap with existing assignment (boards ${existingFrom}-${existingTo} assigned to ${arbiter?.name || 'an arbiter'}).`,
        });
      }
    }

    // Validation: Check if boards exist in pairings
    const availableBoards = (pairings || []).map((p) => Number(p.board));
    const requestedBoards = [];
    for (let i = from; i <= to; i++) {
      requestedBoards.push(i);
    }

    const missingBoards = requestedBoards.filter((b) => !availableBoards.includes(b));
    if (missingBoards.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Boards ${missingBoards.join(", ")} do not exist in this round.`,
      });
    }

    const token = crypto.randomBytes(16).toString("hex");

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
  } catch (err) {
    console.error("❌ POST /assignments:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
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

router.get("/assignments/availability", async (req, res) => {
  try {
    const { dbKey, round, totalBoards } = req.query;

    if (!dbKey || !round || !totalBoards) {
      return res.status(400).json({
        success: false,
        error: "dbKey, round, and totalBoards are required",
      });
    }

    const total = Number(totalBoards);
    if (isNaN(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        error: "totalBoards must be a positive number",
      });
    }

    // Get all assignments for this tournament/round
    const assignments = await Assignment.find({ dbKey, round }).populate("arbiter");

    // Calculate assigned boards
    const assignedBoardsSet = new Set();
    assignments.forEach((assignment) => {
      for (let i = assignment.boardFrom; i <= assignment.boardTo; i++) {
        assignedBoardsSet.add(i);
      }
    });

    const assignedCount = assignedBoardsSet.size;
    const remainingCount = total - assignedCount;
    const assignedBoards = Array.from(assignedBoardsSet).sort((a, b) => a - b);

    return res.json({
      success: true,
      totalBoards: total,
      assignedCount,
      remainingCount,
      assignedBoards,
      assignments: assignments.map((a) => ({
        arbiter: a.arbiter?.name || "Unknown",
        boardFrom: a.boardFrom,
        boardTo: a.boardTo,
      })),
    });
  } catch (err) {
    console.error("❌ /assignments/availability:", err);
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
