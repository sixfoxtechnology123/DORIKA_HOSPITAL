const ConsultationBill = require('../models/ConsultationBillModel');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

const toYmd = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const syncPatientHistoryFromBill = async (billDoc) => {
    if (!billDoc) return;

    const appointment = billDoc.appointmentRef
        ? await Appointment.findOne({ appointmentId: billDoc.appointmentRef }).lean()
        : null;

    const patient = await Patient.findOne({
        $or: [
            billDoc.appointmentRef ? { appointmentId: billDoc.appointmentRef } : null,
            billDoc.patientPhone ? { mobileNumber: billDoc.patientPhone } : null,
            billDoc.patientName ? { fullName: billDoc.patientName } : null
        ].filter(Boolean)
    });

    if (!patient) return;

    const appointmentId = billDoc.appointmentRef || patient.appointmentId || '';
    const visitDate = appointment?.appointmentDate || toYmd(billDoc.createdAt || Date.now());
    const matchedDoctor = !appointment?.doctorId && billDoc.doctorName
        ? await Doctor.findOne({ doctorName: billDoc.doctorName }).select('doctorId department').lean()
        : null;
    const doctorId = appointment?.doctorId || matchedDoctor?.doctorId || '';
    const doctorName = appointment?.doctorName || billDoc.doctorName || '';
    const department = appointment?.department || matchedDoctor?.department || patient.department || '';

    if (visitDate) {
        const visitIndex = patient.visitHistory.findIndex(
            (entry) => entry.invoiceNo === billDoc.billId || (entry.appointmentId === appointmentId && entry.visitDate === visitDate)
        );

        const visitEntry = {
            patientId: patient.patientId,
            patientName: patient.fullName,
            appointmentId,
            invoiceNo: billDoc.billId,
            visitDate,
            doctorId,
            doctorName,
            department,
            status: 'Completed',
            prescriptionUrl: ''
        };

        if (visitIndex >= 0) {
            patient.visitHistory[visitIndex] = {
                ...patient.visitHistory[visitIndex].toObject(),
                ...visitEntry
            };
        } else {
            patient.visitHistory.unshift(visitEntry);
        }
    }

    const billingIndex = patient.billingHistory.findIndex((entry) => entry.invoiceNo === billDoc.billId);
    const billingEntry = {
        patientId: patient.patientId,
        patientName: patient.fullName,
        appointmentId,
        invoiceNo: billDoc.billId,
        billDate: toYmd(billDoc.createdAt || Date.now()),
        doctorId,
        doctorName,
        department,
        amount: Number(billDoc.finalAmount) || 0,
        paymentStatus: 'Paid',
        paymentMode: billDoc.paymentMode || ''
    };

    if (billingIndex >= 0) {
        patient.billingHistory[billingIndex] = {
            ...patient.billingHistory[billingIndex].toObject(),
            ...billingEntry
        };
    } else {
        patient.billingHistory.unshift(billingEntry);
    }

    await patient.save();
};

const getNextBillId = async () => {
    const count = await ConsultationBill.countDocuments();
    return `CB-${count + 1}`;
};

exports.getNextBillId = async (req, res) => {
    try {
        const nextId = await getNextBillId();
        res.json({ success: true, nextId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateBill = async (req, res) => {
    try {
        const { patientName, patientPhone, appointmentRef, doctorName, consultationFee, discount, paymentMode, gstRate } = req.body;

        // 1. Generate Custom ID (CB + Count)
        const nextId = await getNextBillId();

        // 2. Perform Calculations (Server-side for security)
        const feeValue = Number(consultationFee || 0);
        const discountValue = Number(discount || 0);
        const net = feeValue - discountValue;
        const rateValue = Number(gstRate || 0);
        const gst = rateValue > 0 ? (net * rateValue) / 100 : 0;
        const final = net + gst;

        const newBill = await ConsultationBill.create({
            billId: nextId,
            patientName,
            patientPhone: patientPhone || '',
            appointmentRef,
            doctorName,
            consultationFee: feeValue,
            discount: discountValue,
            netAmount: net,
            gstRate: rateValue,
            gstAmount: gst,
            finalAmount: final,
            paymentMode
        });

        await syncPatientHistoryFromBill(newBill);

        res.status(201).json({ success: true, data: newBill });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllBills = async (req, res) => {
    try {
        const bills = await ConsultationBill.find().sort({ createdAt: -1 });
        res.json({ success: true, data: bills });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBill = async (req, res) => {
    try {
        const { patientName, patientPhone, appointmentRef, doctorName, consultationFee, discount, paymentMode, gstRate } = req.body;
        const feeValue = Number(consultationFee || 0);
        const discountValue = Number(discount || 0);
        const net = feeValue - discountValue;
        const rateValue = Number(gstRate || 0);
        const gst = rateValue > 0 ? (net * rateValue) / 100 : 0;
        const final = net + gst;

        const updated = await ConsultationBill.findByIdAndUpdate(
            req.params.id,
            {
                patientName,
                patientPhone: patientPhone || '',
                appointmentRef,
                doctorName,
                consultationFee: feeValue,
                discount: discountValue,
                netAmount: net,
                gstRate: rateValue,
                gstAmount: gst,
                finalAmount: final,
                paymentMode
            },
            { returnDocument: 'after' }
        );

        if (!updated) return res.status(404).json({ success: false, message: 'Bill not found' });
        await syncPatientHistoryFromBill(updated);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteBill = async (req, res) => {
    try {
        const deleted = await ConsultationBill.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Bill not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
