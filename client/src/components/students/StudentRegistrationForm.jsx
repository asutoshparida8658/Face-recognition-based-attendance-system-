// src/components/students/SimpleStudentRegistrationForm.jsx
import { useState } from 'react';
import WebcamCapture from '../attendance/WebcamCapture';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

const StudentRegistrationForm = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  
  // Handle image capture
  const handleImageCapture = (imageDataURL) => {
    setCapturedImage(imageDataURL);
    setShowCamera(false);
  };
  
  // Register student
  const registerStudent = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Student name is required');
      return;
    }
    
    if (!registrationNumber.trim()) {
      toast.error('Registration number is required');
      return;
    }
    
    if (!capturedImage) {
      toast.error('Student photo is required. Please capture a photo.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Convert data URL to Blob
      const blob = await fetch(capturedImage).then(res => res.blob());
      
      // Create form data
      const formData = new FormData();
      formData.append('name', name);
      formData.append('registrationNumber', registrationNumber);
      formData.append('faceImage', blob, 'face.jpg');
      
      // Send to server
      const response = await api.post('/api/students/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Handle success
      toast.success('Student registered successfully!');
      
      // Reset form
      setName('');
      setRegistrationNumber('');
      setCapturedImage(null);
      
      // Callback with student info
      if (onSuccess) {
        onSuccess(response.data.student);
      }
    } catch (error) {
      console.error('Error registering student:', error);
      
      // Check for specific error types
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Invalid input. Please check the form.');
      } else if (error.response?.status === 500 && error.response?.data?.message?.includes('face')) {
        // Handle face recognition specific error
        toast.error('Face recognition service is currently unavailable. Registration saved with photo only.');
      } else {
        toast.error('Failed to register student. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Register New Student</h2>
      
      <form onSubmit={registerStudent}>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
            Student Name
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="registrationNumber">
            Registration Number
          </label>
          <input
            type="text"
            id="registrationNumber"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Student Photo
          </label>
          
          {showCamera ? (
            <div className="mb-4">
              <WebcamCapture onImageCapture={handleImageCapture} />
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCamera(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
              {capturedImage ? (
                <div className="relative h-full">
                  <img
                    src={capturedImage}
                    alt="Captured student"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Retake Photo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500 mb-4">No photo captured</p>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Capture Photo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !capturedImage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            Register Student
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentRegistrationForm;