const Prescription = require('../models/Prescription');

const parsePrescriptionDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const trimmed = String(value).trim();
  const dm = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dm) {
    return new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

exports.getPrescriptions = async (req, res) => {
  try {
    const data = await Prescription.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getNextId = async (req, res) => {
  const { type } = req.query;
  const normalized = String(type || '').toLowerCase();
  const count = await Prescription.countDocuments();
  const prefix = normalized === 'digital' ? 'DP' : 'HP';
  res.json({ success: true, nextId: `${prefix}-${count + 1}` });
};

exports.savePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {
      ...req.body,
      visitDate: parsePrescriptionDate(req.body.visitDate),
      nextVisitDate: parsePrescriptionDate(req.body.nextVisitDate)
    };
    if (id) {
      const updated = await Prescription.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
      return res.json({ success: true, data: updated });
    }
    const newDoc = new Prescription(payload);
    await newDoc.save();
    res.json({ success: true, data: newDoc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePrescription = async (req, res) => {
  try {
    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
