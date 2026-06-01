const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    medicine_id: { type: String, required: true, unique: true },
    // medicine_code: { type: String, required: true, unique: true },
    typeId: { type: String, default: '' },
    type: { type: String, required: true },
    categoryId: { type: String, default: '' },
    category: { type: String, required: true },
    genericId: { type: String, default: '' },
    generic_name: { type: String, required: true },
    medicine_name: { type: String, required: true },
   suppliers: [{
        supplierId: String,
        supplier_name: String,
        priority: Number
    }],
    unit_id: { type: String, required: true }, 
    base_unit_name: { type: String, required: true }, 
    purchase_unit_name: { type: String, required: true },
    conversion_factor: {
    type: [Number], 
    default: []
            },
    companyId: { type: String, default: '' },
    company_name: { type: String, required: true },
    hsn: { type: String },
    gst_per: { type: Number, default: 0 },
    reorder_level: { type: Number, default: 0 },
    reorder_qty: { type: Number, default: 0 },
    restricted_flag: { type: String, enum: ['Yes', 'No'], default: 'No' },
    narcotics_flag: { type: String, enum: ['Yes', 'No'], default: 'No' },
    mode: { type: String, enum: ['Expiry', 'Non-Expiry'], default: 'Expiry' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('MedicineMaster', medicineSchema);
