import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClassroomDetails from './pages/ClassroomDetails';
import AssignmentDetails from './pages/AssignmentDetails';
import QuizPage from './pages/QuizPage';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  return (
    <button
      onClick={() => setIsLight(!isLight)}
      className="fixed bottom-6 right-6 z-[9999] p-3 rounded-full shadow-2xl glass-panel text-white hover:text-primary-500 hover:scale-110 transition-all flex items-center justify-center group"
      title="Toggle Theme"
    >
      {isLight ? (
        <Moon className="w-6 h-6 text-indigo-500" />
      ) : (
        <Sun className="w-6 h-6 text-amber-400" />
      )}
    </button>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classroom/:id"
        element={
          <ProtectedRoute>
            <ClassroomDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classroom/:classroomId/assignment/:assignmentId"
        element={
          <ProtectedRoute>
            <AssignmentDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classroom/:id/quiz/:quizId"
        element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeToggle />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
