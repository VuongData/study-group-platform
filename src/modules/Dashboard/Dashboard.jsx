import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Edit2, Check, X, User } from "lucide-react"; 
// 👇 Thay đổi import: thêm setDoc
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../../services/firebase"; 
import { toast } from "react-toastify";
import imgChat from "../../assets/dashboard-chat.png";
import imgOppm from "../../assets/dashboard-oppm.png";
import imgDoc from "../../assets/dashboard-doc.png";
import "./Dashboard.scss";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nameInputRef = useRef(null);

  // 1. KIỂM TRA LẦN ĐẦU (Fix logic: Chưa có doc cũng phải hiện Onboarding)
  useEffect(() => {
    if (!user) return;
    
    const checkUserSetup = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        // Trường hợp 1: User chưa có trong Firestore (Vừa login Google xong)
        if (!userSnap.exists()) {
          setTempName(user.displayName || ""); 
          setShowOnboarding(true); 
        } 
        // Trường hợp 2: User đã có trong Firestore nhưng chưa setup xong
        else {
          const data = userSnap.data();
          if (!data.isSetup) {
            setTempName(user.displayName || data.displayName || "");
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error("Lỗi kiểm tra user:", error);
      }
    };
    checkUserSetup();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 2. HÀM CẬP NHẬT TÊN (Fix logic: Dùng setDoc merge thay vì updateDoc)
  const handleUpdateName = async (isOnboardingFlow = false) => {
    if (!tempName.trim()) return toast.warning("Tên không được để trống!");
    
    setIsLoading(true);
    try {
      // A. Cập nhật Auth (Để hiện trên Chat ngay)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: tempName });
      }
      
      // B. Cập nhật Firestore (Dùng setDoc + merge để tránh lỗi "No document")
      const userRef = doc(db, "users", user.uid);
      
      const updateData = { 
        uid: user.uid,
        email: user.email,
        displayName: tempName,
        photoURL: user.photoURL || null,
        // Nếu là luồng Onboarding thì đánh dấu đã setup
        ...(isOnboardingFlow && { isSetup: true, createdAt: new Date() }) 
      };

      // ✅ FIX QUAN TRỌNG: merge: true (Tạo nếu chưa có, Sửa nếu đã có)
      await setDoc(userRef, updateData, { merge: true });
      
      // C. Update UI
      if (isOnboardingFlow) {
        setShowOnboarding(false);
        toast.success(`Chào mừng ${tempName}! 🚀`);
      } else {
        setIsEditingName(false);
        toast.success("Đã đổi tên thành công!");
      }

      // Reload nhẹ để đồng bộ lại context nếu cần
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error("Lỗi update:", error);
      toast.error("Lỗi cập nhật: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const modules = [
    { id: 'chat', title: "THẢO LUẬN", sub: "Chat Room", desc: "Trao đổi nhanh, chém gió dự án.", path: "/chat", bgImage: imgChat },
    { id: 'oppm', title: "KẾ HOẠCH", sub: "OPPM Board", desc: "Theo dõi tiến độ & deadline.", path: "/oppm", bgImage: imgOppm },
    { id: 'resources', title: "TÀI NGUYÊN", sub: "Documents", desc: "Kho lưu trữ tài liệu chung.", path: "/resources", bgImage: imgDoc }
  ];

  return (
    <div className="dashboard-cinematic">
      <div className="bg-overlay"></div>

      <div className="content-wrapper">
        <header className="hero-header">
          <div className="welcome-block">
            <span className="sub-greeting">WELCOME BACK</span>
            
            <div className="user-name-wrapper">
              {isEditingName ? (
                <div className="edit-name-box">
                  <input 
                    ref={nameInputRef}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Nhập tên mới..."
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button onClick={() => handleUpdateName(false)} className="btn-save"><Check size={20}/></button>
                    <button onClick={() => setIsEditingName(false)} className="btn-cancel"><X size={20}/></button>
                  </div>
                </div>
              ) : (
                <h1 className="user-name">
                  {user?.displayName || "Thành viên mới"}
                  <button 
                    className="btn-edit-name" 
                    onClick={() => { setTempName(user?.displayName || ""); setIsEditingName(true); }}
                    title="Đổi tên hiển thị"
                  >
                    <Edit2 size={24} />
                  </button>
                </h1>
              )}
            </div>
            
            <p className="quote">"Sẵn sàng bứt phá cho đồ án này chưa?"</p>
          </div>
          
          <button onClick={handleLogout} className="btn-logout-minimal">
            <LogOut size={20} /> <span>Đăng xuất</span>
          </button>
        </header>

        <div className="cards-section">
          {modules.map((item) => (
            <div key={item.id} className="cinematic-card" onClick={() => navigate(item.path)} style={{ backgroundImage: `url(${item.bgImage})` }}>
              <div className="card-overlay">
                <div className="card-content">
                  <span className="card-sub">{item.sub}</span>
                  <h3 className="card-title">{item.title}</h3>
                  <div className="hover-reveal">
                    <p>{item.desc}</p>
                    <span className="fake-btn">Truy cập <ArrowRight size={14}/></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- LAYER ONBOARDING --- */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-content">
            <div className="icon-badge">
              <User size={40} />
            </div>
            <h2>Chào bạn mới! 👋</h2>
            <p>Chúng mình nên gọi bạn là gì nhỉ?</p>
            
            <input 
              className="onboarding-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Nhập tên hiển thị của bạn..."
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(true)}
              autoFocus
            />

            <button 
              className="btn-next" 
              onClick={() => handleUpdateName(true)}
              disabled={!tempName.trim() || isLoading}
            >
              {isLoading ? "Đang lưu..." : "Tiếp tục vào Dashboard"} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;