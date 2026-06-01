const express = require("express");
const router = express.Router();
const grnController = require("../controllers/grnController");

router.get("/", grnController.getAllGRNs);
router.get("/next-number", grnController.getNextGRNNumber);
router.post("/create", grnController.createGRN);
router.put("/:id", grnController.updateGRN);
router.delete("/:id", grnController.deleteGRN);

module.exports = router;
