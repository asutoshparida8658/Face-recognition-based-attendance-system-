import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';

const StudentManagement = ({ students, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isDeleting, setIsDeleting] = useState(null);
  
  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Sort filtered students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'registrationNumber':
        aValue = a.registrationNumber.toLowerCase();
        bValue = b.registrationNumber.toLowerCase();
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }
    
    return sortOrder === 'asc'
      ? aValue > bValue ? 1 : -1
      : aValue < bValue ? 1 : -1;
  });
  
  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  // Handle student deletion
  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        setIsDeleting(studentId);
        await onDelete(studentId);
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Failed to delete student.');
      } finally {
        setIsDeleting(null);
      }
    }
  };
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Student Management</h2>
          <p className="text-gray-600">View, search and manage registered students</p>
        </div>
        
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search by name or reg. number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <Link
            to="/students/register"
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Register New Student
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th 
                className="px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  <span>Student Name</span>
                  {sortBy === 'name' && (
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
                className="px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  <span>Registered On</span>
                  {sortBy === 'createdAt' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student, index) => (
              <tr 
                key={student._id}
                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
              >
                <td className="border px-4 py-2">{student.name}</td>
                <td className="border px-4 py-2">{student.registrationNumber}</td>
                <td className="border px-4 py-2">
                  {new Date(student.createdAt).toLocaleDateString()}
                </td>
                <td className="border px-4 py-2 text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <Link
                      to={`/attendance/student/${student._id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View Attendance
                    </Link>
                    <button
                      onClick={() => handleDelete(student._id)}
                      disabled={isDeleting === student._id}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting === student._id ? (
                        <LoadingSpinner size="sm" color="white" />
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {sortedStudents.length === 0 && (
              <tr>
                <td colSpan={4} className="border px-4 py-8 text-center text-gray-500">
                  {searchTerm ? (
                    'No students match your search criteria.'
                  ) : (
                    'No students registered yet. Click "Register New Student" to add one.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManagement;