const fs = require('fs');
const path = require('path');
const { Canvas, Image } = require('canvas');
const faceapi = require('@vladmandic/face-api');
const Student = require('../models/Student');

// Load face-api models
const MODELS_PATH = path.join(__dirname, '../models');

// Initialize face-api models
async function loadModels() {
  // Make sure models directory exists
  if (!fs.existsSync(MODELS_PATH)) {
    fs.mkdirSync(MODELS_PATH, { recursive: true });
  }
  
  // Load face detection, landmark detection, and face recognition models
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
  
  console.log('Face recognition models loaded');
}

// Initialize face-api
(async () => {
  try {
    // Configure the canvas environment for face-api
    const { Canvas, Image, ImageData } = require('canvas');
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    
    await loadModels();
  } catch (error) {
    console.error('Error initializing face recognition:', error);
  }
})();

// Get face descriptor from image
async function getFaceDescriptorFromImage(imagePath) {
  try {
    const img = await canvas.loadImage(imagePath);
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detections) {
      throw new Error('No face detected in the image');
    }
    
    return detections.descriptor;
  } catch (error) {
    console.error('Error getting face descriptor:', error);
    throw error;
  }
}

// Register a new student with face
async function registerFace(studentData, imagePath) {
  try {
    const descriptor = await getFaceDescriptorFromImage(imagePath);
    
    // Create student with face descriptor
    const student = new Student({
      name: studentData.name,
      registrationNumber: studentData.registrationNumber,
      faceDescriptor: Array.from(descriptor),
      faceImage: imagePath
    });
    
    await student.save();
    return student;
  } catch (error) {
    console.error('Error registering face:', error);
    throw error;
  }
}

// Recognize a face from existing students
async function recognizeFace(imagePath) {
  try {
    const img = await canvas.loadImage(imagePath);
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detections) {
      throw new Error('No face detected in the image');
    }
    
    // Get all students with their face descriptors
    const students = await Student.find();
    
    if (students.length === 0) {
      throw new Error('No students registered in the system');
    }
    
    // Create face matcher with labeled descriptors
    const labeledDescriptors = students.map(student => {
      return new faceapi.LabeledFaceDescriptors(
        student._id.toString(),
        [new Float32Array(student.faceDescriptor)]
      );
    });
    
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 is the distance threshold
    
    // Find best match
    const match = faceMatcher.findBestMatch(detections.descriptor);
    
    if (match.label === 'unknown') {
      return null;
    }
    
    // Find student by ID (the label)
    const recognizedStudent = await Student.findById(match.label);
    return {
      student: recognizedStudent,
      distance: match.distance
    };
  } catch (error) {
    console.error('Error recognizing face:', error);
    throw error;
  }
}

module.exports = {
  loadModels,
  registerFace,
  recognizeFace
};