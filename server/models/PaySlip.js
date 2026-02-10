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

// Individual Employee Payslip Entry
const employeeEntrySchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  employeeUserId: { type: String },
  departmentName: { type: String },
  designationName: { type: String }, 
  doj: { type: String },
  mobile: { type: String },
  email: { type: String },
  earnings: [earningSchema],
  deductions: [deductionSchema],
  otHours: { type: Number, default: 0 },
  otAmount: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  // lopAmount: { type: Number, default: 0 },
  monthDays: { type: Number, default: 0 },
  totalWorkingDays: { type: Number, default: 0 },
  totalOff: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },
  totalPaidDays: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalDeduction: { type: Number, default: 0 },
  // totalSalary: { type: Number, default: 0 },
  // paidDaysSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  inHandSalary: { type: Number, default: 0 },
});

const monthlyBatchSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    year: { type: String, required: true },
    status: { 
        type: String, 
        enum: ["Draft", "Finalized"], 
        default: "Draft" 
      },
    filterDept: { type: String, default: "All" },
    employeePayslips: [employeeEntrySchema],
  },
  { timestamps: true }
);
monthlyBatchSchema.index({ month: 1, year: 1, filterDept: 1 }, { unique: true });
export default mongoose.model("PaySlip", monthlyBatchSchema);