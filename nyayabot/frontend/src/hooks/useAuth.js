/**
 * hooks/useAuth.js
 *
 * WHY a hook over direct store access:
 * This hook adds async logic (API calls) on top of the Zustand store.
 * Components import useAuth() and call login/logout — they don't touch
 * the API or localStorage directly.
 */

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) =>
      api.post('/auth/login', { email, password }),
    onSuccess: (response) => {
      const { user, token } = response.data;
      login(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/chat');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }) =>
      api.post('/auth/register', { name, email, password }),
    onSuccess: (response) => {
      const { user, token } = response.data;
      login(user, token);
      toast.success('Account created! Welcome to NyayaBot.');
      navigate('/chat');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Registration failed. Please try again.');
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully.');
  };

  return {
    user,
    token,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: handleLogout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    updateUser,
  };
}
