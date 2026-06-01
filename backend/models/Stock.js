const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  medicine_id: { type: String, required: true, unique: true },
  medicine_name: { type: String },
  // All different records for this medicine go here
  batches: [{
    stock_id: { type: String }, 
    batch_number: { type: String, uppercase: true, trim: true },
    expiry_date: { type: String },
    po_number: { type: String }, // Storing PO Number as requested
    grn_number: { type: String },
    supplier_id: { type: String },
    purchase_price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    per_medicine_price: { type: Number, default: 0 },
    conversion_factor: { type: Number, default: 0 },
    quantity_available: { type: Number, default: 0 },
    total_grn_received_quantity: { type: Number, default: 0 },
    grn_received_qty: { type: Number, default: 0 },
    sale_qty: { type: Number, default: 0 },
    total_received: { type: Number, default: 0 },
    added_at: { type: Date, default: Date.now }
  }],
  total_stock_available: { type: Number, default: 0 },
  total_grn_received_quantity: { type: Number, default: 0 },
  sale_qty: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Stock", StockSchema);
