import mongoose from "mongoose";

const groupCallSchema = new mongoose.Schema({
  groupId:   { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  type:      { type: String, enum: ["audio", "video"], required: true },
  duration:  { type: Number, default: null }, // seconds, null = missed/no answer
  startedAt: { type: Date, default: Date.now },
  endedAt:   { type: Date, default: null },
}, { timestamps: true });

const GroupCall = mongoose.model("GroupCall", groupCallSchema);
export default GroupCall;
