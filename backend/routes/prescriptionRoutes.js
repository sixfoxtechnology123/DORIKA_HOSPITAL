const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../utils/authMiddleware');
const ctrl = require('../controllers/prescriptionController');

const uploadDir = path.join(__dirname, '..', 'uploads', 'prescriptions');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype && file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';
  if (isImage || isPdf) return cb(null, true);
  cb(new Error('Only image or PDF files are allowed'));
};

const upload = multer({ storage, fileFilter });

router.get('/all', authenticate, ctrl.getPrescriptions);
router.get('/latest-id', authenticate, ctrl.getNextId);
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `/uploads/prescriptions/${req.file.filename}`;
  res.json({
    success: true,
    url,
    file: {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    }
  });
});
router.post('/add', authenticate, ctrl.savePrescription);
router.put('/update/:id', authenticate, ctrl.savePrescription);
router.delete('/:id', authenticate, ctrl.deletePrescription);

module.exports = router;
