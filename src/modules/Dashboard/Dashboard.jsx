import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight } from "lucide-react"; 
import "./Dashboard.scss";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Cấu hình danh sách module để dễ quản lý & render
  const modules = [
    {
      id: 'chat',
      title: "THẢO LUẬN",
      sub: "Chat Room",
      desc: "Trao đổi nhanh, chém gió dự án.",
      path: "/chat",
      // Ảnh nền cho card Chat (Vibe công nghệ/kết nối)
      bgImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: 'oppm',
      title: "KẾ HOẠCH",
      sub: "OPPM Board",
      desc: "Theo dõi tiến độ & deadline.",
      path: "/oppm",
      // Ảnh nền cho card OPPM (Vibe làm việc/giấy tờ)
      bgImage: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: 'resources',
      title: "TÀI NGUYÊN",
      sub: "Documents",
      desc: "Kho lưu trữ tài liệu chung.",
      path: "/resources",
      // Ảnh nền cho card Tài liệu (Vibe thư viện/sách)
      bgImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=600&auto=format&fit=crop"
    }
  ];

  return (
    <div className="dashboard-cinematic">
      {/* Background mờ phía sau toàn màn hình */}
      <div className="bg-overlay"></div>

      <div className="content-wrapper">
        {/* Header */}
        <header className="hero-header">
          <div className="welcome-block">
            <span className="sub-greeting">WELCOME BACK</span>
            <h1 className="user-name">{user?.displayName || "Member"}</h1>
            <p className="quote">"Sẵn sàng bứt phá cho đồ án này chưa?"</p>
          </div>
          
          <button onClick={handleLogout} className="btn-logout-minimal">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </header>

        {/* Card Slider Section */}
        <div className="cards-section">
          {modules.map((item) => (
            <div 
              key={item.id} 
              className="cinematic-card" 
              onClick={() => navigate(item.path)}
              style={{ backgroundImage: `url(${item.bgImage})` }}
            >
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
    </div>
  );
};

export default Dashboard;