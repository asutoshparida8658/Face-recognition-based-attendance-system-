import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import WebcamCapture from '../components/attendance/WebcamCapture';

const StudentEdit = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/students/${studentId}`);
        setStudent(response.data);
        setName(response.data.name);
        setRegistrationNumber(response.data.registrationNumber);
      } catch (error) {
        console.error('Error fetching student:', error);
        toast.error('Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  // Handle image capture
  const handleImageCapture = (imageDataURL) => {
    setCapturedImage(imageDataURL);
    setShowCamera(false);
  };

  // Update student
  const updateStudent = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Student name is required');
      return;
    }

    if (!registrationNumber.trim()) {
      toast.error('Registration number is required');
      return;
    }

    try {
      setIsSubmitting(true);

      let formData = new FormData();
      formData.append('name', name);
      formData.append('registrationNumber', registrationNumber);

      // If new image was captured, add it to form data
      if (capturedImage) {
        const blob = await fetch(capturedImage).then(res => res.blob());
        formData.append('faceImage', blob, 'face.jpg');
      }

      // Send to server
      const response = await api.put(`/api/students/${studentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Student updated successfully!');
      navigate('/students');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const deleteStudent = async () => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/api/students/${studentId}`);
      toast.success('Student deleted successfully');
      navigate('/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.message || 'Failed to delete student');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Student</h1>
        
        <div className="flex space-x-2">
          <Link
            to="/students"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </Link>
          
          <button
            onClick={deleteStudent}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? <LoadingSpinner size="sm" color="white" /> : 'Delete Student'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : student ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={updateStudent}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
                Student Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="registrationNumber">
                Registration Number
              </label>
              <input
                type="text"
                id="registrationNumber"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Student Photo
              </label>
              
              {showCamera ? (
                <div className="mb-4">
                  <WebcamCapture onImageCapture={handleImageCapture} />
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCamera(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
                  {capturedImage ? (
                    <div className="relative h-full">
                      <img
                        src={capturedImage}
                        alt="Captured student"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : student.faceImage ? (
                    <div className="relative h-full">
                      <img
                        src={`/api/uploads/${student.faceImage.split('/').pop()}`}
                        alt={student.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/640x480';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Update Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500 mb-4">No photo captured</p>
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Capture Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Updating the photo is optional. If you don't need to change it, leave it as is.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                Update Student
              </button>
            </div>
          </form>
        </div>
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

export default StudentEdit;