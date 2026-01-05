// src/modules/Auth/Login.jsx
import { useAuth } from "../../context/AuthContext"; // Gọi custom hook
import { Navigate } from "react-router-dom";

const Login = () => {
  const { user, loginWithGoogle } = useAuth();

  // Nếu đã login rồi thì không cho ở trang login nữa, đá về Dashboard
  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#121212',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>🎓 Study Platform</h1>
        <p style={{ marginBottom: '40px', color: '#888' }}>
          Hệ thống học nhóm & Quản lý dự án trực tuyến
        </p>
        
        <button 
          onClick={loginWithGoogle}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(to right, #4facfe, #00f2fe)',
            color: 'white'
          }}
        >
          <span style={{ marginRight: '10px' }}>G</span> 
          Đăng nhập với Google
        </button>
      </div>
    </div>
  );
};

export default Login;