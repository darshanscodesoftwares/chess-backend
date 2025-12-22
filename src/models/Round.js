// src/models/Round.js
const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema(
  {
    dbKey: { type: String, required: true },
    sidKey: { type: String, required: true },
    round: { type: String, required: true },

    // Full list of pairings for that round (no results)
    pairings: [
      {
        board: String,
        playerA: String,
        playerB: String,
        whiteSNo: String,
        blackSNo: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Round", RoundSchema);
