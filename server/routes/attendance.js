const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/temp'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

router.post(
  '/mark',
  upload.single('faceImage'),
  attendanceController.markAttendance
);

router.use(auth);

// Mark attendance manually (admin only)
router.post(
  '/mark-manual',
  auth.checkAdmin,
  attendanceController.markAttendanceManually
);

// Get attendance by date
router.get(
  '/date/:date',
  attendanceController.getAttendanceByDate
);

// Get attendance by student
router.get(
  '/student/:studentId',
  attendanceController.getAttendanceByStudent
);

// Get attendance statistics
router.get(
  '/stats',
  attendanceController.getAttendanceStats
);

module.exports = router;