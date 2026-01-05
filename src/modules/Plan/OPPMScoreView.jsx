import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, where, getDoc, doc } from "firebase/firestore";
import { Printer, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import "./OPPMScoreView.scss"; // Dùng lại CSS in ấn của bài trước

const OPPMScoreView = ({ currentRoom }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tasks, setTasks] = useState([]); // Dùng để tính điểm hệ thống
  const [expandedRows, setExpandedRows] = useState({});
  const [newReview, setNewReview] = useState({ score: 0, comment: "", targetId: "" });

  // 1. Fetch Task để tính điểm hệ thống
  useEffect(() => {
    if (!currentRoom?.id) return;
    const q = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => d.data()));
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // 2. Fetch Members & Reviews
  useEffect(() => {
    if (!currentRoom?.members) return;

    // Fetch Reviews
    const qReview = query(collection(db, "peer_reviews"), where("roomId", "==", currentRoom.id));
    const unsubReview = onSnapshot(qReview, (snap) => {
      setReviews(snap.docs.map(d => d.data()));
    });

    // Fetch User Info
    const fetchUsers = async () => {
      const promises = currentRoom.members.map(async (uid) => {
        const snap = await getDoc(doc(db, "users", uid));
        return { id: uid, ...(snap.data() || { displayName: "User" }) };
      });
      const res = await Promise.all(promises);
      setMembers(res);
    };
    fetchUsers();

    return () => unsubReview();
  }, [currentRoom]);

  // HÀM TÍNH ĐIỂM HỆ THỐNG (Tự động)
  const calculateSystemScore = (userName) => {
    // Tìm các task mà người này phụ trách (owner trùng tên hiển thị)
    // Lưu ý: Logic này yêu cầu tên nhập ở OPPM phải khớp display name. 
    // Nếu muốn chính xác tuyệt đối thì nên lưu uid vào task owner.
    const myTasks = tasks.filter(t => t.owner?.toLowerCase() === userName?.toLowerCase());
    
    if (myTasks.length === 0) return 5; // Mặc định 5 điểm nếu chưa có việc
    
    const doneCount = myTasks.filter(t => t.status === 'done').length;
    // Công thức: Tỷ lệ hoàn thành * 10
    const score = (doneCount / myTasks.length) * 10;
    return parseFloat(score.toFixed(1));
  };

  const getPeerScore = (targetId) => {
    const targetReviews = reviews.filter(r => r.targetId === targetId);
    if (targetReviews.length === 0) return 0;
    const sum = targetReviews.reduce((acc, r) => acc + Number(r.score), 0);
    return (sum / targetReviews.length).toFixed(1);
  };

  const handleSubmitReview = async (targetId) => {
    if (!newReview.score) return toast.warning("Chưa nhập điểm!");
    await addDoc(collection(db, "peer_reviews"), {
      roomId: currentRoom.id, targetId, 
      reviewerName: user.displayName, reviewerId: user.uid,
      score: newReview.score, comment: newReview.comment,
      createdAt: serverTimestamp()
    });
    toast.success("Đã lưu!");
    setNewReview({ score: 0, comment: "", targetId: "" });
  };

  return (
    <div className="score-view-container">
      {/* HEADER */}
      <div className="score-header no-print">
        <div className="formula-box">
          <h4>📊 Bảng điểm nhóm: {currentRoom?.name}</h4>
          <p>
            <span className="math">(Điểm Hệ Thống × 50%)</span> + 
            <span className="math">(Điểm Đánh Giá × 50%)</span> = 
            <strong> TỔNG KẾT</strong>
          </p>
        </div>
        <button className="btn-print" onClick={() => window.print()}>
          <Printer size={18}/> In Bảng Điểm
        </button>
      </div>

      {/* TABLE */}
      <div className="score-table-wrapper">
        <table className="score-table">
          <thead>
            <tr>
              <th className="col-name">Thành viên</th>
              <th className="col-sys">🖥️ Hệ Thống (50%)</th>
              <th className="col-peer">👥 Đánh Giá (50%)</th>
              <th className="col-total">TỔNG</th>
              <th className="col-action no-print">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {members.map(mem => {
              const sysScore = calculateSystemScore(mem.displayName);
              const peerScore = getPeerScore(mem.id);
              const total = (sysScore * 0.5 + peerScore * 0.5).toFixed(1);
              const isExpanded = expandedRows[mem.id];
              const memReviews = reviews.filter(r => r.targetId === mem.id);

              return (
                <>
                  <tr key={mem.id} className="main-row" onClick={() => setExpandedRows(p => ({...p, [mem.id]: !p[mem.id]}))}>
                    <td className="cell-name">
                      <div className="user-info">
                        <div className="avatar">{mem.displayName?.charAt(0)}</div>
                        <div>
                          <strong>{mem.displayName}</strong>
                          <span className="role">{mem.id === currentRoom.createdBy ? "Trưởng nhóm" : "Thành viên"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-score highlight">{sysScore}</td>
                    <td className="cell-score">{peerScore}</td>
                    <td className="cell-total">{total}</td>
                    <td className="cell-action no-print">
                      {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </td>
                  </tr>
                  
                  {/* DETAIL ROW - class "print-always-show" quan trọng để in ấn */}
                  <tr className={`detail-row ${isExpanded ? 'expanded' : ''} print-always-show`}>
                    <td colSpan="5">
                      <div className="review-container">
                        <div className="review-list">
                          <h5>📝 Nhận xét:</h5>
                          {memReviews.length === 0 ? <p className="empty">Chưa có đánh giá.</p> : (
                            <div className="review-grid">
                              {memReviews.map((r, i) => (
                                <div key={i} className="review-item">
                                  <div className="rev-header">
                                    <strong>{r.reviewerName}</strong>
                                    <span className="score-badge">{r.score}/10</span>
                                  </div>
                                  <p>"{r.comment}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {mem.id !== user.uid && (
                          <div className="review-form no-print">
                             <h5>✍️ Đánh giá {mem.displayName}:</h5>
                             <div className="input-row">
                               <input type="number" min="0" max="10" placeholder="Điểm*" 
                                 onChange={e => setNewReview({...newReview, score: e.target.value})}/>
                               <input type="text" placeholder="Nhận xét..." 
                                 onChange={e => setNewReview({...newReview, comment: e.target.value})}/>
                               <button onClick={() => handleSubmitReview(mem.id)}><Save size={16}/> Lưu</button>
                             </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer in ấn */}
      <div className="print-footer only-print">
        <p>Ngày xuất báo cáo: {new Date().toLocaleDateString()}</p>
        <div className="signatures">
           <div>Sinh viên lập bảng</div>
           <div>Giảng viên xác nhận</div>
        </div>
      </div>
    </div>
  );
};

export default OPPMScoreView;