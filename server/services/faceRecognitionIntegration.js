// server/services/faceRecognitionIntegration.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const FACE_API_URL = process.env.FACE_API_URL || 'http://localhost:5005';
console.log(`Face Recognition Service URL: ${FACE_API_URL}`);

/**
 * Register a student's face with the Python face recognition service
 */
async function registerFace(studentData, imagePath) {
  try {
    console.log(`Starting face registration for student: ${studentData.name}, image: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found: ${imagePath}`);
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Read file as buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Create form data
    const formData = new FormData();
    
    // Append buffer instead of stream
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg'
    });
    
    formData.append('student_id', studentData._id.toString());
    formData.append('student_name', studentData.name);

    // Send request
    const response = await axios.post(`${FACE_API_URL}/register`, formData, {
      headers: formData.getHeaders()
    });

    console.log('Face registration response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error registering face:', error);
    throw error;
  }
}

/**
 * Recognize a face from an image
 */
async function recognizeFace(imagePath) {
  try {
    console.log(`Starting face recognition for image: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found: ${imagePath}`);
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Read file as buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Create form data
    const formData = new FormData();
    
    // Append buffer instead of stream
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg'
    });

    // Send request
    const response = await axios.post(`${FACE_API_URL}/recognize`, formData, {
      headers: formData.getHeaders()
    });

    console.log('Face recognition response:', response.data);
    
    if (response.data.recognized) {
      return {
        student: { 
          _id: response.data.student.student_id,
          name: response.data.student.name
        },
        confidence: response.data.confidence
      };
    } else {
      console.log('No face recognized');
      return null;
    }
  } catch (error) {
    console.error('Error recognizing face:', error);
    throw error;
  }
}

/**
 * Delete a student's face data
 */
async function deleteFaceData(studentId) {
  try {
    const response = await axios.delete(`${FACE_API_URL}/delete/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting face data:', error);
    throw error;
  }
}

/**
 * Check if the face recognition service is available
 */
async function isServiceAvailable() {
  try {
    const response = await axios.get(`${FACE_API_URL}/status`, { timeout: 5000 });
    console.log('Face recognition service status:', response.data);
    return response.data.status === 'online';
  } catch (error) {
    console.error('Face recognition service check failed:', error.message);
    return false;
  }
}

module.exports = {
  registerFace,
  recognizeFace,
  deleteFaceData,
  isServiceAvailable
};