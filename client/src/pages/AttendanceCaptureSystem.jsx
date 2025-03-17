import { useState } from 'react';
import FaceRecognitionCapture from '../components/attendance/FaceRecognitionCapture';
import { toast } from 'react-toastify';

const AttendanceCaptureSystem = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Handle successful attendance capture
  const handleAttendanceSuccess = (data) => {
    setAttendanceRecords(prev => [data, ...prev]);
    
    // Show toast notification
    toast.success(`Attendance marked for ${data.student.name}`);
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Capture System</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Face Recognition</h2>
        <p className="text-gray-600 mb-6">
          Position your face in front of the camera to mark your attendance.
          Make sure your face is clearly visible and well-lit.
        </p>
        
        <FaceRecognitionCapture onSuccess={handleAttendanceSuccess} />
      </div>
      
      {attendanceRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Attendance Records</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Student Name</th>
                  <th className="px-4 py-2 text-left">Registration No.</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr 
                    key={record.attendance._id}
                    className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="border px-4 py-2">{record.student.name}</td>
                    <td className="border px-4 py-2">{record.student.registrationNumber}</td>
                    <td className="border px-4 py-2">
                      {new Date(record.attendance.date).toLocaleTimeString()}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCaptureSystem;