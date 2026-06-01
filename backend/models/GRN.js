const mongoose = require("mongoose");

const grnItemSchema = new mongoose.Schema({
  po_item_id: String,
  medicine_id: String,
  batch_number: String,
  mfg_date: Date,
  expiry_date: String,
  ordered_quantity: Number,
  received_quantity: Number,
  purchase_price: Number,
  conversion_factor:  Number,
  extra_quantity:  Number,
  mrp: Number,
  per_medicine_price:  Number,
  po_number: String,
  grn_number: String ,
  item_source: { type: String, default: 'MAIN_PO' }, 
  is_extra_fill: { type: Boolean, default: false }
});


const poStatusUpdateSchema = new mongoose.Schema({
  po_number: String,
  po_final_status: String,
  grn_id: String
});
// Global side storage for pending balances
const pendingMedicineSchema = new mongoose.Schema({
  po_item_id: String,
  medicine_id: String,
  pending_balance: Number,
  po_number: String
});

const grnSchema = new mongoose.Schema({
  grn_id: String,
  grn_number: String, // Global GRN Name
  supplier_id: String,
  po_id: String, 
  po_number: String,
  invoice_number: String,
  invoice_date: Date,
  received_by: String,
  received_date: Date,
  remarks: String,
  po_status: { type: String, default: '' },
  items: [grnItemSchema],
  pending_medicines: [pendingMedicineSchema], // Global pending storage
  po_status_updates: [poStatusUpdateSchema]
}, { timestamps: true });

module.exports = mongoose.model("GRN", grnSchema);
