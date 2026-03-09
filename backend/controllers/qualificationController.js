const Qualification = require('../models/Qualification');
const { createAuditLog, cleanObject } = require("../utils/auditLogger");

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
        await createAuditLog({
            req,
            action: "CREATE",
            module: "Qualification",
            details: `Qualification Added: ${qualName} (${qualCode})`,
            target: { name: qualName },
            current: cleanObject(newEntry.toObject ? newEntry.toObject() : newEntry),
        });
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { qualName, status } = req.body;
        const previous = await Qualification.findById(req.params.id).lean();
        const updated = await Qualification.findByIdAndUpdate(
            req.params.id, 
            { qualName, status },
            { new: true }
        );
        await createAuditLog({
            req,
            action: "UPDATE",
            module: "Qualification",
            details: `Qualification Updated: ${updated.qualName} (${updated.qualCode})`,
            target: { name: updated.qualName },
            previous,
            current: cleanObject(updated.toObject ? updated.toObject() : updated),
        });
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await Qualification.findByIdAndDelete(req.params.id);
        await createAuditLog({
            req,
            action: "DELETE",
            module: "Qualification",
            details: `Qualification Deleted: ${deleted.qualName} (${deleted.qualCode})`,
            target: { name: deleted.qualName },
            previous: cleanObject(deleted.toObject ? deleted.toObject() : deleted),
            current: null,
        });
        res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
