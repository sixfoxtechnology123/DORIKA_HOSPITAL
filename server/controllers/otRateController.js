const OtRate = require("../models/OtRate");

const createOtRate = async (req, res) => {
  try {

    const { rateType, employeeUserId } = req.body;

    // ✅ validation for duplicate employee

    if (rateType === "EMPLOYEE") {
    const exists = await OtRate.findOne({ employeeUserId });
    if (exists) {
        return res.status(400).json({
        message: `OT rate already exists for ${exists.employeeName} (${exists.employeeId})`,
        });
    }
    }

    const ot = await OtRate.create(req.body);
    res.status(201).json(ot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOtRates = async (req, res) => {
  try {
    const data = await OtRate.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOtRateByRule = async (req, res) => {
 
  const { employeeId, employeeUserId, designationName, departmentName } = req.query;

  const rate =
    // 1. Check by the unique User ID (DH-00002) first - Most Accurate
    (await OtRate.findOne({ employeeUserId })) || 
    // 2. Fallback to others if User ID isn't found
    (await OtRate.findOne({ rateType: "EMPLOYEE", employeeId })) ||
    (await OtRate.findOne({ rateType: "DESIGNATION", designationName })) ||
    (await OtRate.findOne({ rateType: "DEPARTMENT", departmentName }));

  res.json(rate);
};

const deleteOtRate = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await OtRate.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "OT Rate not found" });
    }

    res.status(200).json({ message: "OT Rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkExistingOtRates = async (req, res) => {
  try {
    const { rateType, designationName, departmentName, employeeId } = req.query;

    let query = {};
    if (rateType === "EMPLOYEE") {
      query = { employeeId };
    } else if (rateType === "DESIGNATION") {
      query = { designationName };
    } else if (rateType === "DEPARTMENT") {
      query = { departmentName };
    }

    // Find which employees in this group already have a record
    const existing = await OtRate.find(query).select("employeeId employeeName");
    
    res.json({ existing });
  } catch (error) {
    res.status(500).json({ message: "Error while checking OT rate" });
  }
};

// ✅ Inside otRateController.js
const applyBulkOtRate = async (req, res) => {
  const { employees, otRatePerHour, mode, rateType } = req.body;

  try {
    for (const emp of employees) {
      // We use employeeUserId because this NEVER changes even if status changes
      const filter = { employeeUserId: emp.employeeUserId }; 
      
      const update = {
        employeeUserId: emp.employeeUserId, 
        employeeId: emp.employeeID, // This will be the NEW ID from the frontend
        employeeName: `${emp.firstName} ${emp.lastName}`,
        designationName: emp.designationName,
        departmentName: emp.departmentName,
        otRatePerHour,
        rateType
      };

      if (mode === "ALL") {
        // Find by permanent UserID and update the details (Replacement logic)
        await OtRate.findOneAndUpdate(filter, update, { upsert: true });
      } else if (mode === "EXCEPT") {
        const exists = await OtRate.findOne(filter);
        if (!exists) {
          await OtRate.create(update);
        }
      }
    }
    res.json({ message: "Operation successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
module.exports = {
  createOtRate,
  getOtRates,
  getOtRateByRule,
  deleteOtRate,
  applyBulkOtRate,
  checkExistingOtRates
};