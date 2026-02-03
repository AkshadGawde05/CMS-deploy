import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now },
});

CounterSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model("Counter", CounterSchema);
