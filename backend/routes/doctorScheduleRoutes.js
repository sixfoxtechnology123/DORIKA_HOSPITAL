const express = require('express');
const router = express.Router();
const {
  getAllDoctorSchedules,
  getNextScheduleId,
  createDoctorSchedule,
  updateDoctorSchedule,
  deleteDoctorSchedule
} = require('../controllers/doctorScheduleController');

router.get('/all', getAllDoctorSchedules);
router.get('/next-id', getNextScheduleId);
router.post('/create', createDoctorSchedule);
router.put('/update/:id', updateDoctorSchedule);
router.delete('/:id', deleteDoctorSchedule);

module.exports = router;
