const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const faceRecognition = require('../services/faceRecognition');

// Mark attendance via face recognition
exports.markAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Face image is required' });
    }
    
    // Get today's date with time set to 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Recognize face
    const recognition = await faceRecognition.recognizeFace(req.file.path);
    
    // Remove uploaded file after recognition
    fs.unlinkSync(req.file.path);
    
    if (!recognition) {
      return res.status(404).json({ message: 'Face not recognized' });
    }
    
    // Check if attendance already marked for today
    const existingAttendance = await Attendance.findOne({
      student: recognition.student._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }
    
    // Mark attendance
    const attendance = new Attendance({
      student: recognition.student._id,
      date: new Date(),
      status: 'present',
      verificationMethod: 'face'
    });
    
    await attendance.save();
    
    res.status(201).json({
      message: 'Attendance marked successfully',
      student: {
        _id: recognition.student._id,
        name: recognition.student.name,
        registrationNumber: recognition.student.registrationNumber
      },
      attendance: {
        _id: attendance._id,
        date: attendance.date,
        status: attendance.status
      }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    
    // Remove uploaded file if process fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Mark attendance manually (for admin)
exports.markAttendanceManually = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    
    if (!studentId || !date) {
      return res.status(400).json({ message: 'Student ID and date are required' });
    }
    
    // Check if student exists
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Parse date and set time to 00:00:00
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    // Check if attendance already marked for the date
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status || 'present';
      existingAttendance.verificationMethod = 'manual';
      existingAttendance.verifiedBy = req.user.id;
      
      await existingAttendance.save();
      
      return res.json({
        message: 'Attendance updated successfully',
        attendance: existingAttendance
      });
    }
    
    // Mark new attendance
    const attendance = new Attendance({
      student: studentId,
      date: attendanceDate,
      status: status || 'present',
      verificationMethod: 'manual',
      verifiedBy: req.user.id
    });
    
    await attendance.save();
    
    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance
    });
  } catch (error) {
    console.error('Error marking attendance manually:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get attendance by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Parse date and set time to 00:00:00
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    // Get all attendance records for the date
    const attendance = await Attendance.find({
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('student', 'name registrationNumber');
    
    res.json(attendance);
  } catch (error) {
    console.error('Error getting attendance:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get attendance by student
exports.getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    
    // Check if student exists
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Get all attendance records for the student
    const attendance = await Attendance.find({ student: studentId })
      .sort({ date: -1 });
    
    res.json(attendance);
  } catch (error) {
    console.error('Error getting student attendance:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const stats = await Attendance.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: '$studentInfo'
      },
      {
        $group: {
          _id: {
            student: '$student',
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          studentName: { $first: '$studentInfo.name' },
          registrationNumber: { $first: '$studentInfo.registrationNumber' },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          student: '$_id.student',
          studentName: 1,
          registrationNumber: 1,
          month: '$_id.month',
          year: '$_id.year',
          present: 1,
          absent: 1,
          total: 1,
          presentPercentage: {
            $multiply: [
              { $divide: ['$present', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: {
          year: -1,
          month: -1,
          studentName: 1
        }
      }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting attendance statistics:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};