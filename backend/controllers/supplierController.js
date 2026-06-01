const Supplier = require('../models/Supplier');

const nextIdFromLast = (lastId, prefix) => {
  if (!lastId) return `${prefix}-1`;
  const num = parseInt(lastId.replace(`${prefix}-`, ''), 10);
  return `${prefix}-${Number.isFinite(num) ? num + 1 : 1}`;
};

// GET NEXT ID
exports.getLatestSupplierId = async (req, res) => {
  try {
    const last = await Supplier.findOne().sort({ supplier_id: -1 });
    const nextId = nextIdFromLast(last?.supplier_id, 'SUP');
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPSERT
exports.upsertSupplier = async (req, res) => {
  try {
    const {
      id,
      supplier_id,
      supplier_name,
      contact_person,
      mobile_number,
      email,
      village_town,
      po,
      ps,
      district,
      pin,
      state,
      GST_number,
      drug_license_number,
      payment_terms,
      status
    } = req.body;
    const formattedName = (supplier_name || '').toUpperCase();
    const safeStatus = status || 'Active';

    if (id) {
      const updated = await Supplier.findByIdAndUpdate(
        id,
        {
          supplier_name: formattedName,
          contact_person: contact_person || '',
          mobile_number: mobile_number || '',
          email: email || '',
          village_town: village_town || '',
          po: po || '',
          ps: ps || '',
          district: district || '',
          pin: pin || '',
          state: state || '',
          GST_number: GST_number || '',
          drug_license_number: drug_license_number || '',
          payment_terms: payment_terms || '',
          status: safeStatus
        },
        { returnDocument: 'after' }
      );
      return res.json({ success: true, message: 'UPDATED', data: updated });
    }

    const existing = await Supplier.findOne({ supplier_name: formattedName });
    if (existing) return res.status(400).json({ success: false, message: 'ALREADY EXISTS' });

    const created = await Supplier.create({
      supplier_id,
      supplier_name: formattedName,
      contact_person: contact_person || '',
      mobile_number: mobile_number || '',
      email: email || '',
      village_town: village_town || '',
      po: po || '',
      ps: ps || '',
      district: district || '',
      pin: pin || '',
      state: state || '',
      GST_number: GST_number || '',
      drug_license_number: drug_license_number || '',
      payment_terms: payment_terms || '',
      status: safeStatus
    });
    res.status(201).json({ success: true, message: 'SAVED', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL
exports.getAllSuppliers = async (req, res) => {
  try {
    const data = await Supplier.find().sort({ supplier_id: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'DELETED' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
