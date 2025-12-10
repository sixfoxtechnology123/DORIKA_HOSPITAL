const express = require('express');
const router = express.Router();
const {
  getNextDesignationID,
  createDesignation,
  getAllDesignations,
  updateDesignation,
  deleteDesignation
} = require('../controllers/designationController');

router.get('/next-id', getNextDesignationID);
router.post('/', createDesignation);
router.get('/', getAllDesignations);
router.put('/:id', updateDesignation);
router.delete('/:id', deleteDesignation);

module.exports = router;
