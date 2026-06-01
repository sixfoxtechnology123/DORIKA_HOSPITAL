const CompanyName = require('../models/CompanyName');

exports.getAll = async (req, res) => {
    try {
        const data = await CompanyName.find().sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getNextId = async (req, res) => {
    try {
        const all = await CompanyName.find({}, { companyId: 1 });
        let max = 0;
        all.forEach(doc => {
            const num = parseInt(doc.companyId.replace('COMP-', ''));
            if (!isNaN(num) && num > max) max = num;
        });
        res.json({ success: true, nextId: `COMP-${max + 1}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.saveCompany = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        const payload = {
            ...data,
            companyName: String(data.companyName || '').trim().toUpperCase(),
            contactName: String(data.contactName || '').trim().toUpperCase(),
            contactNumber: String(data.contactNumber || '').trim()
        };
        if (!payload.companyName) {
            return res.status(400).json({ success: false, message: 'Company name is required' });
        }
        const duplicate = await CompanyName.findOne({
            companyName: payload.companyName,
            ...(id ? { _id: { $ne: id } } : {})
        });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Company name already exists' });
        }
        if (id) {
            const updated = await CompanyName.findByIdAndUpdate(id, payload, { returnDocument: 'after' });
            return res.json({ success: true, data: updated });
        } else {
            const created = await new CompanyName(payload).save();
            return res.json({ success: true, data: created });
        }
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteCompany = async (req, res) => {
    try {
        await CompanyName.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
