const express = require('express');
const router = express.Router();
const {
  getNextLocationID,
  createLocation,
  getAllLocations,
  updateLocation,
  deleteLocation,
} = require('../controllers/locationcontroller');

router.get('/next-id', getNextLocationID);
router.post('/', createLocation);
router.get('/', getAllLocations);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

module.exports = router;
