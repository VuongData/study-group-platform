import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // 👈 1. Import thêm setDoc
import { auth, db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { LogIn } from 'lucide-react';
import './Login.scss'; // (Giả sử bạn có file css)

const Login = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // 👇 2. ĐOẠN QUAN TRỌNG: Lưu thông tin User vào Firestore
      // Dùng setDoc với { merge: true } để không bị mất dữ liệu cũ nếu họ đăng nhập lại
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
        // Bạn có thể thêm các trường mặc định khác ở đây
        role: "member" 
      }, { merge: true });

      toast.success(`Xin chào, ${user.displayName}!`);
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error("Đăng nhập thất bại. Vui lòng thử lại!");
    }
  };

  return (
    <div className="login-container" style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc'
    }}>
      <div className="login-card" style={{
        background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center'
      }}>
        <h2 style={{color: '#333', marginBottom: '10px'}}>Study Platform</h2>
        <p style={{color: '#666', marginBottom: '30px'}}>Đăng nhập để kết nối và học tập</p>
        
        <button 
          onClick={handleGoogleLogin}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px',
            background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
            cursor: 'pointer', fontSize: '1rem', fontWeight: '500', transition: '0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20"/>
          Đăng nhập với Google
        </button>
      </div>
    </div>
  );
};

export default Login;