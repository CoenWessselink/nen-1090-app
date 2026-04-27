import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/auth-store';

export function LogoutPage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  return null;
}

export default LogoutPage;
