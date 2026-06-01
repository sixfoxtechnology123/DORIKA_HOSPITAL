const MedicineMaster = require('../models/Medicine');
const TypeMaster = require('../models/TypeMaster');
const MedicineCategory = require('../models/MedicineCategory');
const GenericMaster = require('../models/GenericMaster');
const CompanyName = require('../models/CompanyName');
const Supplier = require('../models/Supplier');

const parseOptionalNumber = (value, fallback) => {
    if (value === '' || value === null || typeof value === 'undefined') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePayload = async (payload) => {
    const medicineId = String(payload.medicine_id || '').trim();
    const typeName = String(payload.type || '').trim();
    const categoryName = String(payload.category || '').trim();
    const genericName = String(payload.generic_name || '').trim();
    const companyName = String(payload.company_name || '').trim();

    // Fetch records for IDs if they aren't explicitly provided in the payload
    const [typeRecord, categoryRecord, genericRecord, companyRecord] = await Promise.all([
        payload.typeId ? Promise.resolve(null) : TypeMaster.findOne({ typeName }),
        payload.categoryId ? Promise.resolve(null) : MedicineCategory.findOne({ category_name: categoryName }),
        payload.genericId ? Promise.resolve(null) : GenericMaster.findOne({ genericName }),
        payload.companyId ? Promise.resolve(null) : CompanyName.findOne({ companyName })
    ]);

    // Logic for Multiple Suppliers with Priority Mapping
    // We expect 'selectedSuppliers' to be an array of objects: [{ supplierId, supplier_name }]
    let suppliersData = [];
    if (Array.isArray(payload.selectedSuppliers) && payload.selectedSuppliers.length > 0) {
        suppliersData = payload.selectedSuppliers.map((sup, index) => ({
            supplierId: String(sup.supplierId || '').trim(),
            supplier_name: String(sup.supplier_name || '').trim(),
            priority: index + 1 // First selected gets 1, second gets 2, etc.
        }));
    }

    let conversionFactorData = [];
    if (Array.isArray(payload.conversion_factor)) {
        conversionFactorData = payload.conversion_factor
            .filter(f => f !== "" && f !== null)
            .map(Number);
    } else if (payload.conversion_factor) {
        conversionFactorData = [Number(payload.conversion_factor)];
    }
    return {
        ...payload,
        medicine_id: medicineId,
        medicine_code: String(payload.medicine_code || medicineId).trim(),
        
        // Type, Category, Generic
        typeId: String(payload.typeId || typeRecord?.typeId || '').trim(),
        type: typeName,
        categoryId: String(payload.categoryId || categoryRecord?.category_id || '').trim(),
        category: categoryName,
        genericId: String(payload.genericId || genericRecord?.genericId || '').trim(),
        generic_name: genericName,
        
        medicine_name: String(payload.medicine_name || '').trim(),
        
        // Multi-Supplier Mapping
        suppliers: suppliersData,
        
        // Legacy Support: Store the primary (first) supplier in the existing single fields
        supplierId: suppliersData.length > 0 ? suppliersData[0].supplierId : '',
        supplier_name: suppliersData.length > 0 ? suppliersData[0].supplier_name : '',
        
        unit_id: String(payload.unit_id || '').trim(),
        base_unit_name: String(payload.base_unit_name || '').trim(),
        purchase_unit_name: String(payload.purchase_unit_name || '').trim(),
        companyId: String(payload.companyId || companyRecord?.companyId || '').trim(),
        company_name: companyName,
        hsn: String(payload.hsn || '').trim(),
        
       conversion_factor: conversionFactorData,
        gst_per: parseOptionalNumber(payload.gst_per, 0),
        reorder_level: parseOptionalNumber(payload.reorder_level, 0),
        reorder_qty: parseOptionalNumber(payload.reorder_qty, 0),
        restricted_flag: payload.restricted_flag === 'Yes' ? 'Yes' : 'No',
        narcotics_flag: payload.narcotics_flag === 'Yes' ? 'Yes' : 'No'
    };
};

exports.getAll = async (req, res) => {
    try {
        const data = await MedicineMaster.find().sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getLatestId = async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, message: "Category is required" });
        }

        // Sanitize category name for prefix (e.g., "EYE & EAR DROPS" -> "EYE_EAR_DROPS")
        const prefix = category.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        
        // Count existing records in this category
        const count = await MedicineMaster.countDocuments({ category: category });
        
        // Generate ID: PREFIX-NUMBER (starting from 1)
        const nextId = `${prefix}-${count + 1}`;
        
        res.json({ success: true, nextId });
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message }); 
    }
};

exports.upsert = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        const payload = await normalizePayload(data);
        if (id) {
            const updated = await MedicineMaster.findByIdAndUpdate(id, payload, { runValidators: true, returnDocument: 'after' });
            return res.json({ success: true, data: updated });
        } else {
            const created = await new MedicineMaster(payload).save();
            return res.json({ success: true, data: created });
        }
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.delete = async (req, res) => {
    try {
        await MedicineMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
