// models/SalaryHead.js
import mongoose from "mongoose";

const SalaryHeadSchema = new mongoose.Schema({
  headType: {
    // "EARNING" or "DEDUCTION"
    type: String,
    required: true,
    enum: ["EARNING", "DEDUCTION"],
    uppercase: true,
  },
  headId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  headName: {
    type: String,
    required: true,
    uppercase: true,
  },
}, { timestamps: true });

export default mongoose.model("SalaryHead", SalaryHeadSchema);
