const Qualification = require('../models/Qualification');

// Generate ED001, ED002 logic
exports.getNextCode = async (req, res) => {
    try {
        const lastRecord = await Qualification.findOne().sort({ qualCode: -1 });
        if (!lastRecord) {
            return res.status(200).json({ qualCode: 'ED001' });
        }
        const lastNumber = parseInt(lastRecord.qualCode.replace('ED', ''));
        const nextCode = `ED${(lastNumber + 1).toString().padStart(3, '0')}`;
        res.status(200).json({ qualCode: nextCode });
    } catch (err) {
        res.status(500).json({ message: "Error generating code" });
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await Qualification.find().sort({ createdAt: 1 });
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { qualCode, qualName, status } = req.body;
        const newEntry = new Qualification({ qualCode, qualName, status });
        await newEntry.save();
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { qualName, status } = req.body;
        const updated = await Qualification.findByIdAndUpdate(
            req.params.id, 
            { qualName, status },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await Qualification.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};