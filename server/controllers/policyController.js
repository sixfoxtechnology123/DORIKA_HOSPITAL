// controllers/policyController.js
const Policy = require("../models/policy");
const Activity = require("../models/Activity"); // Import Activity model
const path = require("path");

// ==================== Helpers ====================

// Format to dd-mm-yyyy (for display)
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Convert to yyyy-mm-dd (for <input type="date">)
const toInputDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

// Build file URL
const fileUrl = (filename) =>
  filename ? `http://localhost:5001/uploads/${filename}` : null;

// Format policy object for frontend
const formatPolicy = (policy) => ({
  ...policy._doc,
  effectiveDate: toInputDate(policy.effectiveDate),        // for <input>
  effectiveDateFormatted: formatDate(policy.effectiveDate), // for list display
  policyDocument: policy.policyDocument || null,           // raw file name
  policyDocumentUrl: fileUrl(policy.policyDocument),       // full link
});

// ==================== Auto ID ====================

const generatePolicyID = async () => {
  const last = await Policy.findOne().sort({ policyID: -1 });
  let nextNumber = 1;
  if (last && last.policyID) {
    const match = last.policyID.match(/POL(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `POL${String(nextNumber).padStart(4, "0")}`;
};

// ==================== Controllers ====================

// Get next PolicyID
exports.getNextPolicyID = async (req, res) => {
  try {
    const code = await generatePolicyID();
    res.json({ policyID: code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create Policy
exports.createPolicy = async (req, res) => {
  try {
    const { policyID, policyName, effectiveDate, status } = req.body;
    const policyDocument = req.file ? req.file.filename : null;

    const newPolicy = new Policy({
      policyID,
      policyName,
      policyDocument,
      effectiveDate,
      status,
    });

    await newPolicy.save();

    // Log activity
    try {
      await Activity.create({
        text: `Policy created: ${policyName} (${policyID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.status(201).json(formatPolicy(newPolicy));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Policies
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.json(policies.map(formatPolicy));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch policies" });
  }
};

// Get Single Policy (for Edit prefill)
exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found" });
    res.json(formatPolicy(policy));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Policy
exports.updatePolicy = async (req, res) => {
  try {
    const { policyName, effectiveDate, status } = req.body;
    const file = req.file ? req.file.filename : undefined;

    // keep old file if no new upload
    const updateData = { policyName, effectiveDate, status };
    if (file) updateData.policyDocument = file;

    const updated = await Policy.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Policy not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Policy updated: ${updated.policyName} (${updated.policyID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json(formatPolicy(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Policy
exports.deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Policy deleted: ${policy.policyName} (${policy.policyID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json({ message: "Policy deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
