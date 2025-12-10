const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getNextPolicyID,
  createPolicy,
  getAllPolicies,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policyController");

// Absolute path to uploads folder
const uploadPath = path.join(__dirname, "..", "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// File storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // store inside /server/uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Routes
router.get("/next-id", getNextPolicyID);
router.post("/", upload.single("policyDocument"), createPolicy);
router.get("/", getAllPolicies);
router.put("/:id", upload.single("policyDocument"), updatePolicy);
router.delete("/:id", deletePolicy);

module.exports = router;
