// routes/payrollComponentRoutes.js
const express = require("express");
const router = express.Router();
const {
  getNextComponentID,
  createComponent,
  getAllComponents,
  updateComponent,
  deleteComponent,
} = require("../controllers/payrollComponentController");

router.get("/next-id", getNextComponentID);
router.post("/", createComponent);
router.get("/", getAllComponents);
router.put("/:id", updateComponent);
router.delete("/:id", deleteComponent);

module.exports = router;
