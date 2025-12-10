// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./db/db");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

dotenv.config();

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// Serve static files from "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------- Routes -----------------
const departmentRoutes = require("./routes/departmentRoutes");
const designationRoutes = require("./routes/designationRoutes");
const masterRoutes = require("./routes/masterRoutes");
const leaveTypeRoutes = require("./routes/leavetyperoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const shiftRoutes = require("./routes/shiftroutes");
const policyRoutes = require("./routes/policyRoutes");
const locationRoutes = require("./routes/locationroutes");
const payrollComponentRoutes = require("./routes/payrollComponentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const activityRoutes = require("./routes/activityRoutes");
const adminManagementRoutes = require("./routes/adminManagementRoutes");
const leaveRuleRoutes = require("./routes/leaveRule");
const leaveAllocationRoutes = require("./routes/leaveAllocationRoutes");
const employeeUserIdRoutes = require("./routes/employeeUserId");
const leaveApplicationRoutes = require("./routes/leaveApplicationRoutes");
const salaryHeadRoutes = require("./routes/salaryHeadRoutes");
const paySlipRoutes = require("./routes/paySlipRoutes");


app.use("/api/master", masterRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/leavetypes", leaveTypeRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/payrollcomponents", payrollComponentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard/activities", activityRoutes);
app.use("/api/adminManagement", adminManagementRoutes);
app.use("/api/leaverule", leaveRuleRoutes);
app.use("/api/leaveAllocations", leaveAllocationRoutes);
app.use("/api/employee-ids", employeeUserIdRoutes);
app.use("/api/leave-application", leaveApplicationRoutes);
app.use("/api/salary-heads", salaryHeadRoutes);
app.use("/api/payslips", paySlipRoutes);

// ----------------- Create Default Admin -----------------
const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ userId: "dorika" });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("dorika123", 10);
      await Admin.create({
        userId: "dorika",
        name: "Main Admin",
        password: hashedPassword,
        role: "Admin",
        profileImage: "",
      });
      console.log("Default admin created → userId: dorika | password: dorika123");
    } else {
      console.log("Default admin already exists in database");
    }
  } catch (err) {
    console.error(" Error creating default admin:", err);
  }
};

// ----------------- Start Server -----------------
const startServer = async () => {
  try {
    await connectDB();
    await createDefaultAdmin();

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Server failed to start:", err);
  }
};

startServer();
