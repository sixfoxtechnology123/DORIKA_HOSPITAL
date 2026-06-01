const mongoose = require('mongoose');

const POItemSchema = new mongoose.Schema({
  medicine_id: { type: String, required: true },
  po_number: { type: String, default: '' },
  medicine_name: { type: String, default: '' },
  company_name: { type: String, default: '' },
  ordered_quantity: { type: Number, required: true },
  received_quantity: { type: Number, default: 0 },
  purchase_price: { type: Number, required: true },
  mrp: { type: Number, default: 0 },
  total_amount: { type: Number, required: true }
});

const POSchema = new mongoose.Schema({
  po_number: { type: String, unique: true }, // Format: PONo-1, PONo-2...
  po_id: { type: String, unique: true }, // Format: PO-1, PO-2...
  supplier_id: { type: String, required: true },
  po_date: { type: Date, default: Date.now },
  expected_delivery_date: { type: Date },
  created_by: { type: String },
  remarks: { type: String },
  status: { type: String, enum: ['Draft', 'Approved', 'Closed',"Rejected"], default: 'Draft' },
  // Inside purchaseOrderSchema
  po_final_status: { 
  type: String, 
  default: '---' 
},
  po_status: { type: String, default: '' },
  items: [POItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', POSchema);
