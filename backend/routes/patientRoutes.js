const express = require('express');
const router = express.Router();
const {
  getLatestPatientId,
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getVisitHistory,
  addVisitHistory,
  getBillingHistory,
  addBillingHistory,
  getPharmacyHistory,
  addPharmacyHistory
} = require('../controllers/patientController');

router.get('/latest-id', getLatestPatientId);
router.post('/register', registerPatient);
router.get('/all', getAllPatients);
router.get('/:id', getPatientById);
router.put('/update/:id', updatePatient);
router.delete('/:id', deletePatient);

router.get('/:id/visit-history', getVisitHistory);
router.post('/:id/visit-history', addVisitHistory);
router.get('/:id/billing-history', getBillingHistory);
router.post('/:id/billing-history', addBillingHistory);
router.get('/:id/pharmacy-history', getPharmacyHistory);
router.post('/:id/pharmacy-history', addPharmacyHistory);

module.exports = router;
