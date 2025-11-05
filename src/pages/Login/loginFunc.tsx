import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginDesign } from './loginDesign';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Call API service
      await login(email, password);
      
      toast.success('Login successful!');
      
      // ✅ Get user role and navigate accordingly
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      
      if (userData.role === 'lg-admin') {
        navigate('/lg-admin-dashboard');
      } else if (userData.role === 'super-admin') {
        navigate('/super-admin-dashboard');
      } else {
        navigate('/applicant-dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // ✅ Handle different error types
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.detail 
        || 'Login failed. Please check your credentials.';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginDesign
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      handleLogin={handleLogin}
      isLoading={isLoading}
    />
  );
}