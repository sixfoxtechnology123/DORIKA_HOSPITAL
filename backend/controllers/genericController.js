const GenericMaster = require('../models/GenericMaster');

exports.getGenerics = async (req, res) => {
    try {
        const data = await GenericMaster.find().sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getNextId = async (req, res) => {
    try {
        const allRecords = await GenericMaster.find({}, { genericId: 1 });
        let maxNum = 0;
        allRecords.forEach(doc => {
            const num = parseInt(doc.genericId.replace('GEN-', ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        res.json({ success: true, nextId: `GEN-${maxNum + 1}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error generating ID" });
    }
};

exports.saveGeneric = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = {
            ...req.body,
            type: String(req.body.type || '').trim().toUpperCase(),
            category: String(req.body.category || '').trim().toUpperCase(),
            genericName: String(req.body.genericName || '').trim().toUpperCase(),
            status: String(req.body.status || 'Active').trim()
        };
        if (!payload.genericName) {
            return res.status(400).json({ success: false, message: 'Generic name is required' });
        }
        const duplicate = await GenericMaster.findOne({
            genericName: payload.genericName,
            ...(id ? { _id: { $ne: id } } : {})
        });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Generic name already exists' });
        }
        if (id) {
            const updated = await GenericMaster.findByIdAndUpdate(id, payload, { returnDocument: 'after' });
            return res.json({ success: true, data: updated });
        }
        const newRecord = new GenericMaster(payload);
        await newRecord.save();
        res.json({ success: true, data: newRecord });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteGeneric = async (req, res) => {
    try {
        await GenericMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
