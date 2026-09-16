import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store';
import { Shell } from './components';
import { Assistance, ChildProfile, Children, Dashboard, Login, MotherProfile, Mothers, Reminders, Reports, Users, Vaccinations } from './pages';

function Protected({ children }) {
  const token = useAuth((state) => state.token);
  return token ? <Shell>{children}</Shell> : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const user = useAuth((state) => state.user);
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const token = useAuth((state) => state.token);
  return <Routes>
    <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/*" element={<Protected><Routes>
      <Route index element={<Dashboard />} />
      <Route path="mothers" element={<Mothers />} />
      <Route path="mothers/:id" element={<MotherProfile />} />
      <Route path="children" element={<Children />} />
      <Route path="children/:id" element={<ChildProfile />} />
      <Route path="vaccinations" element={<Vaccinations />} />
      <Route path="reminders" element={<Reminders />} />
      <Route path="assistance" element={<Assistance />} />
      <Route path="reports" element={<Reports />} />
      <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Protected>} />
  </Routes>;
}
