const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema(
  {
    scheduleId: { type: String },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one day must be selected'
      }
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDuration: { type: Number, required: true, min: 1 },
    breakStartTime: { type: String, default: '' },
    breakEndTime: { type: String, default: '' },
    bookingMode: {
      type: String,
      enum: ['Slot Based', 'FCFS', 'Hybrid'],
      default: 'Slot Based'
    },
    maxPatientsPerDay: { type: Number, default: null, min: 1 }
  },
  { timestamps: true }
);

doctorScheduleSchema.index({ scheduleId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);
