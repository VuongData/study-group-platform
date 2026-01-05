import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Edit2, Check, X, User } from "lucide-react"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  
  // --- STATE MỚI ---
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nameInputRef = useRef(null);

  // 1. KIỂM TRA LẦN ĐẦU ĐĂNG NHẬP (Check isSetup)
  useEffect(() => {
    if (!user) return;
    
    const checkUserSetup = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Nếu chưa có trường isSetup hoặc chưa có tên -> Hiện Onboarding
          if (!data.isSetup || !user.displayName) {
            setTempName(user.displayName || ""); // Lấy tên tạm nếu có (từ Google)
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

  // 2. HÀM CẬP NHẬT TÊN (Dùng chung cho cả Onboarding và Edit trên Dashboard)
  const handleUpdateName = async (isOnboardingFlow = false) => {
    if (!tempName.trim()) return toast.warning("Tên không được để trống!");
    
    setIsLoading(true);
    try {
      // A. Cập nhật trong Firebase Auth (Để hiện ngay trên Chat, Header)
      await updateProfile(auth.currentUser, { displayName: tempName });
      
      // B. Cập nhật trong Firestore Users (Để đồng bộ OPPM, Tài liệu, Search)
      const userRef = doc(db, "users", user.uid);
      
      const updateData = { displayName: tempName };
      if (isOnboardingFlow) {
        updateData.isSetup = true; // Đánh dấu đã setup xong
      }

      await updateDoc(userRef, updateData);
      
      // C. Update Local State & UI
      if (isOnboardingFlow) {
        setShowOnboarding(false);
        toast.success(`Chào mừng ${tempName} đến với không gian làm việc! 🚀`);
      } else {
        setIsEditingName(false);
        toast.success("Đã đổi tên thành công!");
      }

      // Reload nhẹ để UI cập nhật tên mới từ AuthContext (nếu cần)
      window.location.reload(); 

    } catch (error) {
      console.error(error);
      toast.error("Lỗi cập nhật tên.");
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
            
            {/* --- KHU VỰC TÊN NGƯỜI DÙNG (CÓ THỂ SỬA) --- */}
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
                  {user?.displayName || "Member"}
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

      {/* --- LAYER ONBOARDING (LỚP PHỦ NGƯỜI MỚI) --- */}
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