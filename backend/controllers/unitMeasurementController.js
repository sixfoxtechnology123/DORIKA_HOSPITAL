const UnitMeasurement = require('../models/UnitMeasurement');

const nextIdFromLast = (lastId, prefix) => {
  if (!lastId) return `${prefix}-1`;
  const num = parseInt(lastId.replace(`${prefix}-`, ''), 10);
  return `${prefix}-${Number.isFinite(num) ? num + 1 : 1}`;
};

// GET NEXT ID
exports.getLatestUnitId = async (req, res) => {
  try {
    const last = await UnitMeasurement.findOne().sort({ unit_id: -1 });
    const nextId = nextIdFromLast(last?.unit_id, 'UM');
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPSERT
exports.upsertUnit = async (req, res) => {
  try {
    // 1. Destructure status from req.body
    const { id, unit_id, base_unit_name, purchase_unit_name, status } = req.body;
    const formattedBaseName = (base_unit_name || '').toUpperCase();
    const formattedPurchaseName = (purchase_unit_name || '').toUpperCase();
    
    // 2. Safely format the status casing to match database schema conventions
    const formattedStatus = status && status.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    if (id) {
      const updated = await UnitMeasurement.findByIdAndUpdate(
        id,
        { 
          base_unit_name: formattedBaseName,
          purchase_unit_name: formattedPurchaseName,
          status: formattedStatus // 3. Added to update block
        },
        { returnDocument: 'after', runValidators: true }
      );
      return res.json({ success: true, message: 'UPDATED', data: updated });
    }

    // Duplicate check should run independent of status configurations
    const existing = await UnitMeasurement.findOne({ base_unit_name: formattedBaseName , purchase_unit_name: formattedPurchaseName });
    if (existing) return res.status(400).json({ success: false, message: 'ALREADY EXISTS' });

    const created = await UnitMeasurement.create({ 
      unit_id, 
      base_unit_name: formattedBaseName, 
      purchase_unit_name: formattedPurchaseName,
      status: formattedStatus // 4. Added to create payload
    });
    res.status(201).json({ success: true, message: 'SAVED', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL
exports.getAllUnits = async (req, res) => {
  try {
    const data = await UnitMeasurement.find().sort({ unit_id: 1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteUnit = async (req, res) => {
  try {
    await UnitMeasurement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'DELETED' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
