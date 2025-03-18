// src/components/attendance/ClientFaceRecognition.jsx
import { useRef, useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

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
  const [lastRecognizedStudent, setLastRecognizedStudent] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [recognitionEnabled, setRecognitionEnabled] = useState(true);
  const [currentSessionRecords, setCurrentSessionRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  
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
        setRecognitionStatus('Camera active. System will automatically mark attendance when a face is recognized.');
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

  // Start a new attendance session
  const startAttendanceSession = async () => {
    try {
      // Validate time inputs
      if (!startTime || !endTime) {
        toast.error('Please set both start and end times');
        return;
      }

      // Create a new session identifier
      const newSession = {
        date: selectedDate,
        startTime: startTime,
        endTime: endTime,
        id: `${selectedDate}_${startTime}_${endTime}`,
        createdAt: new Date().toISOString()
      };
      
      setCurrentSession(newSession);
      setSessionActive(true);
      setCurrentSessionRecords([]); // Clear previous session records
      
      toast.success(`New attendance session started: ${startTime} - ${endTime}`);
      
      // Start camera if not already active
      if (!isCameraActive) {
        await startCamera();
      }
    } catch (error) {
      console.error('Error starting attendance session:', error);
      toast.error('Failed to start attendance session');
    }
  };

  // End the current attendance session
  const endAttendanceSession = () => {
    setSessionActive(false);
    setCurrentSession(null);
    stopCamera();
    toast.info('Attendance session ended');
  };
  
  // Continuous face recognition
  useEffect(() => {
    let recognitionTimer = null;
    
    if (isCameraActive && isInitialized && !isRecognizing && !cooldown && recognitionEnabled && sessionActive) {
      recognitionTimer = setTimeout(() => {
        startRecognition();
      }, 1000); // Check for faces every second
    }
    
    return () => {
      if (recognitionTimer) {
        clearTimeout(recognitionTimer);
      }
    };
  }, [isCameraActive, isInitialized, isRecognizing, cooldown, recognitionEnabled, sessionActive]);
  
  // Start face recognition process
  const startRecognition = async () => {
    if (!isCameraActive || isRecognizing || cooldown || !recognitionEnabled || !sessionActive || !currentSession) {
      return;
    }
    
    try {
      setIsRecognizing(true);
      setRecognitionStatus('Capturing face...');
      
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
      
      // Add time slot data
      formData.append('startTime', currentSession.startTime);
      formData.append('endTime', currentSession.endTime);
      formData.append('date', currentSession.date);
      
      setRecognitionStatus('Recognizing...');
      
      // Send to server for recognition
      const response = await api.post('/api/attendance/mark', formData);
      
      // Handle successful recognition
      const studentName = response.data.student.name;
      setRecognitionStatus(`Recognized: ${studentName}`);
      setLastRecognizedStudent(response.data.student);
      
      // Show success toast
      toast.success(`Attendance marked for ${studentName}`, {
        position: "top-center",
        autoClose: 4000
      });
      
      // Create attendance record for current session
      const newRecord = {
        _id: response.data.attendance._id,
        student: response.data.student,
        date: response.data.attendance.date,
        status: 'present',
        verificationMethod: 'face',
        createdAt: new Date().toISOString(),
        startTime: currentSession.startTime,
        endTime: currentSession.endTime,
        sessionId: currentSession.id
      };
      
      // Add to current session records without duplicates
      setCurrentSessionRecords(prev => {
        const exists = prev.some(record => record.student._id === response.data.student._id);
        if (exists) {
          return prev;
        }
        return [newRecord, ...prev];
      });
      
      // Call the callback if provided
      if (onAttendanceMarked) {
        onAttendanceMarked({
          student: response.data.student,
          attendance: response.data.attendance,
          session: currentSession
        });
      }
      
      // Enter cooldown period
      setCooldown(true);
      setRecognitionEnabled(false);
      
      // Reset after cooldown period
      setTimeout(() => {
        setCooldown(false);
        setRecognitionEnabled(true);
        setRecognitionStatus('Ready for next person...');
      }, 4000);
      
    } catch (error) {
      console.error('Error during face recognition:', error);
      
      // Determine message based on error response
      if (error.response) {
        if (error.response.status === 404) {
          setRecognitionStatus('Face not recognized. Please try again or use manual attendance.');
        } else if (error.response.status === 400 && error.response.data.message.includes('already marked')) {
          const studentName = error.response.data.student?.name || '';
          setRecognitionStatus(`Attendance already marked for this session: ${studentName}`);
          toast.info(`Attendance already marked for ${studentName} in this session`, {
            position: "top-center",
            autoClose: 4000
          });
        } else {
          setRecognitionStatus(`Recognition error: ${error.response.data.message}`);
        }
      } else {
        setRecognitionStatus('Server error during recognition. Please try again later.');
      }
      
      // Short cooldown to prevent rapid error retries
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
      }, 1000);
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // Mark attendance for a recognized student (demo mode)
  const markManualAttendance = async (studentId) => {
    if (!sessionActive || !currentSession) {
      toast.warning('Please start an attendance session first');
      return;
    }
    
    try {
      setRecognitionStatus('Marking attendance manually...');
      setIsLoading(true);
      
      // Call the manual attendance API with time slot data
      const response = await api.post('/api/attendance/mark-manual', {
        studentId,
        date: currentSession.date,
        status: 'present',
        startTime: currentSession.startTime,
        endTime: currentSession.endTime
      });
      
      // Find the student in our local state
      const student = students.find(s => s._id === studentId);
      
      if (student) {
        setRecognitionStatus(`Attendance marked for ${student.name}`);
        toast.success(`Attendance marked for ${student.name}`, {
          position: "top-center",
          autoClose: 4000
        });
        
        // Add to current session records
        const newRecord = {
          _id: response.data.attendance._id,
          student: student,
          date: response.data.attendance.date,
          status: 'present',
          verificationMethod: 'manual',
          createdAt: new Date().toISOString(),
          startTime: currentSession.startTime,
          endTime: currentSession.endTime,
          sessionId: currentSession.id
        };
        
        // Add to current session records without duplicates
        setCurrentSessionRecords(prev => {
          const exists = prev.some(record => record.student._id === student._id);
          if (exists) {
            return prev;
          }
          return [newRecord, ...prev];
        });
        
        // Call the callback if provided
        if (onAttendanceMarked) {
          onAttendanceMarked({
            student,
            attendance: response.data.attendance,
            session: currentSession
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
  
  // Export current session attendance to CSV
  const exportSessionAttendance = () => {
    if (currentSessionRecords.length === 0) {
      toast.warning('No attendance records to export');
      return;
    }
    
    try {
      // Create CSV content
      let csv = 'Student Name,Registration Number,Date,Time,Time Slot,Method,Status\n';
      
      // Add each record
      currentSessionRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString();
        const time = new Date(record.createdAt).toLocaleTimeString();
        const timeSlot = `${record.startTime}-${record.endTime}`;
        
        csv += `"${record.student.name}","${record.student.registrationNumber}","${date}","${time}","${timeSlot}","${record.verificationMethod}","present"\n`;
      });
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-session-${currentSession.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Attendance data exported to CSV');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export attendance data');
    }
  };
  
  // Toggle automatic recognition
  const toggleAutomaticRecognition = () => {
    setRecognitionEnabled(!recognitionEnabled);
    setRecognitionStatus(recognitionEnabled ? 
      'Automatic recognition paused. Click "Resume Automatic Recognition" to continue.' : 
      'Automatic recognition resumed. System will detect faces automatically.');
  };
  
  // Check if a student is already marked present in current session
  const isStudentPresentInSession = (studentId) => {
    return currentSessionRecords.some(record => record.student._id === studentId);
  };
  
  return (
    <div className="flex flex-col items-center">
      {/* Time slot selection section */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Attendance Session</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sessionActive}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sessionActive}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sessionActive}
            />
          </div>
        </div>
        
        <div className="flex justify-between">
          {!sessionActive ? (
            <button
              onClick={startAttendanceSession}
              disabled={isLoading || !startTime || !endTime}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Attendance Session
            </button>
          ) : (
            <button
              onClick={endAttendanceSession}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End Session
            </button>
          )}
          
          {sessionActive && currentSessionRecords.length > 0 && (
            <button
              onClick={exportSessionAttendance}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Export Session Data
            </button>
          )}
        </div>
      </div>
      
      {/* Active session notification */}
      {sessionActive && currentSession && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg w-full max-w-lg text-center">
          <p className="font-bold">Active Session: {currentSession.startTime} - {currentSession.endTime}</p>
          <p className="text-sm">{format(new Date(currentSession.date), 'MMMM d, yyyy')}</p>
        </div>
      )}
      
      {/* Status message */}
      <div className={`mb-4 p-2 rounded-lg text-center w-full max-w-lg ${
        errorMessage 
          ? 'bg-red-100 text-red-700' 
          : lastRecognizedStudent
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-50 text-blue-700'
      }`}>
        <p>{errorMessage || recognitionStatus || 'Ready'}</p>
        {lastRecognizedStudent && (
          <p className="font-bold">Last recognized: {lastRecognizedStudent.name}</p>
        )}
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
      
      {/* Camera controls */}
      <div className="mt-6 flex flex-wrap gap-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={isLoading || !sessionActive}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Start Camera
          </button>
        ) : (
          <>
            {recognitionEnabled ? (
              <button
                onClick={toggleAutomaticRecognition}
                disabled={isRecognizing || isLoading}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg shadow hover:bg-yellow-700 disabled:opacity-50"
              >
                Pause Automatic Recognition
              </button>
            ) : (
              <button
                onClick={toggleAutomaticRecognition}
                disabled={isRecognizing || isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
              >
                Resume Automatic Recognition
              </button>
            )}
            
            <button
              onClick={startRecognition}
              disabled={isRecognizing || isLoading || !isInitialized || cooldown || !recognitionEnabled}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isRecognizing ? 'Recognizing...' : cooldown ? 'Cooldown...' : 'Manual Capture'}
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
      
      {/* Current Session Attendance Records */}
      {sessionActive && (
        <div className="mt-6 w-full max-w-lg bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">Current Session Attendance</h2>
            {currentSession && (
              <p className="text-sm text-gray-500">
                {format(new Date(currentSession.date), 'MMMM d, yyyy')} ({currentSession.startTime} - {currentSession.endTime})
              </p>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSessionRecords.length > 0 ? (
                  currentSessionRecords.map((record) => (
                    <tr key={record._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.student.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {record.student.registrationNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(record.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.verificationMethod === 'face' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.verificationMethod === 'face' ? 'Face Recognition' : 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                      No attendance records for current session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Student selection for manual attendance */}
      {sessionActive && (
        <div className="mt-6 w-full max-w-lg bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Manual Attendance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {students.map(student => {
              // Check if student is already marked present in this session
              const isPresent = isStudentPresentInSession(student._id);
              
              return (
                <button
                  key={student._id}
                  onClick={() => !isPresent && markManualAttendance(student._id)}
                  disabled={isPresent}
                  className={`text-left p-2 rounded text-sm ${
                    isPresent 
                      ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                      : 'hover:bg-blue-50 border border-gray-200'
                  }`}
                >
                  <div className="font-medium truncate">
                    {student.name}
                    {isPresent && ' ✓'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{student.registrationNumber}</div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Click on a student to manually mark attendance.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientFaceRecognition;