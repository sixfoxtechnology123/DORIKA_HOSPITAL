const Designation = require('../models/Designation');
const Activity = require("../models/Activity");

const normalizeGrade = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (["I", "GRADE-I", "A", "GRADE 1", "GRADE-1", "1"].includes(raw)) return "I";
  if (["II", "GRADE-II", "B", "GRADE 2", "GRADE-2", "2"].includes(raw)) return "II";
  if (["III", "GRADE-III", "C", "GRADE 3", "GRADE-3", "3"].includes(raw)) return "III";
  if (["IV", "GRADE-IV", "D", "GRADE 4", "GRADE-4", "4"].includes(raw)) return "IV";
  return "";
};

// ---- Auto-generate DesignationID ----
const generateDesignationID = async () => {
  const last = await Designation.findOne().sort({ designationID: -1 });
  let nextNumber = 1;
  if (last?.designationID) {
    const match = last.designationID.match(/DESG(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `DESG${String(nextNumber).padStart(2, "0")}`;
};

// ---- Get next DesignationID ----
exports.getNextDesignationID = async (req, res) => {
  try {
    const code = await generateDesignationID();
    res.json({ designationID: code });
  } catch (err) {
    console.error("Get next designationID error:", err.message);
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// ---- Create ----
exports.createDesignation = async (req, res) => {
  try {
    const { designationID, designationName, departmentName, grade, status } = req.body;
    const normalizedGrade = normalizeGrade(grade);

    if (!designationID || !designationName || !departmentName || !normalizedGrade) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const designation = new Designation({
      designationID,
      designationName,
      departmentName,
      grade: normalizedGrade,
      status,
    });

    const savedDesignation = await designation.save();

    // ---- Activity Log ----
    try {
      await Activity.create({
        text: `Designation Added: ${savedDesignation.designationName} (${savedDesignation.designationID})`,
      });
    } catch (err) {
      console.error("Activity log failed (create):", err.message);
    }

    res.status(201).json(savedDesignation);
  } catch (err) {
    console.error("Save designation error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ---- Get All ----
exports.getAllDesignations = async (req, res) => {
  try {
    const designations = await Designation.find();
    res.json(designations);
  } catch (err) {
    console.error("Fetch designations error:", err.message);
    res.status(500).json({ error: "Failed to fetch designations" });
  }
};

// ---- Update ----
exports.updateDesignation = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updateData, "grade")) {
      const normalizedGrade = normalizeGrade(updateData.grade);
      if (!normalizedGrade) return res.status(400).json({ message: "Invalid grade" });
      updateData.grade = normalizedGrade;
    }

    const updated = await Designation.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Designation not found" });

    // ---- Activity Log ----
    try {
      await Activity.create({
        text: `Designation Updated: ${updated.designationName} (${updated.designationID})`,
      });
    } catch (err) {
      console.error("Activity log failed (update):", err.message);
    }

    res.json(updated);
  } catch (err) {
    console.error("Update designation error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ---- Delete ----
exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndDelete(req.params.id);
    if (!designation) return res.status(404).json({ message: "Designation not found" });

    // ---- Activity Log ----
    try {
      await Activity.create({
        text: `Designation Deleted: ${designation.designationName} (${designation.designationID})`,
      });
    } catch (err) {
      console.error("Activity log failed (delete):", err.message);
    }

    res.json({ message: "Designation deleted successfully" });
  } catch (err) {
    console.error("Delete designation error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
