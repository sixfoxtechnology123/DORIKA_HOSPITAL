const Specialization = require('../models/Specialization');

// 1. GET THE NEXT SEQUENTIAL ID (Strictly Increasing)
exports.getLatestId = async (req, res) => {
    try {
        // Sort by specId descending to find the highest number ever used in the DB
        const lastSpec = await Specialization.findOne().sort({ specId: -1 });
        
        let nextId = "SP0001"; 

        if (lastSpec && lastSpec.specId) {
            const lastNum = parseInt(lastSpec.specId.replace("SP", ""), 10);
            const nextNum = lastNum + 1;
            nextId = `SP${String(nextNum).padStart(4, '0')}`;
        }

        res.json({ success: true, nextId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. CREATE OR UPDATE (UPSERT)
exports.upsertSpecialization = async (req, res) => {
    try {
        const { id, specId, specName } = req.body; // 'id' is the MongoDB _id

        if (id) {
            // UPDATE MODE
            const updated = await Specialization.findByIdAndUpdate(
                id, 
                { specName: specName.toUpperCase() }, 
                { returnDocument: 'after' }
            );
            return res.status(200).json({ success: true, message: "UPDATED", data: updated });
        } else {
            // CREATE MODE
            const existing = await Specialization.findOne({ specName: specName.toUpperCase() });
            if (existing) return res.status(400).json({ success: false, message: "ALREADY EXISTS" });

            const newSpec = new Specialization({ specId, specName: specName.toUpperCase() });
            await newSpec.save();
            res.status(201).json({ success: true, message: "SAVED", data: newSpec });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. GET ALL
exports.getAllSpecializations = async (req, res) => {
    try {
        const data = await Specialization.find().sort({ specId: 1 });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. DELETE
exports.deleteSpecialization = async (req, res) => {
    try {
        await Specialization.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "DELETED" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
