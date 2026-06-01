const TypeMaster = require('../models/TypeMaster');

// FETCH ALL RECORDS
exports.getTypes = async (req, res) => {
    try {
        const types = await TypeMaster.find().sort({ createdAt: -1 });
        res.json({ success: true, data: types });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GENERATE NEXT SEQUENTIAL ID (TYPE-1, TYPE-2...)
exports.getNextId = async (req, res) => {
    try {
        const allRecords = await TypeMaster.find({}, { typeId: 1 });
        let maxNum = 0;

        // Extract the number from strings like "TYPE-12" to find the true maximum
        allRecords.forEach(doc => {
            const num = parseInt(doc.typeId.replace('TYPE-', ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });

        res.json({ success: true, nextId: `TYPE-${maxNum + 1}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error generating ID" });
    }
};

// CREATE OR UPDATE RECORD
exports.saveType = async (req, res) => {
    try {
        const { id } = req.params;
        const { typeId, typeName, status } = req.body;

        if (id) {
            // Update existing
            const updated = await TypeMaster.findByIdAndUpdate(
                id, 
                { typeName, status }, 
                { returnDocument: 'after' }
            );
            return res.json({ success: true, data: updated });
        }

        // Create new
        const newType = new TypeMaster({ typeId, typeName, status });
        await newType.save();
        res.json({ success: true, data: newType });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE RECORD
exports.deleteType = async (req, res) => {
    try {
        await TypeMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Record Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Delete operation failed" });
    }
};
