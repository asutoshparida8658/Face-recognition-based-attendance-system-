import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';

const ManualAttendance = ({ 
  students, 
  selectedDate, 
  onDateChange, 
  onSubmit,
  startTime = '',
  endTime = '',
  onStartTimeChange = () => {},
  onEndTimeChange = () => {},
  selectedTimeSlot = 'all',
  onTimeSlotChange = () => {},
  timeSlots = []
}) => {
  const [attendance, setAttendance] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState([]);
  
  // Fetch existing attendance for the selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setIsLoading(true);
        
        // Build the fetch URL based on date and time slot
        let url = `/api/attendance/date/${selectedDate}`;
        if (selectedTimeSlot !== 'all') {
          const [start, end] = selectedTimeSlot.split('-');
          url = `/api/attendance/timeslot?date=${selectedDate}&startTime=${start}&endTime=${end}`;
        } else if (startTime && endTime) {
          url = `/api/attendance/timeslot?date=${selectedDate}&startTime=${startTime}&endTime=${endTime}`;
        }
        
        const response = await api.get(url);
        
        // Create a map of student ID to attendance status
        const attendanceMap = {};
        response.data.forEach(record => {
          attendanceMap[record.student._id] = record.status;
        });
        
        setExistingAttendance(response.data);
        setAttendance(attendanceMap);
      } catch (error) {
        console.error('Error fetching attendance:', error);
        toast.error('Failed to load attendance records.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (selectedDate) {
      fetchAttendance();
    }
  }, [selectedDate, selectedTimeSlot, startTime, endTime]);
  
  // Handle attendance status change
  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };
  
  // Submit attendance
  const handleSubmit = async () => {
    const attendanceRecords = Object.keys(attendance).map(studentId => {
      // Create attendance record with time slot information
      const record = {
        studentId,
        date: selectedDate,
        status: attendance[studentId]
      };
      
      // Add time slot data if available
      if (selectedTimeSlot !== 'all') {
        const [start, end] = selectedTimeSlot.split('-');
        record.startTime = start;
        record.endTime = end;
      } else if (startTime && endTime) {
        record.startTime = startTime;
        record.endTime = endTime;
      }
      
      return record;
    });
    
    if (attendanceRecords.length === 0) {
      toast.warning('No attendance records to submit.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Submit each attendance record
      await Promise.all(
        attendanceRecords.map(record => onSubmit(record))
      );
      
      toast.success('Attendance records updated successfully!');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to update some attendance records.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark all as present or absent
  const markAll = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student._id] = status;
    });
    
    setAttendance(newAttendance);
  };
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Manual Attendance</h2>
          <p className="text-gray-600">Manually mark or update student attendance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="mr-2 font-medium text-gray-700">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {timeSlots.length > 0 && (
            <div>
              <label className="mr-2 font-medium text-gray-700">Time Slot:</label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => onTimeSlotChange(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time Slots</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {slot.replace('-', ' - ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom time slot section */}
      {selectedTimeSlot === 'all' && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-md font-semibold mb-3">Custom Time Slot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <p className="mt-2 text-sm text-blue-600">
            Setting a custom time slot will apply to all attendance records marked in this session.
          </p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => markAll('present')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Mark All Present
            </button>
            <button
              onClick={() => markAll('absent')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Mark All Absent
            </button>
          </div>
          
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Student Name</th>
                  <th className="px-4 py-2 text-left">Registration No.</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  // Check if student already has attendance record
                  const existingRecord = existingAttendance.find(
                    record => record.student._id === student._id
                  );
                  
                  return (
                    <tr key={student._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border px-4 py-2">{student.name}</td>
                      <td className="border px-4 py-2">{student.registrationNumber}</td>
                      <td className="border px-4 py-2 text-center">
                        <div className="flex justify-center">
                          <label className="mr-4 inline-flex items-center">
                            <input
                              type="radio"
                              name={`attendance-${student._id}`}
                              value="present"
                              checked={attendance[student._id] === 'present'}
                              onChange={() => handleStatusChange(student._id, 'present')}
                              className="form-radio h-4 w-4 text-green-600"
                            />
                            <span className="ml-2 text-green-700">Present</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name={`attendance-${student._id}`}
                              value="absent"
                              checked={attendance[student._id] === 'absent'}
                              onChange={() => handleStatusChange(student._id, 'absent')}
                              className="form-radio h-4 w-4 text-red-600"
                            />
                            <span className="ml-2 text-red-700">Absent</span>
                          </label>
                          
                          {existingRecord && (
                            <span className="ml-4 text-xs text-blue-500">
                              {existingRecord.startTime && existingRecord.endTime ? 
                                `(Recorded: ${existingRecord.startTime}-${existingRecord.endTime})` : 
                                '(Previously recorded)'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} className="border px-4 py-8 text-center text-gray-500">
                      No students found. Please register students first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isLoading || students.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              Save Attendance
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ManualAttendance;