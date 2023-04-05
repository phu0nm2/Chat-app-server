const mongoose = require("mongoose");

const oneToOneMess = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],

  message: [
    {
      to: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      from: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },

      type: {
        type: String,
        enum: ["Text", "Media", "Document", "Link"],
      },
      created_at: {
        type: Date,
        default: Date.now(),
      },
      text: {
        type: String,
      },
      file: {
        type: String,
      },
    },
  ],
});

const OneToOneMess = new mongoose.model("OneToOneMess", oneToOneMess);

module.exports = OneToOneMess;
