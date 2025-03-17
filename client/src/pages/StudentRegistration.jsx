import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentRegistrationForm from '../components/students/StudentRegistrationForm';
import { toast } from 'react-toastify';

const StudentRegistration = () => {
  const navigate = useNavigate();
  
  // Handle successful registration
  const handleSuccess = (student) => {
    toast.success(`Student ${student.name} registered successfully!`);
    navigate('/students');
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Register New Student</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <StudentRegistrationForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default StudentRegistration;