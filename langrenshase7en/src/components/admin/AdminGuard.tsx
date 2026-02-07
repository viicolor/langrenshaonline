import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
  }, [navigate]);

  const user = authService.getCurrentUser();
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
