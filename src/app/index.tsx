import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, role } = useAuth();

  if (!user) return <Redirect href="/login" />;
  if (role === 'asisten') return <Redirect href="/asisten" />;
  if (role === 'praktikan') return <Redirect href="/praktikan" />;
  return <Redirect href="/akun-bermasalah" />;
}
