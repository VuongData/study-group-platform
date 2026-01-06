import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Folder, FileText, Image as ImageIcon, Download, 
  Search, Users, MessageCircle, Clock, Grid, List,
  CheckCircle, XCircle, HelpCircle
} from "lucide-react";
import "./ResourceHub.scss";

const ResourceHub = () => {
  const { user } = useAuth();
  
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); 
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lấy danh sách phòng (Giữ nguyên)
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

  // 2. Lấy File (Giữ nguyên logic query messages)
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

  // 👇 MỚI: Hàm xác định trạng thái file (Hữu ích / Rác / Chờ)
  const getFileStatus = (file) => {
    // A. Nếu là nhóm -> Dùng reviewStatus chung
    if (selectedRoom.type === 'group') {
      if (file.reviewStatus === 'approved') return 'approved';
      if (file.reviewStatus === 'rejected') return 'rejected';
      return 'pending';
    } 
    // B. Nếu là chat riêng -> Dùng personalStatus của mình
    else {
      const myStatus = file.personalStatus ? file.personalStatus[user.uid] : null;
      if (myStatus === 'saved') return 'approved';
      if (myStatus === 'hidden') return 'rejected';
      return 'pending';
    }
  };

  const getRoomName = (room) => {
    if (room.type === 'group') return room.name;
    const otherId = room.members.find(id => id !== user.uid);
    return `Chat riêng (${otherId?.slice(0, 5)}...)`;
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
                <span className="name">{getRoomName(room)}</span>
                <span className="type">{room.type === 'group' ? 'Nhóm' : 'Cá nhân'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  <input placeholder="Tìm tên file..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
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
                <div className="empty-state"><Folder size={48} /><p>Không có tài liệu nào.</p></div>
              ) : (
                filteredFiles.map(file => {
                  // 👇 Lấy trạng thái file
                  const status = getFileStatus(file); 

                  return (
                    <div key={file.id} className={`file-card status-${status}`}> {/* Thêm class status để CSS mờ đi nếu rejected */}
                      
                      {/* 👇 NHÃN TRẠNG THÁI (BADGE) */}
                      <div className={`status-badge ${status}`} title={status === 'approved' ? "Đã lưu" : status === 'rejected' ? "Đã bỏ qua" : "Chưa xử lý"}>
                        {status === 'approved' && <CheckCircle size={16} />}
                        {status === 'rejected' && <XCircle size={16} />}
                        {status === 'pending' && <HelpCircle size={16} />}
                      </div>

                      <div className="file-preview" onClick={() => window.open(file.fileUrl, '_blank')}>
                        {file.fileType === 'image' ? <img src={file.fileUrl} alt="preview" /> : <div className="doc-icon"><FileText size={40}/></div>}
                      </div>

                      <div className="file-info">
                        <div className="top-row">
                          <span className="file-name" title={file.fileName}>{file.fileName || "File không tên"}</span>
                        </div>
                        <div className="meta-row">
                          <span className="sender"><Clock size={12}/> {formatDate(file.createdAt)}</span>
                          <span className="uploader">bởi {file.displayName}</span>
                        </div>
                      </div>
                      
                      <a href={file.fileUrl} target="_blank" rel="noreferrer" className="btn-download"><Download size={16}/></a>
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