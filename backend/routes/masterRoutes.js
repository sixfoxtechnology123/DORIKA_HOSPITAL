const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// POST: Save department
router.post('/department', async (req, res) => {
  try {
    const { departmentCode, departmentName } = req.body;

    // Check for duplicates
    const existing = await Department.findOne({ departmentCode });
    if (existing) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const newDepartment = new Department({ departmentCode, departmentName });
    await newDepartment.save();
    res.status(201).json({ message: 'Department saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET: Get all departments
router.get('/department', async (req, res) => {
  try {
    const departments = await Department.find();
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

module.exports = router;
