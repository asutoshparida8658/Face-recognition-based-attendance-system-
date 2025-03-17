import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';
import {models} from "./../../../public/models";
const FaceRecognitionCapture = ({ onSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Specify model URL path
        const MODEL_URL = {models};
        
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
    if (!isCameraActive || !modelsLoaded) {
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
        
        // Set initialized state if face is detected
        setIsInitialized(detections.length > 0);
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
  }, [isCameraActive, modelsLoaded]);
  
  // Capture face for attendance
  const captureFace = async () => {
    if (!isInitialized) {
      toast.warning('No face detected. Please position your face in the camera view.');
      return;
    }
    
    try {
      setIsCapturing(true);
      
      // Get canvas data
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      // Convert data URL to Blob
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      // Create form data
      const formData = new FormData();
      formData.append('faceImage', blob, 'face.jpg');
      
      // Send face image to server
      const response = await api.post('/api/attendance/mark', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Handle success
      toast.success('Attendance marked successfully!');
      
      // Stop camera
      stopCamera();
      
      // Callback with student info
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error capturing face:', error);
      toast.error(
        error.response?.data?.message ||
        'Failed to mark attendance. Please try again.'
      );
    } finally {
      setIsCapturing(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-lg">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="w-full rounded-lg shadow-lg"
          autoPlay
          muted
          playsInline
          onPlay={() => setIsInitialized(false)}
        />
        
        {/* Face detection overlay */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
        
        {/* Loading overlay */}
        {isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <LoadingSpinner size="lg" color="white" />
            <p className="ml-2 text-white font-semibold">Processing...</p>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}
      
      {/* Controls */}
      <div className="mt-6 flex flex-wrap gap-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={isCapturing || !modelsLoaded}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={captureFace}
              disabled={isCapturing || !isInitialized}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
            >
              Mark Attendance
            </button>
            
            <button
              onClick={stopCamera}
              disabled={isCapturing}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 disabled:opacity-50"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>
      
      {/* Face detection status */}
      {isCameraActive && (
        <div className="mt-4">
          <p className={`font-medium ${isInitialized ? 'text-green-600' : 'text-yellow-600'}`}>
            {isInitialized
              ? '✅ Face detected. Ready to mark attendance.'
              : '⚠️ No face detected. Please position your face in the camera view.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceRecognitionCapture;