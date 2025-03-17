// src/components/attendance/WebcamCapture.jsx
import { useRef, useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

const WebcamCapture = ({ onImageCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Initialize camera
  const startCamera = async () => {
    try {
      setErrorMessage('');
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      console.log('Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video stream loaded and ready');
          setIsCameraActive(true);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Camera access denied. Please grant camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please make sure your camera is connected and not in use by another application.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application. Please close other applications that might be using your camera.');
      } else {
        setErrorMessage(`Unable to access camera: ${error.message}`);
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
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  // Capture image
  const captureImage = () => {
    if (!isCameraActive || !videoRef.current) {
      return;
    }
    
    try {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data URL
      const imageDataURL = canvas.toDataURL('image/jpeg');
      
      // Stop camera after capturing
      stopCamera();
      
      // Pass image data to parent component
      if (onImageCapture) {
        onImageCapture(imageDataURL);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      toast.error('Failed to capture image. Please try again.');
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
        />
        
        {/* Canvas for capture (hidden) */}
        <canvas
          ref={canvasRef}
          className="hidden"
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
            disabled={isCapturing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={captureImage}
              disabled={isCapturing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
            >
              Capture Photo
            </button>
            
            <button
              onClick={stopCamera}
              disabled={isCapturing}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;