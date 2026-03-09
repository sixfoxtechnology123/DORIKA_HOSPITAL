// controllers/locationController.js
const Location = require("../models/Location");
const { createAuditLog, cleanObject } = require("../utils/auditLogger");

// Format: LOC01, LOC02, ...
const generateLocationID = (num) => `LOC${String(num).padStart(2, "0")}`;

// Generate next Location ID
exports.getNextLocationID = async (_req, res) => {
  try {
    const lastLocation = await Location.findOne().sort({ locationID: -1 });

    let nextNumber = 1;
    if (lastLocation && lastLocation.locationID) {
      const lastNum = parseInt(lastLocation.locationID.replace("LOC", ""), 10);
      nextNumber = lastNum + 1;
    }

    const code = generateLocationID(nextNumber);
    res.json({ locationID: code });
  } catch (err) {
    console.error("ID generation error:", err);
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create Location
exports.createLocation = async (req, res) => {
  try {
    const { locationName, address, country, state, city, status } = req.body;

    if (!locationName || !address || !country || !state || !city) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const lastLocation = await Location.findOne().sort({ locationID: -1 });

    let nextNumber = 1;
    if (lastLocation && lastLocation.locationID) {
      const lastNum = parseInt(lastLocation.locationID.replace("LOC", ""), 10);
      nextNumber = lastNum + 1;
    }

    const newLocationID = generateLocationID(nextNumber);

    const loc = new Location({
      locationID: newLocationID,
      locationName,
      address,
      country,
      state,
      city,
      status,
    });

    const saved = await loc.save();

    // Log activity
    await createAuditLog({
      req,
      action: "CREATE",
      module: "Location Management",
      details: `Location Added: ${saved.locationName} (${saved.locationID})`,
      target: { name: saved.locationName },
      current: cleanObject(saved.toObject ? saved.toObject() : saved),
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get All Locations
exports.getAllLocations = async (_req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: 1 });
    return res.json(locations);
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch locations" });
  }
};

// Update Location
exports.updateLocation = async (req, res) => {
  try {
    const previous = await Location.findById(req.params.id).lean();
    const updated = await Location.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Location not found" });

    // Log activity
    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Location Management",
      details: `Location Updated: ${updated.locationName} (${updated.locationID})`,
      target: { name: updated.locationName },
      previous,
      current: cleanObject(updated.toObject ? updated.toObject() : updated),
    });

    return res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete Location
exports.deleteLocation = async (req, res) => {
  try {
    const deleted = await Location.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Location not found" });

    // Log activity
    await createAuditLog({
      req,
      action: "DELETE",
      module: "Location Management",
      details: `Location Deleted: ${deleted.locationName} (${deleted.locationID})`,
      target: { name: deleted.locationName },
      previous: cleanObject(deleted.toObject ? deleted.toObject() : deleted),
      current: null,
    });

    return res.json({ message: "Location deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: err.message });
  }
};
