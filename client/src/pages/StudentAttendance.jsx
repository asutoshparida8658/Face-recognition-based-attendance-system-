import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const StudentAttendance = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch student details
        const studentResponse = await api.get(`/api/students/${studentId}`);
        setStudent(studentResponse.data);
        
        // Fetch attendance records
        const attendanceResponse = await api.get(`/api/attendance/student/${studentId}`);
        setAttendance(attendanceResponse.data);
        
        // Calculate statistics
        const present = attendanceResponse.data.filter(record => record.status === 'present').length;
        const total = attendanceResponse.data.length;
        const absent = total - present;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        
        setStats({
          present,
          absent,
          total,
          percentage
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load student attendance data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [studentId]);

  // Group attendance by month
  const groupAttendanceByMonth = () => {
    const grouped = {};
    
    attendance.forEach(record => {
      const date = new Date(record.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          records: []
        };
      }
      
      grouped[key].records.push(record);
    });
    
    // Convert to array and sort by year and month (descending)
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };
  
  const groupedAttendance = groupAttendanceByMonth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Student Attendance</h1>
        
        <Link
          to="/students"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Back to Students
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : student ? (
        <>
          {/* Student Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center">
              {student.faceImage && (
                <div className="mb-4 md:mb-0 md:mr-6">
                  <img
                    src={`/api/uploads/${student.faceImage.split('/').pop()}`}
                    alt={student.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/128';
                    }}
                  />
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{student.name}</h2>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">Registration Number:</span> {student.registrationNumber}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Registered On:</span> {new Date(student.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Attendance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-700 mb-1">Total Days</h3>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-700 mb-1">Present Days</h3>
              <p className="text-2xl font-bold text-green-800">{stats.present}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <h3 className="text-sm font-medium text-red-700 mb-1">Absent Days</h3>
              <p className="text-2xl font-bold text-red-800">{stats.absent}</p>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              stats.percentage < 75 
                ? 'bg-red-50 border-red-100' 
                : stats.percentage < 85 
                ? 'bg-yellow-50 border-yellow-100' 
                : 'bg-green-50 border-green-100'
            }`}>
              <h3 className={`text-sm font-medium mb-1 ${
                stats.percentage < 75 
                  ? 'text-red-700' 
                  : stats.percentage < 85 
                  ? 'text-yellow-700' 
                  : 'text-green-700'
              }`}>Attendance Percentage</h3>
              <p className={`text-2xl font-bold ${
                stats.percentage < 75 
                  ? 'text-red-800' 
                  : stats.percentage < 85 
                  ? 'text-yellow-800' 
                  : 'text-green-800'
              }`}>{stats.percentage.toFixed(1)}%</p>
            </div>
          </div>
          
          {/* Attendance Records */}
          {groupedAttendance.length > 0 ? (
            groupedAttendance.map((group) => (
              <div key={`${group.year}-${group.month}`} className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">
                    {format(new Date(group.year, group.month - 1), 'MMMM yyyy')}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verification Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.records.sort((a, b) => new Date(b.date) - new Date(a.date)).map((record) => (
                        <tr key={record._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {record.verificationMethod === 'face' ? 'Face Recognition' : 'Manual'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(record.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No attendance records found for this student.</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-red-600 mb-4">Student not found</p>
          <Link
            to="/students"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go back to students list
          </Link>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;