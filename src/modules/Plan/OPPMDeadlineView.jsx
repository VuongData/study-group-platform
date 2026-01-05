import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Check, X, AlertOctagon, CheckCircle, Circle, Hourglass } from "lucide-react";
import { toast } from "react-toastify";
import "./OPPMDeadlineView.scss";

const OPPMDeadlineView = ({ currentRoom }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!currentRoom?.id) return;
    const q = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // Duyệt task (Chỉ owner)
  const handleApproval = async (taskId, isApproved) => {
    try {
      if (isApproved) {
        await updateDoc(doc(db, "oppm_tasks", taskId), { approvalStatus: "approved" });
        toast.success("Đã nhận việc!");
      } else {
        if(confirm("Từ chối task này?")) await deleteDoc(doc(db, "oppm_tasks", taskId));
      }
    } catch (err) { toast.error("Lỗi cập nhật"); }
  };

  // 👇 LOGIC MỚI: Toggle Status (Chỉ owner mới được đổi trạng thái Done/Pending)
  const toggleStatus = async (task) => {
    // 1. Kiểm tra quyền
    if (task.owner !== user.displayName) {
      toast.warning("Bạn không phải người phụ trách task này!");
      return;
    }

    // 2. Cập nhật
    try {
      await updateDoc(doc(db, "oppm_tasks", task.id), { 
        status: task.status === 'done' ? 'pending' : 'done' 
      });
      toast.success(task.status === 'done' ? "Đã mở lại task" : "Đã hoàn thành!");
    } catch (error) {
      toast.error("Lỗi cập nhật");
    }
  };

  const pendingTasks = tasks.filter(t => t.approvalStatus === 'pending');
  const approvedTasks = tasks.filter(t => t.approvalStatus === 'approved');

  // Group tasks
  const groupTasks = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const groups = { overdue: [], today: [], upcoming: [], done: [] };
    approvedTasks.forEach(task => {
      if (task.status === 'done') { groups.done.push(task); return; }
      const d = task.deadline?.seconds ? new Date(task.deadline.seconds * 1000) : new Date();
      d.setHours(0,0,0,0);
      if (d < today) groups.overdue.push(task);
      else if (d.getTime() === today.getTime()) groups.today.push(task);
      else groups.upcoming.push(task);
    });
    return groups;
  };
  const grouped = groupTasks();

  return (
    <div className="deadline-view-container">
      {/* Pending Approval Section (Giữ nguyên) */}
      {pendingTasks.length > 0 && (
        <div className="approval-section">
          <h4><AlertOctagon size={20}/> Cần xác nhận ({pendingTasks.length})</h4>
          <div className="task-grid">
            {pendingTasks.map(t => {
              const isMyTask = user.displayName === t.owner;
              return (
                <div key={t.id} className={`approval-card ${!isMyTask ? 'readonly' : ''}`}>
                  <div className="info">
                    <strong>{t.title}</strong>
                    <span className="assignee-badge">👤 {t.owner}</span>
                    <span>📅 {t.deadline?.seconds ? new Date(t.deadline.seconds*1000).toLocaleDateString('vi-VN') : 'Chưa set'}</span>
                  </div>
                  <div className="actions">
                    {isMyTask ? (
                      <>
                        <button className="btn-reject" onClick={() => handleApproval(t.id, false)}><X size={16}/> Từ chối</button>
                        <button className="btn-approve" onClick={() => handleApproval(t.id, true)}><Check size={16}/> Nhận việc</button>
                      </>
                    ) : (
                      <div className="waiting-status"><Hourglass size={14} className="spin-slow"/><span>Đợi {t.owner}...</span></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved Lists */}
      <div className="approved-lists">
         {/* Truyền thêm user vào TaskItem để kiểm tra quyền hiển thị cursor */}
         {grouped.overdue.length > 0 && <div className="list-group danger"><h5>Quá hạn</h5>{grouped.overdue.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus} currentUser={user}/>)}</div>}
         {grouped.today.length > 0 && <div className="list-group warning"><h5>Hôm nay</h5>{grouped.today.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus} currentUser={user}/>)}</div>}
         {grouped.upcoming.length > 0 && <div className="list-group primary"><h5>Sắp tới</h5>{grouped.upcoming.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus} currentUser={user}/>)}</div>}
         {grouped.done.length > 0 && <div className="list-group success"><h5>Đã xong</h5>{grouped.done.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus} currentUser={user}/>)}</div>}
      </div>
    </div>
  );
};

// Component con hiển thị Task
const TaskItem = ({t, toggle, currentUser}) => {
  // Kiểm tra quyền sở hữu để chỉnh style
  const canEdit = currentUser.displayName === t.owner;

  return (
    <div className={`task-card-simple ${!canEdit ? 'disabled-card' : ''}`}>
       <button 
         onClick={()=>toggle(t)} 
         className={`${t.status} ${!canEdit ? 'not-allowed' : ''}`}
         title={canEdit ? "Đổi trạng thái" : "Chỉ người phụ trách mới được đổi"}
       >
         {t.status==='done'?<CheckCircle size={18}/>:<Circle size={18}/>}
       </button>
       <div className="t-content">
         <span className="t-title">{t.title}</span>
         <span className="t-owner">{t.owner}</span>
       </div>
    </div>
  );
};

export default OPPMDeadlineView;