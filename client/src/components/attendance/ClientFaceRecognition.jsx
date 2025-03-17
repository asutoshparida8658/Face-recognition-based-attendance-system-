// src/components/attendance/ClientFaceRecognition.jsx
import { useRef, useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

const ClientFaceRecognition = ({ onAttendanceMarked }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [students, setStudents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [recognitionStatus, setRecognitionStatus] = useState('');
  
  // Load students data
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setRecognitionStatus('Loading student data...');
        
        // Fetch all students from the API
        const response = await api.get('/api/students');
        setStudents(response.data);
        console.log(`Loaded ${response.data.length} students`);
        setRecognitionStatus(`Loaded ${response.data.length} student records.`);
      } catch (error) {
        console.error('Error loading student data:', error);
        setErrorMessage(`Failed to load student data: ${error.message}`);
      }
    };
    
    loadStudentData();
  }, []);
  
  // Initialize camera
  const startCamera = async () => {
    try {
      setErrorMessage('');
      setRecognitionStatus('Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setRecognitionStatus('Camera active. Ready to capture your face for recognition.');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Camera access denied. Please grant camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please make sure your camera is connected.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application. Please close other applications that might be using your camera.');
      } else {
        setErrorMessage(`Error accessing camera: ${error.message}`);
      }
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      setRecognitionStatus('Camera stopped.');
    }
  };
  
  // Start face recognition process
  const startRecognition = async () => {
    if (!isCameraActive) {
      toast.warning('Please start the camera first');
      return;
    }
    
    try {
      setIsRecognizing(true);
      setRecognitionStatus('Capturing your face...');
      
      // Capture current frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      
      // Create form data
      const formData = new FormData();
      formData.append('faceImage', blob, 'face.jpg');
      
      setRecognitionStatus('Recognizing...');
      
      // Send to server for recognition
      const response = await api.post('/api/attendance/mark', formData);
      
      // Handle successful recognition
      setRecognitionStatus(`Recognized: ${response.data.student.name}`);
      toast.success(`Attendance marked for ${response.data.student.name}`);
      
      // Call the callback if provided
      if (onAttendanceMarked) {
        onAttendanceMarked({
          student: response.data.student,
          attendance: response.data.attendance
        });
      }
      
      // Optionally stop the camera after successful recognition
      // stopCamera();
      
    } catch (error) {
      console.error('Error during face recognition:', error);
      
      // Determine message based on error response
      if (error.response) {
        if (error.response.status === 404) {
          setRecognitionStatus('Face not recognized. Please try again or use manual attendance.');
          toast.error('Face not recognized. Please try again.');
        } else if (error.response.status === 400 && error.response.data.message.includes('already marked')) {
          setRecognitionStatus(`Attendance already marked for today: ${error.response.data.student?.name || ''}`);
          toast.info('Attendance already marked for today.');
        } else {
          setRecognitionStatus(`Recognition error: ${error.response.data.message}`);
          toast.error(error.response.data.message || 'Recognition failed. Please try again.');
        }
      } else {
        setRecognitionStatus('Server error during recognition. Please try again later.');
        toast.error('Server error. Please try again later.');
      }
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // Mark attendance for a recognized student (demo mode)
  const markManualAttendance = async (studentId) => {
    try {
      setRecognitionStatus('Marking attendance manually...');
      setIsLoading(true);
      
      // Call the manual attendance API
      const response = await api.post('/api/attendance/mark-manual', {
        studentId,
        date: new Date().toISOString().split('T')[0],
        status: 'present'
      });
      
      // Find the student in our local state
      const student = students.find(s => s._id === studentId);
      
      if (student) {
        setRecognitionStatus(`Attendance marked for ${student.name}`);
        toast.success(`Attendance marked for ${student.name}`);
        
        // Call the callback if provided
        if (onAttendanceMarked) {
          onAttendanceMarked({
            student,
            attendance: response.data.attendance
          });
        }
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setRecognitionStatus('Failed to mark attendance.');
      toast.error('Failed to mark attendance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      {/* Status message */}
      <div className={`mb-4 p-2 rounded-lg text-center w-full ${
        errorMessage 
          ? 'bg-red-100 text-red-700' 
          : 'bg-blue-50 text-blue-700'
      }`}>
        <p>{errorMessage || recognitionStatus || 'Ready'}</p>
      </div>
      
      <div className="relative w-full max-w-lg">
        {/* Video feed */}
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg shadow-lg"
            width="640"
            height="480"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={() => setIsInitialized(true)}
          />
          
          {/* Canvas for capturing (hidden) */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Loading overlay */}
          {(isLoading || isRecognizing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <LoadingSpinner size="lg" color="white" />
              <p className="ml-2 text-white font-semibold">
                {isRecognizing ? 'Recognizing...' : 'Loading...'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="mt-6 flex flex-wrap gap-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={startRecognition}
              disabled={isRecognizing || isLoading || !isInitialized}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
            >
              {isRecognizing ? 'Recognizing...' : 'Mark Attendance'}
            </button>
            
            <button
              onClick={stopCamera}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 disabled:opacity-50"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>
      
      {/* For development/demo only - list of students */}
      <div className="mt-6 w-full max-w-lg">
        <h3 className="text-lg font-medium mb-2">Available Students (Demo):</h3>
        <ul className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
          {students.map(student => (
            <li key={student._id} className="mb-2">
              <button
                onClick={() => markManualAttendance(student._id)}
                className="text-left w-full hover:bg-gray-100 p-2 rounded"
              >
                <span className="font-medium">{student.name}</span> ({student.registrationNumber})
              </button>
            </li>
          ))}
          {students.length === 0 && <li className="text-gray-500">No students found</li>}
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Note: Click on a student to manually mark attendance for testing purposes.
        </p>
      </div>
    </div>
  );
};

export default ClientFaceRecognition;