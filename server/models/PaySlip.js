import mongoose from "mongoose";

// Earning Head Schema
const earningSchema = new mongoose.Schema({
  headName: { type: String, required: true },
  type: { type: String, required: true }, 
  amount: { type: Number, required: true },
});

// Deduction Head Schema
const deductionSchema = new mongoose.Schema({
  headName: { type: String, required: true },
  type: { type: String, required: true }, 
  amount: { type: Number, required: true },
});

const paySlipSchema = new mongoose.Schema(
  {
    // Basic Info
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    employeeUserId: { type: String }, // Added per request
    mobile: { type: String },
    email: { type: String },
    month: { type: String, required: true },
    year: { type: String, required: true },

    // Breakdown Lists
    earnings: [earningSchema],
    deductions: [deductionSchema],

    // OT & LOP Details
    otHours: { type: Number, default: 0 },
    otAmount: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 }, // LOP Days
    lopAmount: { type: Number, default: 0 },

    // Attendance Stats
    monthDays: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 }, // Total Working
    totalOff: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    totalPaidDays: { type: Number, default: 0 },

    // Salary Logic Totals
    grossSalary: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 },      // Total Salary = Earning - Deduction
    paidDaysSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    inHandSalary: { type: Number, default: 0 },     // netsalary
  },
  { timestamps: true }
);

export default mongoose.model("PaySlip", paySlipSchema);