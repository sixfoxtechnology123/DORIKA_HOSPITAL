const PharmacyBill = require('../models/PharmacyBill');
const Stock = require('../models/Stock');

const toNumber = (v) => Number(parseFloat(Number(v || 0).toFixed(2)));
const normalizeMedicineId = (value) => String(value || '').trim();
const normalizeBatchNumber = (value) => String(value || '').trim().toUpperCase();

const normalizeBillItem = (item = {}) => ({
  ...item,
  medicine_id: normalizeMedicineId(item.medicine_id),
  stock_id: String(item.stock_id || '').trim(),
  generic_id: String(item.generic_id || '').trim(),
  batch_number: normalizeBatchNumber(item.batch_number),
  qty: toNumber(item.qty),
  price: toNumber(item.price),
  discount: toNumber(item.discount),
  gst_percent: Number(item.gst_percent ?? 0),
  gst_amount: toNumber(item.gst_amount ?? item.gst),
  total: toNumber(item.total)
});

const getItemKey = (medicineId, batchNumber) =>
  `${normalizeMedicineId(medicineId)}::${normalizeBatchNumber(batchNumber)}`;

const groupItems = (items = []) => {
  const grouped = new Map();

  items.map(normalizeBillItem).forEach((item) => {
    const medicineId = normalizeMedicineId(item.medicine_id);
    const batchNumber = normalizeBatchNumber(item.batch_number);
    if (!medicineId || !batchNumber || item.qty <= 0) return;

    const key = getItemKey(medicineId, batchNumber);
    const current = grouped.get(key);

    if (current) {
      current.qty += item.qty;
      return;
    }

    grouped.set(key, {
      medicine_id: medicineId,
      batch_number: batchNumber,
      qty: item.qty,
      medicine_name: item.medicine_name || ''
    });
  });

  return Array.from(grouped.values());
};

const getAvailableFromStock = async (medicineId, batchNumber, currentBillId = null) => {
  try {
    const normalizedMedicineId = normalizeMedicineId(medicineId);
    const normalizedBatchNumber = normalizeBatchNumber(batchNumber);
    if (!normalizedMedicineId || !normalizedBatchNumber) return 0;

    const stockDoc = await Stock.findOne({ medicine_id: normalizedMedicineId }).lean();
    if (!stockDoc || !Array.isArray(stockDoc.batches)) return 0;

    const targetBatch = stockDoc.batches.find(
      (batch) => normalizeBatchNumber(batch.batch_number) === normalizedBatchNumber
    );
    if (!targetBatch) return 0;

    let available = toNumber(
      targetBatch.total_grn_received_quantity ?? targetBatch.quantity_available
    );

    if (currentBillId) {
      const bill = await PharmacyBill.findById(currentBillId).lean();
      const reservedQty = (bill?.items || []).reduce((sum, item) => {
        if (
          normalizeMedicineId(item.medicine_id) === normalizedMedicineId &&
          normalizeBatchNumber(item.batch_number) === normalizedBatchNumber
        ) {
          return sum + toNumber(item.qty);
        }
        return sum;
      }, 0);
      available += reservedQty;
    }

    return available;
  } catch (err) {
    console.error('Error fetching stock:', err);
    return 0;
  }
};

const applyStockAdjustments = async (groupedItems, direction) => {
  for (const item of groupedItems) {
    const qtyDelta = direction * toNumber(item.qty);
    const result = await Stock.updateOne(
      {
        medicine_id: item.medicine_id,
        'batches.batch_number': item.batch_number
      },
      {
        $inc: {
          'batches.$.quantity_available': qtyDelta,
          'batches.$.total_grn_received_quantity': qtyDelta,
          'batches.$.sale_qty': -qtyDelta,
          total_stock_available: qtyDelta,
          total_grn_received_quantity: qtyDelta,
          sale_qty: -qtyDelta
        },
        $set: {
          last_updated: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      throw new Error(`Stock batch not found for ${item.medicine_id} / ${item.batch_number}`);
    }
  }
};

const revertStockAdjustments = async (groupedItems, direction) => {
  if (!groupedItems?.length) return;
  await applyStockAdjustments(groupedItems, direction * -1);
};

const validateStockAvailability = async (items, currentBillId = null) => {
  const normalizedItems = items.map(normalizeBillItem);

  for (const item of normalizedItems) {
    if (!item.medicine_id) {
      return { ok: false, message: 'Medicine is required for every billing row' };
    }
    if (!item.batch_number) {
      return {
        ok: false,
        message: `Batch number is required for ${item.medicine_name || item.medicine_id}`
      };
    }
    if (item.qty <= 0) {
      return {
        ok: false,
        message: `Quantity must be greater than 0 for ${item.medicine_name || item.medicine_id}`
      };
    }
  }

  const groupedItems = groupItems(normalizedItems);

  if (groupedItems.length === 0) {
    return { ok: false, message: 'Add at least one valid medicine item' };
  }

  for (const item of groupedItems) {
    const available = await getAvailableFromStock(item.medicine_id, item.batch_number, currentBillId);
    if (available < item.qty) {
      return {
        ok: false,
        message: `Insufficient stock for ${item.medicine_name || item.medicine_id} batch ${item.batch_number}. Available: ${available}`
      };
    }
  }

  return { ok: true, groupedItems };
};

exports.getAllBills = async (req, res) => {
  try {
    const data = await PharmacyBill.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { items = [] } = req.body;
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'No medicines added' });
    }

    const normalizedItems = items.map(normalizeBillItem);
    const validation = await validateStockAvailability(normalizedItems);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    await applyStockAdjustments(validation.groupedItems, -1);

    const subtotal = normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0);
    const gst_amount = normalizedItems.reduce((sum, item) => sum + toNumber(item.gst_amount), 0);

    let bill;
    try {
      bill = await PharmacyBill.create({
        ...req.body,
        items: normalizedItems,
        subtotal,
        gst_amount,
        total_amount: toNumber(req.body.total_amount)
      });
    } catch (error) {
      await revertStockAdjustments(validation.groupedItems, -1);
      throw error;
    }

    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const existingBill = await PharmacyBill.findById(id);
    if (!existingBill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const normalizedItems = (req.body.items || []).map(normalizeBillItem);
    const validation = await validateStockAvailability(normalizedItems, id);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const existingGroupedItems = groupItems(existingBill.items || []);
    await applyStockAdjustments(existingGroupedItems, 1);

    try {
      await applyStockAdjustments(validation.groupedItems, -1);
    } catch (error) {
      await revertStockAdjustments(existingGroupedItems, 1);
      throw error;
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0);
    const gst_amount = normalizedItems.reduce((sum, item) => sum + toNumber(item.gst_amount), 0);

    Object.assign(existingBill, {
      ...req.body,
      items: normalizedItems,
      subtotal,
      gst_amount,
      total_amount: toNumber(req.body.total_amount)
    });

    try {
      await existingBill.save();
    } catch (error) {
      await revertStockAdjustments(validation.groupedItems, -1);
      await applyStockAdjustments(existingGroupedItems, -1);
      throw error;
    }

    res.status(200).json({ success: true, data: existingBill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await PharmacyBill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const groupedItems = groupItems(bill.items || []);
    await applyStockAdjustments(groupedItems, 1);

    try {
      await PharmacyBill.findByIdAndDelete(req.params.id);
    } catch (error) {
      await revertStockAdjustments(groupedItems, 1);
      throw error;
    }

    res.status(200).json({ success: true, message: 'Bill deleted and stock restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
