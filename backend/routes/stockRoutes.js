const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/stockController");

router.get("/", ctrl.getAllStock);
router.get("/next-id", ctrl.getNextStockId);
router.post("/", ctrl.createStock);
router.put("/:id", ctrl.updateStock);
router.delete("/:id", ctrl.deleteStock);

module.exports = router;
