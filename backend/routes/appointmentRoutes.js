const express = require('express');
const router = express.Router();
const {
  getAllAppointments,
  getNextAppointmentId,
  getNextToken,
  createAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');

router.get('/all', getAllAppointments);
router.get('/next-id', getNextAppointmentId);
router.get('/next-token', getNextToken);
router.post('/create', createAppointment);
router.put('/update/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

module.exports = router;
