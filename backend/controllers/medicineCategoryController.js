const MedicineCategory = require('../models/MedicineCategory');

const extractNumericId = (value, prefix) => {
  const raw = String(value || '');
  const num = parseInt(raw.replace(`${prefix}-`, ''), 10);
  return Number.isFinite(num) ? num : 0;
};

// GET NEXT ID
exports.getLatestCategoryId = async (req, res) => {
  try {
    const records = await MedicineCategory.find({}, { category_id: 1 });
    const maxNum = records.reduce((max, item) => {
      return Math.max(max, extractNumericId(item.category_id, 'MEDCAT'));
    }, 0);
    const nextId = `MEDCAT-${maxNum + 1}`;
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPSERT
exports.upsertCategory = async (req, res) => {
  try {
    const { id, category_id, category_name, description, status, type } = req.body;
    const formattedName = (category_name || '').toUpperCase();
    const safeStatus = status || 'Active';
    const safeDescription = description || '';
    const safeType = (type || '').toString().trim().toUpperCase();

    if (id) {
      const updated = await MedicineCategory.findByIdAndUpdate(
        id,
        { category_name: formattedName, type: safeType, description: safeDescription, status: safeStatus },
        { returnDocument: 'after' }
      );
      return res.json({ success: true, message: 'UPDATED', data: updated });
    }

    const existing = await MedicineCategory.findOne({ category_name: formattedName });
    if (existing) return res.status(400).json({ success: false, message: 'ALREADY EXISTS' });

    const created = await MedicineCategory.create({
      category_id,
      category_name: formattedName,
      type: safeType,
      description: safeDescription,
      status: safeStatus
    });
    res.status(201).json({ success: true, message: 'SAVED', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL
exports.getAllCategories = async (req, res) => {
  try {
    const data = await MedicineCategory.find();
    data.sort((a, b) => extractNumericId(a.category_id, 'MEDCAT') - extractNumericId(b.category_id, 'MEDCAT'));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteCategory = async (req, res) => {
  try {
    await MedicineCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'DELETED' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
