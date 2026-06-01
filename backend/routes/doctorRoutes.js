const express = require('express');
const router = express.Router();
const { 
  registerDoctor, 
  getLatestDoctorId, 
  getAllDoctors, 
  updateDoctor, 
  deleteDoctor 
} = require('../controllers/doctorController');

// Get the strictly next ID
router.get('/latest-id', getLatestDoctorId);

// Get all doctors for the table
router.get('/all', getAllDoctors);

// Add new doctor
router.post('/register', registerDoctor);

// Update existing doctor (using MongoDB _id)
router.put('/update/:id', updateDoctor);

// Delete doctor (using MongoDB _id)
router.delete('/:id', deleteDoctor);

module.exports = router;