import { Routes, Route, Navigate } from 'react-router-dom';
import AuthContainer from './modules/Auth/AuthContainer';
import Dashboard from './modules/Dashboard/Dashboard';
import ProtectedRoute from './components/ProtectedRoute'; // Giả sử bạn tách ra

function App() {
  return (
    <div className="app-container">
      <Routes>
        {/* --- KHU VỰC PUBLIC --- */}
        {/* Gom cả Login và Register vào một đường dẫn duy nhất là /auth */}
        <Route path="/auth" element={<AuthContainer />} />

        {/* Redirect mặc định: Vào /login cũng đẩy sang /auth */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />

        {/* --- KHU VỰC PRIVATE --- */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Route 404 */}
        <Route path="*" element={<Navigate to="/auth" />} />
      </Routes>
    </div>
  );
}

export default App;