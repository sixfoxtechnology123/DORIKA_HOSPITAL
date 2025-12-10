const express = require("express");
const { createSalaryHead,
     listSalaryHeads, 
     getByHeadId, 
     updateSalaryHead ,
     getNextSalaryHeadId,
    deleteSalaryHead
    } = require("../controllers/salaryHeadController");

const router = express.Router();

router.post("/salary-heads", createSalaryHead);
router.get("/salary-list", listSalaryHeads);
router.get("/salary-heads/:headId", getByHeadId);
router.put("/salary-heads/:id", updateSalaryHead);
router.get("/next-id", getNextSalaryHeadId);
router.delete("/:id", deleteSalaryHead);



module.exports = router;
