const Doctor = require('../models/Doctor');

const normalizeDoctorPayload = (payload = {}) => {
  const normalized = {
    ...payload,
    doctorName: String(payload.doctorName || '').trim().toUpperCase(),
    qualification: String(payload.qualification || '').trim().toUpperCase(),
    registrationNumber: String(payload.registrationNumber || '').trim().toUpperCase(),
    mobile: String(payload.mobile || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    department: String(payload.department || '').trim().toUpperCase(),
    vill: String(payload.vill || '').trim().toUpperCase(),
    po: String(payload.po || '').trim().toUpperCase(),
    ps: String(payload.ps || '').trim().toUpperCase(),
    dist: String(payload.dist || '').trim().toUpperCase(),
    stateName: String(payload.stateName || '').trim().toUpperCase(),
    pin: String(payload.pin || '').trim()
  };

  if (Array.isArray(payload.feeHistory)) {
    normalized.feeHistory = payload.feeHistory.map((row) => ({
      ...row,
      consultationFee: Number(row.consultationFee || 0),
      doctorShare: Number(row.doctorShare || 0),
      centerShare: Number(row.centerShare || 0),
      fromDate: String(row.fromDate || '').trim(),
      toDate: String(row.toDate || '').trim()
    }));
  }

  const currentFeeRow = normalized.feeHistory?.find((row) => Number(row.consultationFee || 0) > 0);
  if (currentFeeRow) {
    normalized.consultationFee = Number(currentFeeRow.consultationFee || 0);
  }

  return normalized;
};

const validateRegistrationNumber = async (registrationNumber, currentId = null) => {
  if (!registrationNumber) return null;
  const duplicate = await Doctor.findOne({
    registrationNumber,
    ...(currentId ? { _id: { $ne: currentId } } : {})
  });
  return duplicate;
};

// 1. GENERATE NEXT ID
exports.getLatestDoctorId = async (req, res) => {
  try {
    const lastDoc = await Doctor.findOne().sort({ doctorId: -1 });
    let nextId = "DOC-0001";

    if (lastDoc && lastDoc.doctorId) {
      const lastNum = parseInt(lastDoc.doctorId.replace("DOC-", ""), 10);
      nextId = `DOC-${String(lastNum + 1).padStart(4, '0')}`;
    }
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. REGISTER NEW DOCTOR
exports.registerDoctor = async (req, res) => {
  try {
    const doctorData = normalizeDoctorPayload(req.body);

    const duplicateRegistration = await validateRegistrationNumber(doctorData.registrationNumber);
    if (duplicateRegistration) {
      return res.status(400).json({ success: false, message: "Doctor registration number already exists" });
    }

    const newDoctor = new Doctor(doctorData);
    await newDoctor.save();
    res.status(201).json({ success: true, message: "Doctor Registered Successfully", data: newDoctor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 3. UPDATE DOCTOR
exports.updateDoctor = async (req, res) => {
  try {
    const doctorData = normalizeDoctorPayload(req.body);

    const duplicateRegistration = await validateRegistrationNumber(doctorData.registrationNumber, req.params.id);
    if (duplicateRegistration) {
      return res.status(400).json({ success: false, message: "Doctor registration number already exists" });
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      doctorData,
      { returnDocument: 'after', runValidators: true }
    );
    
    res.json({ success: true, message: "Doctor Updated Successfully", data: updatedDoctor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 4. GET ALL DOCTORS
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. DELETE DOCTOR
exports.deleteDoctor = async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Doctor Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
