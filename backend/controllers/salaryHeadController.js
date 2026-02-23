// controllers/salaryHeadController.js
import SalaryHead from "../models/SalaryHead.js";

/**
 * Helper: generate next ID for the given headType
 * For EARNING -> prefix "EARN" -> EARN1, EARN2...
 * For DEDUCTION -> prefix "DEDUCT" -> DEDUCT1, DEDUCT2...
 */
const getNextId = async (headType) => {
  const prefix = headType === "EARNING" ? "EARN" : "DEDUCT";
  // Find last created ID with prefix, sort by createdAt desc or by headId numeric part
  // We search for headId starting with prefix and pick the highest numeric suffix.
  const latest = await SalaryHead.find({ headId: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();

  if (!latest || latest.length === 0) {
    return `${prefix}1`;
  }

  const lastId = latest[0].headId; // e.g. "EARN12" or "DEDUCT5"
  const numPart = lastId.replace(prefix, "");
  const num = parseInt(numPart, 10);
  if (isNaN(num)) return `${prefix}1`;
  return `${prefix}${num + 1}`;
};

// Create new Salary Head (auto-generate headId)
export const createSalaryHead = async (req, res) => {
  try {
    const { headType, headName } = req.body;

    if (!headType || !headName) {
      return res.status(400).json({ success: false, message: "headType and headName required" });
    }

    const typeUpper = headType.toUpperCase();
    if (!["EARNING", "DEDUCTION"].includes(typeUpper)) {
      return res.status(400).json({ success: false, message: "headType must be EARNING or DEDUCTION" });
    }

    // Generate next ID
    const headId = await getNextId(typeUpper);

    const doc = await SalaryHead.create({
      headType: typeUpper,
      headId,
      headName: headName.toUpperCase(),
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    // handle duplicate headId just in case
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate headId, try again" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Fetch all salary heads (optional filter by type)
export const listSalaryHeads = async (req, res) => {
  try {
    const { type } = req.query; // optional ?type=EARNING
    const filter = {};
    if (type) filter.headType = type.toUpperCase();
    const items = await SalaryHead.find(filter).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get single by ID (headId)
export const getByHeadId = async (req, res) => {
  try {
    const { headId } = req.params;
    const item = await SalaryHead.findOne({ headId: headId.toUpperCase() }).lean();
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update head (headName or headType) - note: changing headType won't change the headId prefix
export const updateSalaryHead = async (req, res) => {
  try {
    const { id } = req.params; // mongo _id
    const updates = {};
    if (req.body.headName) updates.headName = req.body.headName.toUpperCase();
    if (req.body.headType) updates.headType = req.body.headType.toUpperCase();

    const updated = await SalaryHead.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
// Add this function at the top or near getNextId
export const getNextSalaryHeadId = async (req, res) => {
  try {
    const { type } = req.query;
    if (!type || !["EARNING", "DEDUCTION"].includes(type.toUpperCase())) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const nextId = await getNextId(type.toUpperCase());
    return res.json({ success: true, nextId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
// Delete salary head by Mongo _id
export const deleteSalaryHead = async (req, res) => {
  try {
    const { id } = req.params; // Mongo _id
    const deleted = await SalaryHead.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Salary head not found" });
    return res.json({ success: true, message: "Salary head deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
