const PayrollComponent = require("../models/Payroll");
const Activity = require("../models/Activity"); // Import Activity model

// Auto-generate ComponentID
const generateComponentID = async () => {
  const last = await PayrollComponent.findOne().sort({ componentID: -1 });
  let nextNumber = 1;
  if (last && last.componentID) {
    const match = last.componentID.match(/PAYROLL(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `PAYROLL${String(nextNumber).padStart(3, "0")}`;
};

// Get next ComponentID
exports.getNextComponentID = async (req, res) => {
  try {
    const code = await generateComponentID();
    res.json({ componentID: code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create component
exports.createComponent = async (req, res) => {
  try {
    const { componentID, componentName, type, calculationType, percentageOf, taxable, status } =
      req.body;

    if (!componentID || !componentName || !type || !calculationType) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const component = new PayrollComponent({
      componentID,
      componentName,
      type,
      calculationType,
      percentageOf: calculationType === "Percentage" ? percentageOf : "",
      taxable,
      status,
    });

    const saved = await component.save();

    // Log activity
    try {
      await Activity.create({
        text: `Payroll component created: ${componentName} (${componentID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all components
exports.getAllComponents = async (req, res) => {
  try {
    const comps = await PayrollComponent.find();
    res.json(comps);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch components" });
  }
};

// Update component
exports.updateComponent = async (req, res) => {
  try {
    const updated = await PayrollComponent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Component not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Payroll component updated: ${updated.componentName} (${updated.componentID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete component
exports.deleteComponent = async (req, res) => {
  try {
    const deleted = await PayrollComponent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Component not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Payroll component deleted: ${deleted.componentName} (${deleted.componentID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json({ message: "Component deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
