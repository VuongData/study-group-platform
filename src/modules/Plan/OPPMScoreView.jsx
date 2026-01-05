import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown, ChevronUp, Star, Save, MessageSquare, User } from "lucide-react";
import { toast } from "react-toastify";
import "./OPPMScoreView.scss";

const OPPMScoreView = ({ currentRoom }) => {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [reviews, setReviews] = useState([]); // Lưu mảng tất cả review để filter
  const [expandedUser, setExpandedUser] = useState(null);

  // State form đánh giá (cho từng user)
  const [inputScore, setInputScore] = useState(""); // Để trống mặc định
  const [inputComment, setInputComment] = useState("");

  // 1. Fetch Data
  useEffect(() => {
    if (!currentRoom) return;

    // Fetch Tasks (Để tính điểm hệ thống)
    const qTasks = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => d.data()));
    });

    // Fetch Reviews (Lấy tất cả đánh giá trong phòng này)
    const qReviews = query(collection(db, "oppm_reviews"), where("roomId", "==", currentRoom.id));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => d.data()));
    });

    // Fetch Member Info
    const fetchMembers = async () => {
      const promises = currentRoom.members.map(uid => getDoc(doc(db, "users", uid)));
      const snaps = await Promise.all(promises);
      setMembers(snaps.map(s => ({ uid: s.id, ...s.data() })));
    };
    fetchMembers();

    return () => { unsubTasks(); unsubReviews(); };
  }, [currentRoom]);

  // 2. Tính toán điểm
  const calculateSystemScore = (memberName) => {
    const userTasks = tasks.filter(t => t.owner === memberName && t.approvalStatus === 'approved');
    if (userTasks.length === 0) return 0;
    const completed = userTasks.filter(t => t.status === 'done').length;
    return ((completed / userTasks.length) * 10).toFixed(1);
  };

  const calculatePeerScore = (targetUid) => {
    // Lọc tất cả phiếu đánh giá DÀNH CHO targetUid
    const userReviews = reviews.filter(r => r.targetUid === targetUid);
    if (userReviews.length === 0) return 0;

    // Tính trung bình cộng
    const total = userReviews.reduce((sum, r) => sum + Number(r.score), 0);
    return (total / userReviews.length).toFixed(1);
  };

  // 3. Xử lý Lưu đánh giá (Member chấm Member)
  const handleSaveReview = async (targetUid) => {
    if (!inputScore || Number(inputScore) < 0 || Number(inputScore) > 10) {
      return toast.warning("Vui lòng nhập điểm hợp lệ (0-10)!");
    }

    try {
      // ID unique cho mỗi cặp (Người chấm - Người được chấm)
      const reviewId = `${currentRoom.id}_${targetUid}_${user.uid}`;
      
      await setDoc(doc(db, "oppm_reviews", reviewId), {
        roomId: currentRoom.id,
        targetUid: targetUid,       // Người được chấm
        reviewerUid: user.uid,      // Người chấm
        reviewerName: user.displayName,
        score: Number(inputScore),
        comment: inputComment,      // Không bắt buộc
        updatedAt: new Date()
      });
      
      toast.success("Đã gửi đánh giá!");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi lưu.");
    }
  };

  // 4. Mở rộng row để chấm điểm
  const handleExpand = (uid) => {
    if (expandedUser === uid) {
      setExpandedUser(null);
    } else {
      setExpandedUser(uid);
      // Tìm xem MÌNH đã chấm người này chưa để fill vào input
      const myReview = reviews.find(r => r.targetUid === uid && r.reviewerUid === user.uid);
      setInputScore(myReview?.score || "");
      setInputComment(myReview?.comment || "");
    }
  };

  return (
    <div className="oppm-score-view">
      <div className="score-header-guide">
        <h5>📊 Bảng điểm nhóm: {currentRoom.name}</h5>
        <div className="formula">
          <code>(Điểm Hệ Thống × 50%)</code> + <code>(Trung Bình Đánh Giá × 50%)</code> = <strong>TỔNG KẾT</strong>
        </div>
      </div>

      <div className="score-table">
        <div className="table-header">
          <div className="col-name">Thành viên</div>
          <div className="col-sys">🖥️ Hệ Thống</div>
          <div className="col-manual">👥 Đánh Giá</div>
          <div className="col-total">TỔNG</div>
          <div className="col-action"></div>
        </div>

        {members.map(mem => {
          const sysScore = Number(calculateSystemScore(mem.displayName));
          const peerScore = Number(calculatePeerScore(mem.uid));
          const totalScore = (sysScore * 0.5 + peerScore * 0.5).toFixed(1);
          const isExpanded = expandedUser === mem.uid;
          
          // Lấy danh sách comment người này nhận được (để hiển thị nếu thích)
          const receivedComments = reviews.filter(r => r.targetUid === mem.uid && r.comment);

          return (
            <div key={mem.uid} className={`table-row-group ${isExpanded ? 'active' : ''}`}>
              {/* Dòng tóm tắt */}
              <div className="table-row-summary" onClick={() => handleExpand(mem.uid)}>
                <div className="col-name">
                   <div className="avatar">{mem.displayName?.charAt(0)}</div>
                   <div>
                     <strong>{mem.displayName} {mem.uid === user.uid && "(Bạn)"}</strong>
                     <span className="role">{mem.uid === currentRoom.createdBy ? 'Trưởng nhóm' : 'Thành viên'}</span>
                   </div>
                </div>
                <div className="col-sys highlight-blue">{sysScore}</div>
                <div className="col-manual">
                  {peerScore} <span className="sub-text">/10</span>
                </div>
                <div className="col-total highlight-green">{totalScore}</div>
                <div className="col-action">
                  {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </div>
              </div>

              {/* Form chấm điểm (Chỉ hiện khi mở rộng) */}
              {isExpanded && (
                <div className="row-detail-panel">
                  {mem.uid === user.uid ? (
                    <div className="self-review-notice">
                      <User size={20} />
                      <span>Đây là điểm tổng kết của bạn. Bạn không thể tự chấm điểm chính mình.</span>
                    </div>
                  ) : (
                    <div className="peer-review-form">
                      <h6>✍️ Đánh giá {mem.displayName}:</h6>
                      <div className="form-row">
                        <div className="input-wrap">
                          <label className="required"><Star size={14}/> Điểm (0-10)</label>
                          <input 
                            type="number" min="0" max="10" 
                            placeholder="vd: 8.5"
                            value={inputScore}
                            onChange={e => setInputScore(e.target.value)}
                          />
                        </div>
                        <div className="input-wrap grow">
                          <label><MessageSquare size={14}/> Nhận xét (Tùy chọn)</label>
                          <input 
                            type="text"
                            placeholder="Nhập lời nhắn..."
                            value={inputComment}
                            onChange={e => setInputComment(e.target.value)}
                          />
                        </div>
                        <button onClick={() => handleSaveReview(mem.uid)}>
                          <Save size={16}/> Lưu
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hiển thị các nhận xét đã nhận (Optional - Tùy bạn muốn hiện hay không) */}
                  {receivedComments.length > 0 && (
                    <div className="comments-received">
                      <h6>💬 Nhận xét từ thành viên:</h6>
                      <ul>
                        {receivedComments.map((c, idx) => (
                           <li key={idx}>"{c.comment}" <span className="reviewer">- Ẩn danh</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OPPMScoreView;