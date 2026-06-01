const Appointment = require('../models/Appointment');
const axios = require('axios');
const https = require('https');

const getNextTokenNumber = async () => {
  const last = await Appointment.findOne().sort({ tokenNumber: -1 }).select('tokenNumber');
  return last?.tokenNumber ? Number(last.tokenNumber) + 1 : 1;
};

const getNextAppointmentId = async () => {
  // Finds the most recently created appointment
  const lastAppointment = await Appointment.findOne()
    .sort({ createdAt: -1 }) 
    .select('appointmentId');

  // If the database is empty, start at AB-1
  if (!lastAppointment || !lastAppointment.appointmentId) {
    return 'AB-1';
  }

  // Gets the number after the "-", adds 1 to it
  const lastNumber = parseInt(lastAppointment.appointmentId.split('-')[1]);
  return `AB-${isNaN(lastNumber) ? 1 : lastNumber + 1}`;
};

const encodeSmsValue = (value) => encodeURIComponent(String(value ?? '')).replace(/%20/g, '+');

const normalizeIndianMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits.slice(-10);
};

const sendOfflineSMS = async (doc) => {
  try {
    const formattedName = String(doc.patientName || '').trim().toUpperCase();
    const cleanMobile = normalizeIndianMobile(doc.patientMobile);

    if (cleanMobile.length !== 10) {
      console.error('Invalid mobile number');
      return;
    }

    const smsText =
      `Dear ${formattedName} welcome to Asha The Hope Diagnostic And Imaging LLP. Your Lab booking no. is ${doc.tokenNumber}. For any query please call 03325294005/06`;

const url =
  `https://103.229.250.200/smpp/sendsms` +
  `?username=${process.env.SMS_USER}` +
  `&password=${process.env.SMS_PASS}` +
  `&to=${cleanMobile}` +
  `&from=${process.env.SMS_SENDERID}` +
  `&text=${encodeURIComponent(smsText)}` +
  `&dlt_templated=${process.env.SMS_TEMPLATE_ID}`;

    //console.log(url);

  const response = await axios({
  method: 'get',
  url: url.replace(/ /g, '%20'),
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 15000
});

  if (String(response.data).toLowerCase().includes('sent')) {
  console.log('✅ Offline SMS sent successfully');
} else {
  console.log('❌ Offline SMS failed:', response.data);
}

    return response.data;

  } catch (err) {
    console.error('SMS ERROR:', err.response?.data || err.message);
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const data = await Appointment.find().sort({ createdAt: -1 });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextAppointmentId = async (req, res) => {
  try {
    // This calls the helper function we fixed above
    const nextId = await getNextAppointmentId();
    return res.json({ success: true, nextId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextToken = async (req, res) => {
  try {
    const nextToken = await getNextTokenNumber();
    return res.json({ success: true, nextToken });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const payload = { ...req.body };

    payload.appointmentId = payload.appointmentId || await getNextAppointmentId();

    if (payload.tokenAutoGenerate === 'Yes') {
      payload.tokenNumber = await getNextTokenNumber();
    } else {
      payload.tokenNumber = Number(payload.tokenNumber);
      if (!Number.isInteger(payload.tokenNumber) || payload.tokenNumber < 1) {
        return res.status(400).json({ success: false, message: 'INVALID TOKEN NUMBER' });
      }
    }

    if (payload.bookingType === 'Slot' && !payload.selectedSlot) {
      return res.status(400).json({ success: false, message: 'SLOT REQUIRED FOR SLOT BOOKING' });
    }

    const exists = await Appointment.findOne({
      doctorId: payload.doctorId,
      appointmentDate: payload.appointmentDate,
      selectedSlot: payload.bookingType === 'Slot' ? payload.selectedSlot : ''
    });

    if (exists && payload.bookingType === 'Slot') {
      return res.status(409).json({ success: false, message: 'SELECTED SLOT ALREADY BOOKED' });
    }

    const doc = new Appointment({
      ...payload,
      notes: payload.notes || '',
      patientSearch: payload.patientSearch || '',
      patientName: payload.patientName || '',
      patientMobile: payload.patientMobile || '',
      availableSlotsAtBooking: Array.isArray(payload.availableSlotsAtBooking) ? payload.availableSlotsAtBooking : []
    });

    await doc.save();

    const mobile = doc.patientMobile.startsWith('91') ? doc.patientMobile : `91${doc.patientMobile}`;
    const formattedName = String(doc.patientName || '').toUpperCase();
    const dateParts = doc.appointmentDate.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    try {
      await axios.post('https://backend.aisensy.com/campaign/t1/api/v2', {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: 'ashathehope_appointment_confirmation',
        destination: mobile,
        userName: formattedName,
        templateParams: [
          formattedName,
          formattedDate,
          String(doc.selectedSlot || 'Walk-in'),
          String(doc.doctorName || ''),
          String(doc.department || ''),
          String(doc.tokenNumber)
        ]
      });
       console.log('✅ WhatsApp message sent successfully');
    } catch (err) {
      console.error('WhatsApp Notification Error:', err.message);
    }

    await sendOfflineSMS(doc);

    return res.status(201).json({ success: true, message: 'APPOINTMENT SAVED', data: doc });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.tokenNumber) {
      return res.status(409).json({ success: false, message: 'TOKEN ALREADY EXISTS, RETRY' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const payload = { ...req.body };
    const appointmentId = req.params.id;

    const existing = await Appointment.findById(appointmentId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'APPOINTMENT NOT FOUND' });
    }

    payload.appointmentId = existing.appointmentId;

    if (payload.bookingType === 'Slot' && !payload.selectedSlot) {
      return res.status(400).json({ success: false, message: 'SLOT REQUIRED FOR SLOT BOOKING' });
    }

    if (payload.bookingType === 'Walk-in') {
      payload.selectedSlot = '';
    }

    const tokenNumber = Number(payload.tokenNumber);
    if (!Number.isInteger(tokenNumber) || tokenNumber < 1) {
      return res.status(400).json({ success: false, message: 'INVALID TOKEN NUMBER' });
    }
    payload.tokenNumber = tokenNumber;

    if (payload.bookingType === 'Slot') {
      const slotConflict = await Appointment.findOne({
        _id: { $ne: appointmentId },
        doctorId: payload.doctorId,
        appointmentDate: payload.appointmentDate,
        bookingType: 'Slot',
        selectedSlot: payload.selectedSlot
      });

      if (slotConflict) {
        return res.status(409).json({ success: false, message: 'SELECTED SLOT ALREADY BOOKED' });
      }
    }

    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        ...payload,
        notes: payload.notes || '',
        patientName: payload.patientName || '',
        patientMobile: payload.patientMobile || ''
      },
      { returnDocument: 'after', runValidators: true }
    );

    const mobile = updated.patientMobile.startsWith('91') ? updated.patientMobile : `91${updated.patientMobile}`;
    const formattedName = String(updated.patientName || '').toUpperCase();
    const dateParts = updated.appointmentDate.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    try {
      await axios.post('https://backend.aisensy.com/campaign/t1/api/v2', {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: 'ashathehope_appointment_confirmation',
        destination: mobile,
        userName: formattedName,
        templateParams: [
          formattedName,
          formattedDate,
          String(updated.selectedSlot || 'Walk-in'),
          String(updated.doctorName || ''),
          String(updated.department || ''),
          String(updated.tokenNumber)
        ]
      });
      console.log('✅ WhatsApp message sent successfully');
    } catch (err) {
      console.error('WhatsApp Notification Error:', err.message);
    }

    await sendOfflineSMS(updated);

    return res.json({ success: true, message: 'APPOINTMENT UPDATED', data: updated });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.tokenNumber) {
      return res.status(409).json({ success: false, message: 'TOKEN ALREADY EXISTS, RETRY' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'APPOINTMENT DELETED' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
