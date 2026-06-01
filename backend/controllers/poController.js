const PurchaseOrder = require('../models/PurchaseOrder');

exports.createPO = async (req, res) => {
  try {
    const lastPO = await PurchaseOrder.findOne().sort({ createdAt: -1 });
    
    let nextNumber = 1;
    if (lastPO && lastPO.po_id) {
      const lastNumber = parseInt(lastPO.po_id.replace('PO-', ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const { supplier_id, expected_delivery_date, remarks, items, created_by, po_date } = req.body;

    const newPO = new PurchaseOrder({
      po_number: `PONo-${nextNumber}`,
      po_id: `PO-${nextNumber}`,
      supplier_id,
      po_date,
      expected_delivery_date,
      remarks,
      created_by: String(created_by || '').trim(),
      items, 
      status: 'Draft',
      // ADDED: Default status for the warehouse
      po_final_status: '--' 
    });

    const savedPO = await newPO.save();
    res.status(201).json(savedPO);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "PO ID already exists. Database sync error." });
    }
    res.status(400).json({ message: "Error creating PO", error: error.message });
  }
};

// Get All Purchase Orders for the List View
exports.getAllPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.status(200).json(pos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single PO Details (for the Eye Icon)
exports.getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    res.status(200).json(po);
  } catch (error) {
    res.status(404).json({ message: "PO Not Found" });
  }
};

exports.updatePO = async (req, res) => {
  try {
    const { 
      supplier_id, 
      expected_delivery_date, 
      remarks, 
      items, 
      created_by, 
      status, 
      po_date, 
      po_final_status 
    } = req.body;
    
    // 1. Build the update payload object dynamically
    const updatePayload = {
      supplier_id,
      expected_delivery_date,
      remarks,
      items,
      status,
      po_date,
      po_final_status
    };

    // 2. Safely retain or update created_by field values
    if (created_by && String(created_by).trim() !== "") {
      updatePayload.created_by = String(created_by).trim();
    }
    
    // 3. Commit explicit tracking payload changes to MongoDB
    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload }, 
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!updated) return res.status(404).json({ message: 'PO Not Found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating PO', error: error.message });
  }
};

// Delete Purchase Order
exports.deletePO = async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'PO Not Found' });
    res.status(200).json({ message: 'PO Deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting PO', error: error.message });
  }
};
