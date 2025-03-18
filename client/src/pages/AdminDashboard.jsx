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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');
  
  // Fetch attendance statistics and student data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Build the URL with time slot parameters if selected
        let statsUrl = '/api/attendance/stats';
        if (selectedTimeSlot !== 'all') {
          const [start, end] = selectedTimeSlot.split('-');
          statsUrl += `?startTime=${start}&endTime=${end}`;
        } else if (startTime && endTime) {
          statsUrl += `?startTime=${startTime}&endTime=${endTime}`;
        }
        
        // Fetch attendance statistics
        const statsResponse = await api.get(statsUrl);
        setStats(statsResponse.data);
        
        // Extract available time slots
        const slotsSet = new Set();
        statsResponse.data.forEach(stat => {
          if (stat.startTime && stat.endTime) {
            slotsSet.add(`${stat.startTime}-${stat.endTime}`);
          }
        });
        setTimeSlots(Array.from(slotsSet));
        
        // Fetch students list
        const studentsResponse = await api.get('/api/students');
        setStudents(studentsResponse.data);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTimeSlot, startTime, endTime]);
  
  // Handle manual attendance submission
  const handleManualAttendance = async (data) => {
    try {
      // Add time slot data if available
      if (selectedTimeSlot !== 'all') {
        const [start, end] = selectedTimeSlot.split('-');
        data.startTime = start;
        data.endTime = end;
      } else if (startTime && endTime) {
        data.startTime = startTime;
        data.endTime = endTime;
      }
      
      await api.post('/api/attendance/mark-manual', data);
      toast.success('Attendance updated successfully!');
      
      // Refresh stats if on stats tab
      if (activeTab === 'stats') {
        let statsUrl = '/api/attendance/stats';
        if (selectedTimeSlot !== 'all') {
          const [start, end] = selectedTimeSlot.split('-');
          statsUrl += `?startTime=${start}&endTime=${end}`;
        } else if (startTime && endTime) {
          statsUrl += `?startTime=${startTime}&endTime=${endTime}`;
        }
        
        const response = await api.get(statsUrl);
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
  
  // Handle time slot filter changes
  const handleTimeSlotChange = (e) => {
    setSelectedTimeSlot(e.target.value);
    
    // Clear custom time inputs if a predefined slot is selected
    if (e.target.value !== 'all') {
      setStartTime('');
      setEndTime('');
    }
  };
  
  // Apply custom time slot filter
  const applyCustomTimeSlot = () => {
    if (!startTime || !endTime) {
      toast.warning('Please set both start and end times');
      return;
    }
    
    // Set selected time slot to "all" to use custom times instead
    setSelectedTimeSlot('all');
    
    // Refresh data with custom time slot
    setIsLoading(true);
    api.get(`/api/attendance/stats?startTime=${startTime}&endTime=${endTime}`)
      .then(response => {
        setStats(response.data);
        toast.success('Filtered by custom time slot');
      })
      .catch(error => {
        console.error('Error filtering by time slot:', error);
        toast.error('Failed to apply time slot filter');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Export attendance records
  const exportAttendanceReport = () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      
      if (selectedTimeSlot !== 'all') {
        const [start, end] = selectedTimeSlot.split('-');
        params.append('startTime', start);
        params.append('endTime', end);
      } else if (startTime && endTime) {
        params.append('startTime', startTime);
        params.append('endTime', endTime);
      }
      
      // Open export endpoint in new tab
      window.open(`${api.defaults.baseURL}/api/attendance/export-csv?${params.toString()}`, '_blank');
      
      toast.success('Downloading attendance report...');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export attendance report');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Time slot filtering */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Time Slot Filtering</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saved Time Slots</label>
            <select
              value={selectedTimeSlot}
              onChange={handleTimeSlotChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time Slots</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>
                  {slot.replace('-', ' - ')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={selectedTimeSlot !== 'all'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={selectedTimeSlot !== 'all'}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={applyCustomTimeSlot}
              disabled={selectedTimeSlot !== 'all' || !startTime || !endTime}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Apply Filter
            </button>
            
            <button
              onClick={exportAttendanceReport}
              className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
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
          <>
            {selectedTimeSlot !== 'all' && (
              <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
                <p className="font-medium">Filtered by time slot: {selectedTimeSlot.replace('-', ' - ')}</p>
              </div>
            )}
            {startTime && endTime && selectedTimeSlot === 'all' && (
              <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
                <p className="font-medium">Filtered by custom time: {startTime} - {endTime}</p>
              </div>
            )}
            <AttendanceStats stats={stats} />
          </>
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
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            selectedTimeSlot={selectedTimeSlot}
            onTimeSlotChange={handleTimeSlotChange}
            timeSlots={timeSlots}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;