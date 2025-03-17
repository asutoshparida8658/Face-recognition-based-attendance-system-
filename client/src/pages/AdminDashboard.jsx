import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

// Dashboard components
import AttendanceStats from '../components/admin/AttendanceStats';
import StudentManagement from '../components/admin/StudentManagement';
import ManualAttendance from '../components/admin/ManualAttendance';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Fetch attendance statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/attendance/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
        toast.error('Failed to load attendance statistics.');
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchStudents = async () => {
      try {
        const response = await api.get('/api/students');
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students list.');
      }
    };
    
    fetchStats();
    fetchStudents();
  }, []);
  
  // Handle manual attendance submission
  const handleManualAttendance = async (data) => {
    try {
      await api.post('/api/attendance/mark-manual', data);
      toast.success('Attendance updated successfully!');
      
      // Refresh stats if on stats tab
      if (activeTab === 'stats') {
        const response = await api.get('/api/attendance/stats');
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error(
        error.response?.data?.message || 
        'Failed to update attendance. Please try again.'
      );
    }
  };
  
  // Handle student deletion
  const handleDeleteStudent = async (studentId) => {
    try {
      await api.delete(`/api/students/${studentId}`);
      
      // Update students list
      setStudents(students.filter(student => student._id !== studentId));
      
      toast.success('Student deleted successfully!');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(
        error.response?.data?.message || 
        'Failed to delete student. Please try again.'
      );
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Tabs navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-600 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          Attendance Statistics
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'students' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-600 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('students')}
        >
          Student Management
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'manual' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-600 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Attendance
        </button>
      </div>
      
      {/* Content based on active tab */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading && activeTab === 'stats' ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTab === 'stats' ? (
          <AttendanceStats stats={stats} />
        ) : activeTab === 'students' ? (
          <StudentManagement 
            students={students}
            onDelete={handleDeleteStudent}
          />
        ) : (
          <ManualAttendance 
            students={students} 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSubmit={handleManualAttendance}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;