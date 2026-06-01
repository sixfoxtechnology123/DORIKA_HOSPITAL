const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const getAgeFromDob = (dob) => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age < 0 ? 0 : age;
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizeOptionalValue = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  return value;
};

const PATIENT_FIELD_CONFIG = {
  fullName: { required: true },
  gender: {},
  dob: {},
  mobileNumber: { required: true },
  alternateMobile: {},
  address: {},
  villageTown: {},
  postOffice: {},
  policeStation: {},
  district: {},
  stateName: {},
  pinCode: {},
  bloodGroup: {},
  allergies: {},
  knownMedicalConditions: {},
  emergencyContactName: {},
  emergencyContactNumber: {},
  department: { required: true },
  appointmentId: {},
  notes: {}
};

const buildCompactPatientData = (payload = {}, { existingDoc = null, isUpdate = false } = {}) => {
  const data = {};
  const unset = {};

  Object.entries(PATIENT_FIELD_CONFIG).forEach(([field, config]) => {
    if (!hasOwn(payload, field)) {
      if (!isUpdate && existingDoc && existingDoc[field] !== undefined) {
        data[field] = existingDoc[field];
      }
      return;
    }

    const normalized = normalizeOptionalValue(payload[field]);

    if (config.required && normalized === undefined) {
      throw new Error(`${field.toUpperCase()} IS REQUIRED`);
    }

    if (normalized === undefined) {
      if (isUpdate) {
        unset[field] = 1;
      }
      return;
    }

    data[field] = normalized;
  });

  if (hasOwn(payload, 'dob')) {
    const normalizedDob = normalizeOptionalValue(payload.dob);
    if (normalizedDob === undefined) {
      if (isUpdate) unset.age = 1;
    } else {
      const age = getAgeFromDob(normalizedDob);
      if (age > 0) {
        data.age = age;
      } else if (isUpdate) {
        unset.age = 1;
      }
    }
  } else if (!isUpdate && existingDoc?.dob) {
    const age = getAgeFromDob(existingDoc.dob);
    if (age > 0) data.age = age;
  }

  return { data, unset };
};

const getNextPatientId = async () => {
  const last = await Patient.findOne().sort({ createdAt: -1 }).select('patientId');
  if (!last?.patientId) return 'P-1';
  const numericPart = Number(String(last.patientId).replace('P-', ''));
  if (!Number.isInteger(numericPart) || numericPart < 1) return 'P-1';
  return `P-${numericPart + 1}`;
};

exports.getLatestPatientId = async (req, res) => {
  try {
    const nextId = await getNextPatientId();
    return res.json({ success: true, nextId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.registerPatient = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.patientId = await getNextPatientId();
    const { data } = buildCompactPatientData(payload);
    const doc = new Patient({ patientId: payload.patientId, ...data });

    await doc.save();
    return res.status(201).json({ success: true, message: 'PATIENT REGISTERED', data: doc });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.patientId) {
      return res.status(409).json({ success: false, message: 'PATIENT ID CONFLICT, RETRY' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const data = await Patient.find().sort({ createdAt: -1 });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const data = await Patient.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const payload = { ...req.body };
    const patientId = req.params.id;
    const existingPatient = await Patient.findById(patientId);
    if (!existingPatient) {
      return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    }

    delete payload.patientId;
    delete payload.age;

    const { data, unset } = buildCompactPatientData(payload, { existingDoc: existingPatient, isUpdate: true });
    const updateDoc = {};
    if (Object.keys(data).length) updateDoc.$set = data;
    if (Object.keys(unset).length) updateDoc.$unset = unset;

    if (!Object.keys(updateDoc).length) {
      return res.json({ success: true, message: 'NO CHANGES APPLIED', data: existingPatient });
    }

    const updated = await Patient.findByIdAndUpdate(patientId, updateDoc, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    }

    return res.json({ success: true, message: 'PATIENT UPDATED', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const deleted = await Patient.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    }
    return res.json({ success: true, message: 'PATIENT DELETED' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const loadDoctorMeta = async (doctorId) => {
  if (!doctorId) return null;
  return Doctor.findOne({ doctorId }).select('doctorName department consultationFee').lean();
};

exports.getVisitHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('visitHistory');
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    return res.json({ success: true, data: patient.visitHistory || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addVisitHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });

    const payload = { ...req.body };
    if (!payload.visitDate || !payload.doctorId) {
      return res.status(400).json({ success: false, message: 'VISIT DATE AND DOCTOR REQUIRED' });
    }

    if (!payload.doctorName || !payload.department) {
      const doctor = await loadDoctorMeta(payload.doctorId);
      if (doctor) {
        payload.doctorName = payload.doctorName || doctor.doctorName;
        payload.department = payload.department || doctor.department;
      }
    }

    if (!payload.doctorName || !payload.department) {
      return res.status(400).json({ success: false, message: 'DOCTOR DETAILS MISSING' });
    }

    const entry = {
      patientId: patient.patientId,
      patientName: patient.fullName,
      appointmentId: payload.appointmentId || '',
      invoiceNo: payload.invoiceNo || '',
      visitDate: payload.visitDate,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      department: payload.department,
      status: payload.status || 'Scheduled',
      prescriptionUrl: payload.prescriptionUrl || ''
    };

    patient.visitHistory.unshift(entry);
    await patient.save();
    return res.status(201).json({ success: true, message: 'VISIT HISTORY SAVED', data: entry });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getBillingHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('billingHistory');
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    return res.json({ success: true, data: patient.billingHistory || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addBillingHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });

    const payload = { ...req.body };
    if (!payload.invoiceNo || !payload.billDate) {
      return res.status(400).json({ success: false, message: 'INVOICE NO AND DATE REQUIRED' });
    }

    if (payload.doctorId && (!payload.doctorName || !payload.department || !payload.amount)) {
      const doctor = await loadDoctorMeta(payload.doctorId);
      if (doctor) {
        payload.doctorName = payload.doctorName || doctor.doctorName;
        payload.department = payload.department || doctor.department;
        if (!payload.amount || Number(payload.amount) <= 0) {
          payload.amount = Number(doctor.consultationFee) || 0;
        }
      }
    }

    const entry = {
      patientId: patient.patientId,
      patientName: patient.fullName,
      appointmentId: payload.appointmentId || '',
      invoiceNo: payload.invoiceNo,
      billDate: payload.billDate,
      doctorId: payload.doctorId || '',
      doctorName: payload.doctorName || '',
      department: payload.department || '',
      amount: Number(payload.amount) || 0,
      paymentStatus: payload.paymentStatus || 'Unpaid',
      paymentMode: payload.paymentMode || ''
    };

    patient.billingHistory.unshift(entry);
    await patient.save();
    return res.status(201).json({ success: true, message: 'BILLING HISTORY SAVED', data: entry });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getPharmacyHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('pharmacyHistory');
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });
    return res.json({ success: true, data: patient.pharmacyHistory || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addPharmacyHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'PATIENT NOT FOUND' });

    const payload = { ...req.body };
    if (!payload.billNo || !payload.medicinesPurchased) {
      return res.status(400).json({ success: false, message: 'BILL NO AND MEDICINES REQUIRED' });
    }

    const entry = {
      patientId: patient.patientId,
      patientName: patient.fullName,
      billNo: payload.billNo,
      medicinesPurchased: payload.medicinesPurchased,
      amount: Number(payload.amount) || 0
    };

    patient.pharmacyHistory.unshift(entry);
    await patient.save();
    return res.status(201).json({ success: true, message: 'PHARMACY HISTORY SAVED', data: entry });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
