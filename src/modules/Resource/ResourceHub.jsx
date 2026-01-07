import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore"; // 👈 Thêm doc, getDoc
import { 
  Folder, FileText, Image as ImageIcon, Download, 
  Search, Users, MessageCircle, Clock, Grid, List,
  CheckCircle, XCircle, HelpCircle
} from "lucide-react";
import "./ResourceHub.scss";

const ResourceHub = () => {
  const { user } = useAuth();
  
  // State
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); 
  const [viewMode, setViewMode] = useState("grid"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userNames, setUserNames] = useState({}); // State lưu tên người dùng để hiển thị (Map: uid -> displayName)

  // 1. Lấy danh sách phòng chat của User
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chat_rooms"), 
      where("members", "array-contains", user.uid), 
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomList);
      if (roomList.length > 0 && !selectedRoom) {
        setSelectedRoom(roomList[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Fetch Tên hiển thị cho các phòng Chat Riêng (Direct)
  useEffect(() => {
    if (!user || rooms.length === 0) return;

    const fetchNames = async () => {
      const missingIds = new Set();
      
      // Lọc ra các ID chưa có tên trong state
      rooms.forEach(room => {
        if (room.type !== 'group') {
          const otherId = room.members.find(id => id !== user.uid);
          if (otherId && !userNames[otherId]) missingIds.add(otherId);
        }
      });

      if (missingIds.size === 0) return;

      // Gọi Firestore lấy tên từng người
      const newNames = {};
      await Promise.all(Array.from(missingIds).map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) {
            newNames[uid] = snap.data().displayName;
          } else {
            newNames[uid] = "Người dùng ẩn";
          }
        } catch (e) {
          console.error("Lỗi lấy tên:", e);
          newNames[uid] = "Lỗi tải tên";
        }
      }));

      // Cập nhật vào state
      setUserNames(prev => ({ ...prev, ...newNames }));
    };

    fetchNames();
  }, [rooms, user, userNames]); // Chạy lại khi danh sách phòng thay đổi

  // 3. Lấy File từ phòng đã chọn
  useEffect(() => {
    if (!selectedRoom) return;
    setIsLoading(true);

    const q = query(
      collection(db, "messages"),
      where("roomId", "==", selectedRoom.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fileMsgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fileUrl) {
          fileMsgs.push({ id: doc.id, ...data });
        }
      });
      setFiles(fileMsgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  // --- LOGIC XÁC ĐỊNH TRẠNG THÁI FILE ---
  const getFileStatus = (file) => {
    if (selectedRoom?.type === 'group') {
      if (file.reviewStatus === 'approved') return 'approved';
      if (file.reviewStatus === 'rejected') return 'rejected';
      return 'pending';
    } else {
      const myStatus = file.personalStatus ? file.personalStatus[user.uid] : null;
      if (myStatus === 'saved') return 'approved';
      if (myStatus === 'hidden') return 'rejected';
      return 'pending';
    }
  };

  // 4.  Lấy tên từ state userNames
  const getRoomName = (room) => {
    if (room.type === 'group') return room.name;
    const otherId = room.members.find(id => id !== user.uid);
    // Nếu đã tải được tên thì hiện tên, chưa thì hiện tạm "Đang tải..." hoặc ID rút gọn
    return userNames[otherId] || `Đang tải... (${otherId?.slice(0, 4)})`;
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = (f.fileName || "File").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || f.fileType === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("vi-VN");
  };

  return (
    <div className="resource-hub-container">
      
      {/* SIDEBAR */}
      <div className="res-sidebar">
        <div className="res-header">
          <h3>🗂️ Kho Tài Liệu</h3>
          <p className="subtitle">Quản lý file theo nhóm</p>
        </div>
        <div className="room-list">
          {rooms.map(room => (
            <div 
              key={room.id} 
              className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setSelectedRoom(room)}
            >
              <div className="icon">
                {room.type === 'group' ? <Users size={18}/> : <MessageCircle size={18}/>}
              </div>
              <div className="info">
                {/* Hiển thị tên đã xử lý */}
                <span className="name">{getRoomName(room)}</span>
                <span className="type">{room.type === 'group' ? 'Nhóm' : 'Cá nhân'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="res-main">
        {selectedRoom ? (
          <>
            <div className="main-toolbar">
              <div className="title-section">
                <h2>{getRoomName(selectedRoom)}</h2>
                <span className="file-count">{files.length} tệp tin</span>
              </div>
              
              <div className="actions-section">
                <div className="search-box">
                  <Search size={16}/>
                  <input 
                    placeholder="Tìm tên file..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="filter-tabs">
                  <button className={activeTab==='all'?'active':''} onClick={()=>setActiveTab('all')}>Tất cả</button>
                  <button className={activeTab==='image'?'active':''} onClick={()=>setActiveTab('image')}>Ảnh</button>
                  <button className={activeTab==='document'?'active':''} onClick={()=>setActiveTab('document')}>Văn bản</button>
                </div>

                <div className="view-toggle">
                  <button className={viewMode==='grid'?'active':''} onClick={()=>setViewMode('grid')}><Grid size={18}/></button>
                  <button className={viewMode==='list'?'active':''} onClick={()=>setViewMode('list')}><List size={18}/></button>
                </div>
              </div>
            </div>

            <div className={`file-content-area ${viewMode}`}>
              {isLoading ? (
                <div className="loading">Đang tải tài liệu...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="empty-state">
                  <Folder size={48} />
                  <p>Không có tài liệu nào trong nhóm này.</p>
                </div>
              ) : (
                filteredFiles.map(file => {
                  const status = getFileStatus(file);

                  return (
                    <div key={file.id} className={`file-card status-${status}`}>
                      <div className={`status-badge ${status}`} title={status === 'approved' ? "Đã lưu" : status === 'rejected' ? "Đã bỏ qua" : "Chưa xử lý"}>
                        {status === 'approved' && <CheckCircle size={16} />}
                        {status === 'rejected' && <XCircle size={16} />}
                        {status === 'pending' && <HelpCircle size={16} />}
                      </div>

                      <div className="file-preview" onClick={() => window.open(file.fileUrl, '_blank')}>
                        {file.fileType === 'image' ? (
                          <img src={file.fileUrl} alt="preview" />
                        ) : (
                          <div className="doc-icon"><FileText size={40}/></div>
                        )}
                      </div>

                      <div className="file-info">
                        <div className="top-row">
                          <span className="file-name" title={file.fileName || "Ảnh"}>
                            {file.fileName || (file.fileType === 'image' ? 'Hình ảnh' : 'Tài liệu')}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="sender">
                             <Clock size={12}/> {formatDate(file.createdAt)}
                          </span>
                          <span className="uploader">bởi {file.displayName}</span>
                        </div>
                      </div>
                      
                      <a href={file.fileUrl} target="_blank" rel="noreferrer" className="btn-download" title="Tải xuống">
                        <Download size={16}/>
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="no-select">Vui lòng chọn một nhóm để xem tài liệu</div>
        )}
      </div>
    </div>
  );
};

export default ResourceHub;