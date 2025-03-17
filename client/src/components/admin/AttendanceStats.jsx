import { useState } from 'react';
import { format } from 'date-fns';

const AttendanceStats = ({ stats }) => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [sortBy, setSortBy] = useState('studentName');
  const [sortOrder, setSortOrder] = useState('asc');
  
  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-600">No attendance records found.</p>
      </div>
    );
  }
  
  // Group stats by month and year
  const monthsAvailable = Array.from(
    new Set(stats.map(stat => `${stat.year}-${stat.month}`))
  ).sort().reverse();
  
  // Filter by selected month
  const filteredStats = selectedMonth === 'all'
    ? stats
    : stats.filter(stat => {
        const statMonth = `${stat.year}-${stat.month}`;
        return statMonth === selectedMonth;
      });
  
  // Sort filtered stats
  const sortedStats = [...filteredStats].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'studentName':
        aValue = a.studentName.toLowerCase();
        bValue = b.studentName.toLowerCase();
        break;
      case 'registrationNumber':
        aValue = a.registrationNumber;
        bValue = b.registrationNumber;
        break;
      case 'presentPercentage':
        aValue = a.presentPercentage;
        bValue = b.presentPercentage;
        break;
      case 'present':
        aValue = a.present;
        bValue = b.present;
        break;
      case 'absent':
        aValue = a.absent;
        bValue = b.absent;
        break;
      case 'total':
        aValue = a.total;
        bValue = b.total;
        break;
      default:
        aValue = a.studentName.toLowerCase();
        bValue = b.studentName.toLowerCase();
    }
    
    return sortOrder === 'asc'
      ? aValue > bValue ? 1 : -1
      : aValue < bValue ? 1 : -1;
  });
  
  // Get overall attendance statistics
  const overallStats = {
    totalStudents: new Set(filteredStats.map(stat => stat.student)).size,
    totalDays: Math.max(...filteredStats.map(stat => stat.total), 0),
    averageAttendance: filteredStats.reduce((acc, stat) => acc + stat.presentPercentage, 0) / 
                       (filteredStats.length || 1),
    belowThreshold: filteredStats.filter(stat => stat.presentPercentage < 75).length
  };
  
  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Attendance Statistics</h2>
          <p className="text-gray-600">View and analyze student attendance records</p>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 font-medium text-gray-700">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Months</option>
            {monthsAvailable.map((month) => {
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
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-1">Total Students</h3>
          <p className="text-2xl font-bold text-blue-800">{overallStats.totalStudents}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-1">Average Attendance</h3>
          <p className="text-2xl font-bold text-green-800">
            {overallStats.averageAttendance.toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <h3 className="text-sm font-medium text-yellow-700 mb-1">Working Days</h3>
          <p className="text-2xl font-bold text-yellow-800">{overallStats.totalDays}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <h3 className="text-sm font-medium text-red-700 mb-1">Below 75% Attendance</h3>
          <p className="text-2xl font-bold text-red-800">{overallStats.belowThreshold}</p>
        </div>
      </div>
      
      {/* Attendance table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th 
                className="px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('studentName')}
              >
                <div className="flex items-center">
                  <span>Student Name</span>
                  {sortBy === 'studentName' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('registrationNumber')}
              >
                <div className="flex items-center">
                  <span>Registration No.</span>
                  {sortBy === 'registrationNumber' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-center cursor-pointer"
                onClick={() => handleSort('present')}
              >
                <div className="flex items-center justify-center">
                  <span>Present</span>
                  {sortBy === 'present' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-center cursor-pointer"
                onClick={() => handleSort('absent')}
              >
                <div className="flex items-center justify-center">
                  <span>Absent</span>
                  {sortBy === 'absent' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-center cursor-pointer"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center justify-center">
                  <span>Total</span>
                  {sortBy === 'total' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-center cursor-pointer"
                onClick={() => handleSort('presentPercentage')}
              >
                <div className="flex items-center justify-center">
                  <span>Attendance %</span>
                  {sortBy === 'presentPercentage' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat, index) => (
              <tr 
                key={`${stat.student}-${stat.year}-${stat.month}-${index}`}
                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
              >
                <td className="border px-4 py-2">{stat.studentName}</td>
                <td className="border px-4 py-2">{stat.registrationNumber}</td>
                <td className="border px-4 py-2 text-center">{stat.present}</td>
                <td className="border px-4 py-2 text-center">{stat.absent}</td>
                <td className="border px-4 py-2 text-center">{stat.total}</td>
                <td className="border px-4 py-2 text-center">
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
                    <span className={`${
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceStats;