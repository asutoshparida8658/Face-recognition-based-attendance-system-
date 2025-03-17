// server/controllers/studentController.js
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const faceService = require('../services/faceRecognitionIntegration');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new student with face recognition
exports.registerStudent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Face image is required' });
    }
    
    const { name, registrationNumber } = req.body;
    
    if (!name || !registrationNumber) {
      // Remove uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Name and registration number are required' });
    }
    
    // Check if registration number already exists
    const existingStudent = await Student.findOne({ registrationNumber });
    
    if (existingStudent) {
      // Remove uploaded file if student already exists
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Registration number already exists' });
    }
    
    // Create student in MongoDB first
    const student = new Student({
      name,
      registrationNumber,
      faceImage: req.file.path
    });
    
    await student.save();
    
    try {
      // Register face with the Python service
      await faceService.registerFace(student, req.file.path);
      
      res.status(201).json({
        message: 'Student registered successfully with face recognition',
        student: {
          _id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          faceImage: student.faceImage,
          createdAt: student.createdAt
        }
      });
    } catch (faceError) {
      console.error('Face registration error:', faceError);
      
      // We've already saved the student in MongoDB, so return success with a warning
      res.status(201).json({
        message: 'Student registered successfully, but face recognition processing failed. The student can still be identified manually.',
        student: {
          _id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          faceImage: student.faceImage,
          createdAt: student.createdAt
        },
        warning: faceError.message
      });
    }
  } catch (error) {
    console.error('Error registering student:', error);
    
    // Remove uploaded file if registration fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { name, registrationNumber } = req.body;
    
    if (!name && !registrationNumber && !req.file) {
      return res.status(400).json({ message: 'At least one field to update is required' });
    }
    
    // Find student by ID
    let student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If registration number is provided and changed, check if it already exists
    if (registrationNumber && registrationNumber !== student.registrationNumber) {
      const existingStudent = await Student.findOne({ registrationNumber });
      
      if (existingStudent && existingStudent._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Registration number already exists' });
      }
    }
    
    // Update student
    student.name = name || student.name;
    student.registrationNumber = registrationNumber || student.registrationNumber;
    
    // If face image is provided, update it
    if (req.file) {
      // Store the old image path
      const oldImagePath = student.faceImage;
      
      // Update face image path
      student.faceImage = req.file.path;
      
      // Save the updated student
      await student.save();
      
      try {
        // Try to update face data in the Python service
        await faceService.registerFace(student, req.file.path);
        
        // Remove old face image if successful
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (faceError) {
        console.error('Error updating face data:', faceError);
        // Continue without updating face data
      }
    } else {
      // Save the updated student without changing the face image
      await student.save();
    }
    
    res.json({
      message: 'Student updated successfully',
      student: {
        _id: student._id,
        name: student.name,
        registrationNumber: student.registrationNumber,
        faceImage: student.faceImage,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    
    // Remove uploaded file if update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Delete from MongoDB first
    await Student.findByIdAndDelete(req.params.id);
    
    // Try to delete from face recognition service
    try {
      await faceService.deleteFaceData(student._id.toString());
    } catch (faceError) {
      console.error('Error deleting face data:', faceError);
      // Continue even if face service deletion fails
    }
    
    // Try to remove the image file
    if (student.faceImage && fs.existsSync(student.faceImage)) {
      fs.unlinkSync(student.faceImage);
    }
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};