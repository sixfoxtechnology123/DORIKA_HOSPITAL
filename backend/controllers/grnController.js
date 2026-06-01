const GRN = require("../models/GRN");
const Stock = require("../models/Stock");
const PurchaseOrder = require("../models/PurchaseOrder");

// Helper to ensure all values are rounded whole numbers
const roundVal = (v) => Math.round(Number(v || 0));
const getConvertedQty = (item = {}) => roundVal(Number(item.received_quantity || 0) * Number(item.conversion_factor || 1));
const extractSeq = (value, prefix) => {
  const raw = String(value || "").trim();
  if (!raw.startsWith(prefix)) return 0;
  const seq = Number(raw.slice(prefix.length));
  return Number.isFinite(seq) ? seq : 0;
};

const getNextGrnSeq = async () => {
  const grns = await GRN.find({}, { grn_id: 1, grn_number: 1 }).lean();
  const maxSeq = grns.reduce((max, item) => {
    const fromId = extractSeq(item?.grn_id, "GRN-");
    const fromNumber = extractSeq(item?.grn_number, "GRNNo-");
    return Math.max(max, fromId, fromNumber);
  }, 0);

  return maxSeq + 1;
};

// 1. Generate GRN IDs (Matches your Route: getNextGRNNumber)
exports.getNextGRNNumber = async (req, res) => {
  try {
    const seq = await getNextGrnSeq();
    res.json({ 
      grnId: `GRN-${seq}`, 
      grnNumber: `GRNNo-${seq}` 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. List GRNs (Matches your Route: getAllGRNs)
exports.getAllGRNs = async (req, res) => {
  try {
    const grns = await GRN.find().sort({ createdAt: -1 });
    res.json(grns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Create GRN + Update Stock Master (Nested Array) + Update PO
exports.createGRN = async (req, res) => {
  try {
    const payload = { ...req.body };

    // 1. Handle GRN IDs
    if (!payload.grn_id || !payload.grn_number) {
      const seq = await getNextGrnSeq();
      payload.grn_id = payload.grn_id || `GRN-${seq}`;
      payload.grn_number = payload.grn_number || `GRNNo-${seq}`;
    }
    if (payload.received_by) payload.received_by = String(payload.received_by).trim();
 // 2. Round values and prepare items
    if (payload.items && Array.isArray(payload.items)) {
      payload.items = payload.items.map(item => {
        const cf = Number(item.conversion_factor || 1);
        const mrpVal = roundVal(item.mrp);
        
        //  CORRECTED FORMULA: mrp / conversion_factor
        const calculatedPrice = cf > 0 ? (mrpVal / cf) : mrpVal;

        return {
          ...item,
          po_item_id: item.po_item_id ? String(item.po_item_id).trim() : "",
          grn_number: payload.grn_number,
          po_number: item.po_number || payload.po_number,
          received_quantity: roundVal(item.received_quantity),
          purchase_price: roundVal(item.purchase_price),
          mrp: mrpVal,
          conversion_factor: cf,
          per_medicine_price: Number(calculatedPrice).toFixed(2) // Calculates unit price correctly
        };
      });
    }

    const grn = new GRN(payload);
    await grn.save();

    // 3. Process Stock Master (NESTED ARRAY LOGIC)
    if (payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        const batch = String(item.batch_number || '').trim().toUpperCase();
        const poNo = item.po_number || payload.po_number;
        const convertedQty = getConvertedQty(item);

        // A. Generate a NEW Sequential ID if this is a new batch
        // We look inside the "batches" array of all documents to find the max
        const lastStockRecord = await Stock.aggregate([
          { $unwind: "$batches" },
          { $match: { "batches.stock_id": { $regex: /^STOCK-/ } } },
          { $project: { num: { $toInt: { $arrayElemAt: [{ $split: ["$batches.stock_id", "-"] }, 1] } } } },
          { $group: { _id: null, max: { $max: "$num" } } }
        ]);
        const nextStockNum = (lastStockRecord[0]?.max || 0) + 1;
        const newStockId = `STOCK-${nextStockNum}`;

        // B. Update the Main Medicine Document (creates it if it doesn't exist)
        // This keeps one object per medicine_id
        await Stock.findOneAndUpdate(
          { medicine_id: item.medicine_id },
          { 
            $set: { 
              medicine_name: item.medicine_name,
              conversion_factor: item.conversion_factor,
              per_medicine_price: item.per_medicine_price,
              last_updated: Date.now() 
            },
            $inc: {
              total_stock_available: convertedQty,
              total_grn_received_quantity: convertedQty
            }
          },
          { upsert: true, returnDocument: 'after' }
        );

        // C. Check if this specific Batch already exists in the array for this medicine
       // --- Inside createGRN function loop ---

// C. Check if this specific Batch AND Expiry combo already exists
const medicineDoc = await Stock.findOne({ 
  medicine_id: item.medicine_id, 
  "batches.batch_number": batch,
  "batches.expiry_date": item.expiry_date // <-- ADD THIS LINE
});

if (medicineDoc) {
  // IF BOTH BATCH AND EXPIRY MATCH: Update the existing object
  await Stock.updateOne(
    { 
      medicine_id: item.medicine_id, 
      "batches.batch_number": batch,
      "batches.expiry_date": item.expiry_date // <-- ADD THIS LINE
    },
    { 
      $inc: { 
        "batches.$.quantity_available": item.received_quantity,
        "batches.$.total_grn_received_quantity": convertedQty,
        "batches.$.total_received": item.received_quantity 
      },
      $set: { 
        "batches.$.po_number": poNo,
        "batches.$.grn_number": payload.grn_number,
        "batches.$.per_medicine_price": item.per_medicine_price
      }
    }
  );
} else {
  // IF EITHER BATCH OR EXPIRY IS DIFFERENT: 
  // It will go here and create a NEW object in the batches array
  await Stock.updateOne(
    { medicine_id: item.medicine_id },
    { 
      $push: { 
        batches: {
          stock_id: newStockId,
          batch_number: batch,
          expiry_date: item.expiry_date,
          po_number: poNo,
          grn_number: payload.grn_number,
          supplier_id: payload.supplier_id,
          purchase_price: item.purchase_price,
          mrp: item.mrp,
          conversion_factor: item.conversion_factor,
          quantity_available: item.received_quantity,
          total_grn_received_quantity: convertedQty,
          grn_received_qty: item.received_quantity,
          total_received: item.received_quantity,
          added_at: Date.now()
        }
      }
    }
  );
}
        // 4. Update Purchase Order Quantities
        if (poNo) {
          const poItemId = String(item.po_item_id || "").trim();

          if (poItemId) {
            await PurchaseOrder.findOneAndUpdate(
              { po_number: poNo, "items._id": poItemId },
              { $inc: { "items.$.received_quantity": item.received_quantity } },
              { returnDocument: 'after' }
            );
          } else {
            await PurchaseOrder.findOneAndUpdate(
              { po_number: poNo, "items.medicine_id": item.medicine_id },
              { $inc: { "items.$.received_quantity": item.received_quantity } },
              { returnDocument: 'after' }
            );
          }
        }
      }
    }

    // 5. Update PO Status
    if (payload.po_status_updates && Array.isArray(payload.po_status_updates)) {
      for (const update of payload.po_status_updates) {
        await PurchaseOrder.findOneAndUpdate(
          { po_number: update.po_number },
          { po_final_status: update.po_final_status },
          { returnDocument: 'after' }
        );
      }
    }

    res.status(201).json({ success: true, data: grn });
  } catch (err) {
    console.error("GRN Creation Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Update GRN (Modified to handle Conversion Factor)
exports.updateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const oldGrn = await GRN.findById(id);
    if (!oldGrn) return res.status(404).json({ error: "GRN not found" });

    // --- STEP 1: REVERSE OLD STOCK ---
    for (const item of oldGrn.items) {
      const convertedQty = getConvertedQty(item);
      await Stock.findOneAndUpdate(
        { medicine_id: item.medicine_id },
        {
          $inc: {
            total_stock_available: -convertedQty,
            total_grn_received_quantity: -convertedQty
          }
        }
      );
      await Stock.updateOne(
        { medicine_id: item.medicine_id, "batches.batch_number": item.batch_number },
        {
          $inc: {
            "batches.$.quantity_available": -Number(item.received_quantity),
            "batches.$.total_grn_received_quantity": -convertedQty
          }
        }
      );
    }

    // --- STEP 2: PREPARE NEW PAYLOAD (THE CRITICAL PART) ---
    const payload = { ...req.body };
    if (payload.received_by && String(payload.received_by).trim() !== "") {
      payload.received_by = String(payload.received_by).trim();
    } else {
      delete payload.received_by; // Prevents Mongo from overwriting with blank space if missing from state
    }
 if (payload.items && Array.isArray(payload.items)) {
      payload.items = payload.items.map(item => {
        const cf = Number(item.conversion_factor || 1);
        const mrpVal = roundVal(item.mrp);
        
        //  CORRECTED FORMULA: mrp / conversion_factor
        const calculatedPrice = cf > 0 ? (mrpVal / cf) : mrpVal;

        return {
          ...item,
          po_item_id: item.po_item_id ? String(item.po_item_id).trim() : "",
          received_quantity: roundVal(item.received_quantity),
          purchase_price: roundVal(item.purchase_price),
          mrp: mrpVal,
          conversion_factor: cf,
          per_medicine_price: Number(calculatedPrice).toFixed(2) // Calculates unit price correctly
        };
      });
    }

    // --- STEP 3: UPDATE GRN DOCUMENT ---
    const updatedGrn = await GRN.findByIdAndUpdate(id, payload, { returnDocument: 'after' });

    // --- STEP 4: APPLY NEW STOCK ---
    for (const item of updatedGrn.items) {
      const convertedQty = getConvertedQty(item);
      await Stock.findOneAndUpdate(
        { medicine_id: item.medicine_id },
        { 
          $set: { conversion_factor: item.conversion_factor, per_medicine_price: item.per_medicine_price }, // Update CF and per-medicine price in stock master
          $inc: {
            total_stock_available: convertedQty,
            total_grn_received_quantity: convertedQty
          }
        }
      );
      await Stock.updateOne(
        { medicine_id: item.medicine_id, "batches.batch_number": item.batch_number },
        { 
          $set: { "batches.$.conversion_factor": item.conversion_factor, "batches.$.per_medicine_price": item.per_medicine_price }, // Update CF and per-medicine price in batch
          $inc: {
            "batches.$.quantity_available": item.received_quantity,
            "batches.$.total_grn_received_quantity": convertedQty
          }
        }
      );
    }

    res.json({ success: true, data: updatedGrn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete GRN + REVERSE STOCK
exports.deleteGRN = async (req, res) => {
  try {
    // 1. Find the GRN document first to know what to reverse
    const grn = await GRN.findById(req.params.id);
    if (!grn) return res.status(404).json({ error: "GRN not found" });

    // 2. Loop through items to subtract from Stock
    if (grn.items && Array.isArray(grn.items)) {
      for (const item of grn.items) {
        const batch = String(item.batch_number || '').trim().toUpperCase();
        const convertedQty = getConvertedQty(item);

        // A. Decrease Total Stock in Main Medicine Document
        await Stock.findOneAndUpdate(
          { medicine_id: item.medicine_id },
          {
            $inc: {
              total_stock_available: -convertedQty,
              total_grn_received_quantity: -convertedQty
            }
          }
        );

        // B. Decrease Quantity in the specific Batch inside the array
        await Stock.updateOne(
          { 
            medicine_id: item.medicine_id, 
            "batches.batch_number": batch,
            "batches.expiry_date": item.expiry_date 
          },
          { 
            $inc: { 
              "batches.$.quantity_available": -item.received_quantity,
              "batches.$.total_grn_received_quantity": -convertedQty,
              "batches.$.total_received": -item.received_quantity 
            } 
          }
        );

        // C. Optional: Reverse PO received quantity
        if (item.po_number) {
          const poItemId = String(item.po_item_id || "").trim();

          if (poItemId) {
            await PurchaseOrder.findOneAndUpdate(
              { po_number: item.po_number, "items._id": poItemId },
              { $inc: { "items.$.received_quantity": -item.received_quantity } }
            );
          } else {
            await PurchaseOrder.findOneAndUpdate(
              { po_number: item.po_number, "items.medicine_id": item.medicine_id },
              { $inc: { "items.$.received_quantity": -item.received_quantity } }
            );
          }
        }
      }
    }

    // 3. Finally, delete the actual GRN record
    await GRN.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "GRN deleted and stock reversed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
