import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

const StudentRegistrationForm = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Specify model URL path
        const MODEL_URL = '/models';
        
        // Load models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
        setErrorMessage('Failed to load face detection models. Please refresh and try again.');
      }
    };
    
    loadModels();
    
    // Clean up on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Initialize camera
  const startCamera = async () => {
    if (!modelsLoaded) {
      setErrorMessage('Face detection models are not yet loaded. Please wait.');
      return;
    }
    
    try {
      setErrorMessage('');
      
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
        setCapturedImage(null);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setErrorMessage(
        'Unable to access camera. Please make sure you have granted camera permissions.'
      );
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };
  
  // Detect faces in the video stream
  useEffect(() => {
    if (!isCameraActive || !modelsLoaded || capturedImage) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      return;
    }
    
    let animationFrameId;
    
    const detectFaces = async () => {
      if (!video.paused && !video.ended && video.readyState === 4) {
        // Get canvas context
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Detect faces
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw face detections
        faceapi.draw.drawDetections(canvas, detections);
        faceapi.draw.drawFaceLandmarks(canvas, detections);
        
        // Update face detection status
        setFaceDetected(detections.length > 0);
      }
      
      // Continue detecting faces
      animationFrameId = requestAnimationFrame(detectFaces);
    };
    
    // Start detecting faces
    detectFaces();
    
    // Clean up
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isCameraActive, modelsLoaded, capturedImage]);
  
  // Capture face image
  const captureFace = async () => {
    if (!faceDetected) {
      toast.warning('No face detected. Please position your face in the camera view.');
      return;
    }
    
    try {
      setIsCapturing(true);
      
      // Get canvas data
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      // Set captured image
      setCapturedImage(dataUrl);
      
      // Stop camera
      stopCamera();
    } catch (error) {
      console.error('Error capturing face:', error);
      toast.error('Failed to capture face image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Register student with captured face
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
      toast.error('Face image is required. Please capture a face image.');
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
      
      // Send data to server
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
      toast.error(
        error.response?.data?.message ||
        'Failed to register student. Please try again.'
      );
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
            Face Image
          </label>
          
          <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
            {!isCameraActive && !capturedImage ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 mb-4">No face image captured</p>
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isLoading || !modelsLoaded}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Start Camera
                </button>
              </div>
            ) : capturedImage ? (
              <div className="relative h-full">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="relative h-full">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={captureFace}
                    disabled={isCapturing || !faceDetected}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Face detection status */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black bg-opacity-50">
                  <p className={`text-sm font-medium ${faceDetected ? 'text-green-400' : 'text-yellow-400'}`}>
                    {faceDetected
                      ? '✅ Face detected'
                      : '⚠️ No face detected'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {errorMessage}
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