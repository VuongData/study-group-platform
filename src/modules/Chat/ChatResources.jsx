import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { FileText, Image as ImageIcon, Check, X, Download, Archive, Video } from "lucide-react";
import { toast } from "react-toastify";
import "./ChatResources.scss";

// Nhận thêm prop roomType
const ChatResources = ({ roomId, isGroupAdmin, roomType }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [mediaMessages, setMediaMessages] = useState([]);
  const [repoDocs, setRepoDocs] = useState([]);

  // =========================================================
  // 1. LOGIC FETCH & LỌC DANH SÁCH CHỜ (PENDING)
  // =========================================================
  useEffect(() => {
    // Query cơ bản: Lấy tin nhắn trong phòng, sắp xếp mới nhất
    const q = query(
      collection(db, "messages"),
      where("roomId", "==", roomId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 👇 LOGIC LỌC CLIENT-SIDE (QUAN TRỌNG)
      const pendingFiles = msgs.filter(m => {
        // 1. Phải là file phương tiện
        const isMedia = ['image', 'document', 'video'].includes(m.fileType);
        if (!isMedia) return false;

        // 2. Kiểm tra trạng thái dựa trên loại phòng
        if (roomType === 'group') {
          // --- LOGIC NHÓM: Dựa vào reviewStatus chung ---
          // Chỉ hiện nếu chưa có status (chưa duyệt/từ chối)
          return !m.reviewStatus || m.reviewStatus === 'pending';
        } else {
          // --- LOGIC CHAT RIÊNG: Dựa vào personalStatus của chính mình ---
          // Kiểm tra xem user hiện tại đã thao tác với tin nhắn này chưa
          const myStatus = m.personalStatus ? m.personalStatus[user.uid] : null;
          // Chỉ hiện nếu mình chưa thao tác gì (null hoặc undefined)
          return !myStatus;
        }
      });

      setMediaMessages(pendingFiles);
    });
    return () => unsubscribe();
  }, [roomId, roomType, user.uid]);

  // =========================================================
  // 2. LOGIC FETCH KHO TÀI LIỆU (REPO)
  // =========================================================
  useEffect(() => {
    let q;
    
    if (roomType === 'group') {
      // Nhóm: Lấy tất cả tài liệu của phòng (Shared)
      q = query(
        collection(db, "group_documents"),
        where("roomId", "==", roomId),
        orderBy("savedAt", "desc")
      );
    } else {
      // Chat riêng: Chỉ lấy tài liệu MÀ MÌNH ĐÃ LƯU (Private)
      // ⚠️ Lưu ý: Cần tạo Index cho query này: roomId + savedByUid + savedAt
      q = query(
        collection(db, "group_documents"),
        where("roomId", "==", roomId),
        where("savedByUid", "==", user.uid), // 👈 Chỉ lấy của mình
        orderBy("savedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRepoDocs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [roomId, roomType, user.uid]);

  // =========================================================
  // 3. ACTIONS (HỮU ÍCH / KHÔNG HỮU ÍCH)
  // =========================================================

  const markAsUseful = async (msg) => {
    try {
      // A. XỬ LÝ CHO NHÓM (Cần quyền Admin)
      if (roomType === 'group') {
        if (!isGroupAdmin) return toast.error("Chỉ nhóm trưởng mới được duyệt file!");
        
        // 1. Lưu vào kho chung
        await addDoc(collection(db, "group_documents"), {
          roomId: roomId,
          fileName: msg.fileName || "File không tên",
          fileUrl: msg.fileUrl || msg.text,
          fileType: msg.fileType,
          savedBy: user.displayName,
          savedByUid: user.uid, // Lưu thêm UID để dễ trace
          savedAt: serverTimestamp(),
          originalMessageId: msg.id
        });

        // 2. Cập nhật status chung (Biến mất khỏi list chờ của TẤT CẢ mọi người)
        await updateDoc(doc(db, "messages", msg.id), {
          reviewStatus: 'approved'
        });
        toast.success("Đã lưu vào kho chung của nhóm!");
      } 
      
      // B. XỬ LÝ CHO CHAT RIÊNG (Độc lập)
      else {
        // 1. Lưu vào kho (nhưng đánh dấu là của riêng user này)
        await addDoc(collection(db, "group_documents"), {
          roomId: roomId,
          fileName: msg.fileName || "File không tên",
          fileUrl: msg.fileUrl || msg.text,
          fileType: msg.fileType,
          savedBy: user.displayName,
          savedByUid: user.uid, // 👈 Quan trọng: Đánh dấu chủ sở hữu
          savedAt: serverTimestamp(),
          originalMessageId: msg.id
        });

        // 2. Cập nhật status CÁ NHÂN (Chỉ biến mất khỏi list chờ của MÌNH)
        // Dùng Notation "personalStatus.UID" để update nested object trong Firestore
        await updateDoc(doc(db, "messages", msg.id), {
          [`personalStatus.${user.uid}`]: 'saved' 
        });
        toast.success("Đã lưu vào kho cá nhân!");
      }

    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi lưu file");
    }
  };

  const markAsUseless = async (msg) => {
    try {
      if (roomType === 'group') {
        if (!isGroupAdmin) return toast.error("Chỉ nhóm trưởng mới được quyền này!");
        // Update chung -> Ẩn với tất cả
        await updateDoc(doc(db, "messages", msg.id), {
          reviewStatus: 'rejected'
        });
      } else {
        // Update riêng -> Chỉ ẩn với mình
        await updateDoc(doc(db, "messages", msg.id), {
          [`personalStatus.${user.uid}`]: 'hidden'
        });
        toast.info("Đã bỏ qua file này.");
      }
    } catch (error) { console.error(error); }
  };

  const getFileIcon = (type) => {
    if (type === 'image') return <ImageIcon size={20} color="#3b82f6"/>;
    if (type === 'video') return <Video size={20} color="#ef4444"/>;
    return <FileText size={20} color="#eab308"/>;
  };

  return (
    <div className="chat-resources-panel">
      <div className="res-header">
        <h3>Kho {roomType === 'group' ? 'Nhóm' : 'Cá Nhân'}</h3>
        <div className="res-tabs">
          <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
            Chờ xử lý ({mediaMessages.length})
          </button>
          <button className={activeTab === 'repo' ? 'active' : ''} onClick={() => setActiveTab('repo')}>
            Đã lưu 🏆
          </button>
        </div>
      </div>

      <div className="res-body">
        {/* VIEW 1: CHỜ DUYỆT */}
        {activeTab === 'pending' && (
          <div className="file-list">
            {mediaMessages.length === 0 ? <p className="empty">Không có file mới.</p> : mediaMessages.map(msg => (
              <div key={msg.id} className="file-item">
                <div className="file-info">
                  <div className="icon-box">{getFileIcon(msg.fileType)}</div>
                  <div className="meta">
                    <a href={msg.fileUrl || msg.text} target="_blank" rel="noreferrer" className="name">
                      {msg.fileName || "Xem chi tiết"}
                    </a>
                    <span className="sender">{msg.displayName}</span>
                  </div>
                </div>
                
                {/* Nút hành động */}
                <div className="actions">
                  {/* Nếu là Group thì cần check Admin, nếu Direct thì luôn hiện */}
                  {(roomType !== 'group' || isGroupAdmin) && (
                    <>
                      <button className="btn-useful" onClick={() => markAsUseful(msg)} title="Hữu ích">
                        <Check size={16}/>
                      </button>
                      <button className="btn-useless" onClick={() => markAsUseless(msg)} title="Không hữu ích">
                        <X size={16}/>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: KHO TÀI LIỆU */}
        {activeTab === 'repo' && (
          <div className="file-list repo-mode">
            {repoDocs.length === 0 ? <p className="empty">Chưa có tài liệu.</p> : repoDocs.map(doc => (
              <div key={doc.id} className="file-item saved">
                <div className="file-info">
                  <div className="icon-box saved"><Archive size={18}/></div>
                  <div className="meta">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="name">
                      {doc.fileName}
                    </a>
                    <span className="sender">Lưu bởi: {doc.savedBy}</span>
                  </div>
                </div>
                <a href={doc.fileUrl} download target="_blank" rel="noreferrer" className="btn-download">
                  <Download size={16}/>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatResources;