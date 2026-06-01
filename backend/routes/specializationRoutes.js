const express = require('express');
const router = express.Router();
const { 
    upsertSpecialization, 
    getLatestId, 
    getAllSpecializations, 
    deleteSpecialization 
} = require('../controllers/specializationController');

// 1. Get the strictly next ID (Highest in DB + 1)
router.get('/specialization/latest', getLatestId);

// 2. Get all records for the list
router.get('/specialization/all', getAllSpecializations);

// 3. One route to handle both Add and Update (Upsert)
router.post('/specialization/upsert', upsertSpecialization);

// 4. Delete record by MongoDB _id
router.delete('/specialization/:id', deleteSpecialization);

module.exports = router;