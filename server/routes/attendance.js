const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth'); // Import the optional auth middleware

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

// Face recognition attendance - keep as is
router.post(
  '/mark',
  upload.single('faceImage'),
  attendanceController.markAttendance
);

// Manual attendance - use optional auth to allow unauthenticated requests for our userland alternative
router.post(
  '/mark-manual',
  optionalAuth, // Optional authentication
  attendanceController.markAttendanceManually
);

// Routes that still require regular auth
router.get(
  '/date/:date',
  auth,
  attendanceController.getAttendanceByDate
);

// Get attendance by student
router.get(
  '/student/:studentId',
  auth,
  attendanceController.getAttendanceByStudent
);

// Get attendance statistics
router.get(
  '/stats',
  auth,
  attendanceController.getAttendanceStats
);

module.exports = router;