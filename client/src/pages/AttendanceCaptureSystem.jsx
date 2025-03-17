import { useState, useEffect } from 'react';
import ClientFaceRecognition from '../components/attendance/ClientFaceRecognition';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const AttendanceCaptureSystem = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch today's attendance records on component mount
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        setIsLoading(true);

        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/api/attendance/date/${today}`);
        setAttendanceRecords(response.data);
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        toast.error('Failed to load today\'s attendance records');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, []);

  // Handle successful attendance marking
  const handleAttendanceMarked = (data) => {
    const newRecord = {
      _id: data.attendance._id,
      student: {
        _id: data.student._id,
        name: data.student.name,
        registrationNumber: data.student.registrationNumber,
      },
      date: data.attendance.date,
      status: 'present',
      verificationMethod: 'face',
      createdAt: new Date().toISOString(),
    };

    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Capture System</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Face Recognition</h2>
        <p className="text-gray-600 mb-6">
          Position your face in front of the camera to be recognized and mark your attendance.
          Make sure your face is clearly visible and well-lit.
        </p>

        <ClientFaceRecognition onAttendanceMarked={handleAttendanceMarked} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : attendanceRecords.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Attendance Records</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Student Name</th>
                  <th className="px-4 py-2 text-left">Registration No.</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-center">Method</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={record._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border px-4 py-2">{record.student.name}</td>
                    <td className="border px-4 py-2">{record.student.registrationNumber}</td>
                    <td className="border px-4 py-2">
                      {new Date(record.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.verificationMethod === 'face'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {record.verificationMethod === 'face' ? 'Face Recognition' : 'Manual'}
                      </span>
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
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No attendance records for today.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceCaptureSystem;