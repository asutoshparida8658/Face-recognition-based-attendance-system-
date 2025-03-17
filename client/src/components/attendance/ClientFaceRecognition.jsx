// src/components/attendance/ClientFaceRecognition.jsx
import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

const ClientFaceRecognition = ({ onAttendanceMarked }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [students, setStudents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const [faceDescriptors, setFaceDescriptors] = useState(null);
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setErrorMessage('');
        setRecognitionStatus('Loading face recognition models...');
        
        // Try different approaches for model paths
        // 1. Relative path from the current page
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        // 2. Absolute path from the root of the site (alternative)
        // const MODEL_URL = `${window.location.origin}/models`;
        
        console.log("Trying to load models from:", MODEL_URL);
        
        // Check if we can fetch one of the model files to verify the path
        try {
          const response = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
          if (!response.ok) {
            throw new Error(`Failed to load model manifest. Status: ${response.status}`);
          }
          console.log("Model manifest found!");
        } catch (error) {
          console.error("Error checking model availability:", error);
          setErrorMessage(`Failed to load face recognition models. Please check if the model files exist in the public/models folder. Error: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        // Load required models for face detection and recognition
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log("Loaded tiny face detector");
        } catch (error) {
          console.error("Failed to load tiny face detector:", error);
          setErrorMessage(`Failed to load face detector model: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        try {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          console.log("Loaded face landmark model");
        } catch (error) {
          console.error("Failed to load face landmark model:", error);
          setErrorMessage(`Failed to load face landmark model: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        try {
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log("Loaded face recognition model");
        } catch (error) {
          console.error("Failed to load face recognition model:", error);
          setErrorMessage(`Failed to load face recognition model: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        setRecognitionStatus('Face models loaded. Ready to start camera.');
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading face-api models:', error);
        setErrorMessage(`Failed to load face recognition models: ${error.message}`);
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, []);
  
  // Load student data and prepare face descriptors
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setRecognitionStatus('Loading student data...');
        
        // Fetch all students from the API
        const response = await api.get('/api/students');
        setStudents(response.data);
        console.log(`Loaded ${response.data.length} students`);
        
        // Create face descriptors for each student
        const labeledDescriptors = [];
        
        // This would work if we have access to the student face images
        for (const student of response.data) {
          try {
            // Skip students without face images
            if (!student.faceImage) {
              console.log(`Student ${student.name} has no face image, skipping`);
              continue;
            }
            
            // Extract filename from the path
            const filename = student.faceImage.split('/').pop();
            const imageUrl = `/uploads/${filename}`;
            
            console.log(`Trying to load face image for ${student.name} from ${imageUrl}`);
            
            // Load student face image
            try {
              const img = await faceapi.fetchImage(imageUrl);
              
              // Detect face and extract descriptor
              const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();
              
              if (detection) {
                // Create labeled descriptor
                labeledDescriptors.push(
                  new faceapi.LabeledFaceDescriptors(
                    student._id,
                    [detection.descriptor]
                  )
                );
                console.log(`Created descriptor for ${student.name}`);
              } else {
                console.log(`No face detected in the image for ${student.name}`);
              }
            } catch (err) {
              console.error(`Error loading face image for ${student.name}:`, err);
            }
          } catch (err) {
            console.error(`Error creating descriptor for ${student.name}:`, err);
          }
        }
        
        // Create face matcher if we have descriptors
        if (labeledDescriptors.length > 0) {
          setFaceDescriptors(labeledDescriptors);
          setRecognitionStatus(`Loaded ${labeledDescriptors.length} student face profiles.`);
        } else {
          setRecognitionStatus('Student data loaded.');
        }
      } catch (error) {
        console.error('Error loading student data:', error);
        setErrorMessage(`Failed to load student data: ${error.message}`);
      }
    };
    
    if (!isLoading) {
      loadStudentData();
    }
  }, [isLoading]);
  
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
        setRecognitionStatus('Camera active. Looking for faces...');
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
    
    setIsRecognizing(true);
    setRecognitionStatus('Recognition started. Looking for faces...');
    
    // Run face detection and recognition in a loop
    const recognitionInterval = setInterval(async () => {
      if (!videoRef.current || !isCameraActive || !canvasRef.current) {
        clearInterval(recognitionInterval);
        setIsRecognizing(false);
        return;
      }
      
      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();
        
        // Draw detections on canvas
        const canvas = canvasRef.current;
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        
        // Check if we have any detections
        if (detections.length > 0) {
          setRecognitionStatus('Face detected!');
          
          // If we have face descriptors, try to match the detected face
          if (faceDescriptors && faceDescriptors.length > 0) {
            // Create face matcher
            const faceMatcher = new faceapi.FaceMatcher(faceDescriptors, 0.6);
            
            // Try to match each detected face
            for (const detection of detections) {
              const match = faceMatcher.findBestMatch(detection.descriptor);
              
              // Draw label above the detection
              const drawBox = new faceapi.draw.DrawBox(
                detection.detection.box, 
                { label: match.toString() }
              );
              drawBox.draw(canvas);
              
              // If we have a match that's not unknown
              if (match.label !== 'unknown') {
                const student = students.find(s => s._id === match.label);
                const studentName = student ? student.name : match.label;
                
                setRecognitionStatus(`Recognized: ${studentName}`);
                
                // Get the student ID from the match label
                const studentId = match.label;
                
                // Mark attendance for this student
                await markAttendance(studentId);
                
                // Stop recognition after marking attendance
                clearInterval(recognitionInterval);
                setIsRecognizing(false);
                return;
              }
            }
            
            setRecognitionStatus('Face detected but not recognized. Please try again.');
          } else {
            // For demo purposes, just use the first student
            if (students.length > 0) {
              setRecognitionStatus('Demo mode: Using first student in the list.');
              
              const studentId = students[0]._id;
              
              // Mark attendance for this student
              await markAttendance(studentId);
              
              // Clear the interval to stop recognition
              clearInterval(recognitionInterval);
              setIsRecognizing(false);
            } else {
              setRecognitionStatus('No students found in the database.');
            }
          }
        }
      } catch (error) {
        console.error('Error during face recognition:', error);
        setRecognitionStatus(`Recognition error: ${error.message}`);
      }
    }, 1000); // Check every second
    
    // Clean up function
    return () => {
      clearInterval(recognitionInterval);
    };
  };
  
  // Mark attendance for a recognized student
  const markAttendance = async (studentId) => {
    try {
      setRecognitionStatus('Marking attendance...');
      
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
            onPlay={() => setIsInitialized(true)}
          />
          
          {/* Canvas overlay for face detection */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <LoadingSpinner size="lg" color="white" />
              <p className="ml-2 text-white font-semibold">Loading models...</p>
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
              disabled={isRecognizing || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
            >
              {isRecognizing ? 'Recognizing...' : 'Start Recognition'}
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
                onClick={() => markAttendance(student._id)}
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