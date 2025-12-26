const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true },

    dbKey: String,
    sidKey: String,
    round: String,

    arbiter: { type: mongoose.Schema.Types.ObjectId, ref: "Arbiter" },

    boardFrom: Number,
    boardTo: Number,

    pairings: [
      {
        board: String,
        playerA: String,
        playerB: String,
        whiteSNo: String,
        blackSNo: String,
      },
    ],

    results: [
      {
        board: String,
        result: String,
      },
    ],

    // 🔐 Submission lock - once submitted, results cannot be edited
    isSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", AssignmentSchema);
