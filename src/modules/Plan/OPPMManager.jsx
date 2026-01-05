import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, getDoc, doc 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { Plus, List, Grid, Award, Users } from "lucide-react";

import OPPMDeadlineView from "./OPPMDeadlineView";
import OPPMMatrixView from "./OPPMMatrixView";
import OPPMScoreView from "./OPPMScoreView";

import "./OPPMManager.scss";

const OPPMManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("matrix");
  
  const [rooms, setRooms] = useState([]); 
  const [selectedRoom, setSelectedRoom] = useState(null); 
  const [roomMembers, setRoomMembers] = useState([]); 

  // State form giao việc
  const [taskTitle, setTaskTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  
  // 👇 THAY ĐỔI: Dùng Start/End Date thay vì 1 deadline
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [loading, setLoading] = useState(false);

  // ... (Giữ nguyên useEffect fetch Rooms và Members như cũ) ...
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chat_rooms"), where("members", "array-contains", user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(list);
      if (list.length > 0 && !selectedRoom) setSelectedRoom(list[0]);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedRoom?.members) { setRoomMembers([]); return; }
      try {
        const promises = selectedRoom.members.map(uid => getDoc(doc(db, "users", uid)));
        const snaps = await Promise.all(promises);
        setRoomMembers(snaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : null).filter(i=>i));
      } catch (e) { console.error(e); }
    };
    fetchMembers(); setAssignee(""); 
  }, [selectedRoom]);

  // Hàm Giao Việc Mới
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return toast.warning("Vui lòng chọn nhóm!");
    if (!taskTitle.trim() || !assignee) return toast.warning("Thiếu thông tin!");
    if (!startDate || !endDate) return toast.warning("Vui lòng nhập ngày bắt đầu và kết thúc!");
    
    // Validate ngày
    if (new Date(startDate) > new Date(endDate)) return toast.warning("Ngày kết thúc phải sau ngày bắt đầu!");

    setLoading(true);
    try {
      await addDoc(collection(db, "oppm_tasks"), {
        roomId: selectedRoom.id,
        title: taskTitle,
        owner: assignee,
        
        // 👇 LƯU DATA MỚI
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        
        status: "pending", // done | pending
        approvalStatus: "pending",
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      
      toast.success("Đã tạo công việc!");
      setTaskTitle(""); setAssignee(""); setStartDate(""); setEndDate("");
    } catch (error) {
      console.error(error); toast.error("Lỗi tạo việc");
    } finally { setLoading(false); }
  };

  return (
    <div className="oppm-manager">
      <div className="manager-header">
        <div className="room-selector">
          <label><Users size={16}/> Chọn Nhóm:</label>
          <select value={selectedRoom?.id || ""} onChange={(e) => setSelectedRoom(rooms.find(r => r.id === e.target.value))}>
            {rooms.length === 0 && <option value="">Chưa có nhóm nào</option>}
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="tab-buttons">
          <button className={activeTab === 'deadline' ? 'active' : ''} onClick={() => setActiveTab('deadline')}><List size={18} /> Deadline</button>
          <button className={activeTab === 'matrix' ? 'active' : ''} onClick={() => setActiveTab('matrix')}><Grid size={18} /> Ma Trận</button>
          <button className={activeTab === 'score' ? 'active' : ''} onClick={() => setActiveTab('score')}><Award size={18} /> Bảng Điểm</button>
        </div>
      </div>

      <div className="shared-form-container">
        <form className="create-form" onSubmit={handleCreateTask}>
          <div className="input-group" style={{flex: 2}}>
            <label>Tên công việc</label>
            <input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Nhập tên task..."/>
          </div>
          <div className="input-group" style={{flex: 1}}>
            <label>Người phụ trách</label>
            <select value={assignee} onChange={e=>setAssignee(e.target.value)}>
              <option value="">-- Chọn --</option>
              {roomMembers.map(m => <option key={m.uid} value={m.displayName}>{m.displayName}</option>)}
            </select>
          </div>
          
          {/* 👇 2 INPUT NGÀY THÁNG */}
          <div className="input-group">
            <label>Bắt đầu</label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
          </div>
          <div className="input-group">
            <label>Kết thúc</label>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "..." : <><Plus size={18}/> Thêm</>}
          </button>
        </form>
      </div>

      <div className="tab-content">
        {selectedRoom ? (
          <>
            {activeTab === 'deadline' && <OPPMDeadlineView currentRoom={selectedRoom} />}
            {activeTab === 'matrix' && <OPPMMatrixView currentRoom={selectedRoom} />}
            {activeTab === 'score' && <OPPMScoreView currentRoom={selectedRoom} />}
          </>
        ) : <div className="no-room"><p>Chọn nhóm để bắt đầu!</p></div>}
      </div>
    </div>
  );
};

export default OPPMManager;