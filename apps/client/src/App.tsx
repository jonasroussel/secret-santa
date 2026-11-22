import { LoginPage } from '@/auth/LoginPage.tsx';
import { AdminPage } from '@/event/AdminPage.tsx';

export function App() {
  return location.pathname === '/connexion' ? <LoginPage /> : <AdminPage />;
}
