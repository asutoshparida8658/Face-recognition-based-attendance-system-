import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const AttendanceReports = () => {
  const [stats, setStats] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('csv');
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch attendance statistics
        const statsResponse = await api.get('/api/attendance/stats');
        setStats(statsResponse.data);
        
        // Fetch students
        const studentsResponse = await api.get('/api/students');
        setStudents(studentsResponse.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
        toast.error('Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Get available months from stats
  const monthsAvailable = Array.from(
    new Set(stats.map(stat => `${stat.year}-${stat.month}`))
  ).sort().reverse();
  
  // Filter stats based on selection
  const filteredStats = stats.filter(stat => {
    // Filter by student
    if (selectedStudent !== 'all' && stat.student !== selectedStudent) {
      return false;
    }
    
    // Filter by month
    if (selectedMonth !== 'all') {
      const statMonth = `${stat.year}-${stat.month}`;
      if (statMonth !== selectedMonth) {
        return false;
      }
    }
    
    return true;
  });
  
  // Calculate summary
  const calculateSummary = () => {
    if (filteredStats.length === 0) {
      return {
        totalStudents: 0,
        averageAttendance: 0,
        belowThreshold: 0
      };
    }
    
    // Get unique students
    const uniqueStudents = new Set(filteredStats.map(stat => stat.student));
    
    // Get average attendance
    const averageAttendance = filteredStats.reduce((acc, stat) => acc + stat.presentPercentage, 0) / filteredStats.length;
    
    // Count students with below 75% attendance
    const belowThreshold = filteredStats.filter(stat => stat.presentPercentage < 75).length;
    
    return {
      totalStudents: uniqueStudents.size,
      averageAttendance,
      belowThreshold
    };
  };
  
  const summary = calculateSummary();
  
  // Export attendance report
  const exportReport = () => {
    if (filteredStats.length === 0) {
      toast.warning('No data to export');
      return;
    }
    
    try {
      let content = '';
      const fileName = `attendance-report-${selectedMonth !== 'all' ? selectedMonth : 'all'}-${new Date().getTime()}`;
      
      if (exportFormat === 'csv') {
        // CSV Header
        content = 'Student Name,Registration Number,Month,Year,Present,Absent,Total,Attendance %\n';
        
        // CSV Data
        filteredStats.forEach(stat => {
          content += `"${stat.studentName}","${stat.registrationNumber}",${stat.month},${stat.year},${stat.present},${stat.absent},${stat.total},${stat.presentPercentage.toFixed(2)}\n`;
        });
        
        // Create download link
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'json') {
        // JSON Data
        content = JSON.stringify(filteredStats, null, 2);
        
        // Create download link
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Attendance Reports</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="student-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Student
                </label>
                <select
                  id="student-filter"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Students</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Month
                </label>
                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Months</option>
                  {monthsAvailable.map(month => {
                    const [year, monthNum] = month.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    
                    return (
                      <option key={month} value={month}>
                        {format(date, 'MMMM yyyy')}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="flex-grow mr-2">
                  <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 mb-1">
                    Export Format
                  </label>
                  <select
                    id="export-format"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                
                <button
                  onClick={exportReport}
                  disabled={filteredStats.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Students</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalStudents}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Average Attendance</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.averageAttendance.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Below 75% Attendance</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.belowThreshold}</p>
            </div>
          </div>
          
          {/* Attendance Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Attendance Records</h2>
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
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStats.length > 0 ? (
                    filteredStats.map((stat, index) => (
                      <tr key={`${stat.student}-${stat.year}-${stat.month}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {stat.studentName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {stat.registrationNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {format(new Date(0, stat.month - 1), 'MMMM')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {stat.year}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {stat.present}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {stat.absent}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {stat.total}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-20 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  stat.presentPercentage < 75 
                                    ? 'bg-red-500' 
                                    : stat.presentPercentage < 85 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${stat.presentPercentage}%` }}
                              />
                            </div>
                            <span className={`text-sm ${
                              stat.presentPercentage < 75 
                                ? 'text-red-600' 
                                : stat.presentPercentage < 85 
                                ? 'text-yellow-600' 
                                : 'text-green-600'
                            } font-medium`}>
                              {stat.presentPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceReports;