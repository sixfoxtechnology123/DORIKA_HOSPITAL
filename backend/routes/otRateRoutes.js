const express = require("express");
const router = express.Router();

const {
  createOtRate,
  getOtRates,
  getOtRateByRule,
  deleteOtRate,
  applyBulkOtRate,
  checkExistingOtRates
} = require("../controllers/otRateController");

router.post("/ot-rate", createOtRate);
router.get("/ot-rate", getOtRates);
router.get("/ot-rate/rule", getOtRateByRule);
router.delete("/ot-rate/:id", deleteOtRate);
router.post("/save-bulk", applyBulkOtRate);
router.get("/check-existing", checkExistingOtRates);

module.exports = router;