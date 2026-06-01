const Stock = require("../models/Stock");

/**
 * Helper: Ensures values are valid numbers
 */
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Helper: Calculates the next sequential ID (STOCK-1, STOCK-2...)
 */
const getNextStockSeq = async () => {
  const result = await Stock.aggregate([
    // Match only IDs following the STOCK-number format
    { $match: { stock_id: { $type: "string", $regex: /^STOCK-\d+$/ } } },
    {
      $project: {
        // Split "STOCK-1" by "-" and convert the 2nd part (index 1) to integer
        num: { $toInt: { $arrayElemAt: [{ $split: ["$stock_id", "-"] }, 1] } }
      }
    },
    { $group: { _id: null, max: { $max: "$num" } } }
  ]);
  const max = result?.[0]?.max || 0;
  return max + 1;
};

// 1. Fetch All Stock
exports.getAllStock = async (req, res) => {
  try {
    const data = await Stock.find().sort({ last_updated: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. API endpoint to get the next ID
exports.getNextStockId = async (req, res) => {
  try {
    const seq = await getNextStockSeq();
    res.json({ stockId: `STOCK-${seq}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Create Stock (Manual Entry)
exports.createStock = async (req, res) => {
  try {
    const payload = { ...req.body };
    const quantityAvailable = toNumber(payload.quantity_available, 0);
    payload.quantity_available = quantityAvailable;
    payload.total_quantity = toNumber(payload.total_quantity, quantityAvailable);

    // Sequential ID generation with STOCK- prefix
    const seq = await getNextStockSeq();
    payload.stock_id = `STOCK-${seq}`;

    payload.last_updated = new Date();
    const stock = new Stock(payload);
    await stock.save();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Stock (Warning-Free Syntax)
exports.updateStock = async (req, res) => {
  try {
    const existing = await Stock.findById(req.params.id).select("total_quantity quantity_available");
    if (!existing) {
      return res.status(404).json({ msg: "Stock not found" });
    }

    const payload = { ...req.body, last_updated: new Date() };
    
    if (payload.quantity_available !== undefined) {
      payload.quantity_available = toNumber(payload.quantity_available, toNumber(existing.quantity_available, 0));
    }
    
    if (payload.total_quantity !== undefined) {
      payload.total_quantity = toNumber(
        payload.total_quantity,
        toNumber(existing.total_quantity, toNumber(existing.quantity_available, 0))
      );
    } else {
      payload.total_quantity = toNumber(existing.total_quantity, toNumber(existing.quantity_available, 0));
    }

    const data = await Stock.findByIdAndUpdate(
      req.params.id,
      payload,
      { 
        returnDocument: 'after', 
        runValidators: true      
      }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Stock
exports.deleteStock = async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    res.json({ msg: "Stock entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};