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
  const [reviews, setReviews] = useState([]); 
  const [expandedUser, setExpandedUser] = useState(null);

  // State form nhập liệu
  const [inputScore, setInputScore] = useState(""); 
  const [inputComment, setInputComment] = useState("");

  // 1. Fetch Data
  useEffect(() => {
    if (!currentRoom) return;

    // Fetch Tasks
    const qTasks = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => d.data()));
    });

    // Fetch Reviews
    const qReviews = query(collection(db, "oppm_reviews"), where("roomId", "==", currentRoom.id));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => d.data()));
    });

    // Fetch Members
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
    const userReviews = reviews.filter(r => r.targetUid === targetUid);
    if (userReviews.length === 0) return 0;
    const total = userReviews.reduce((sum, r) => sum + Number(r.score), 0);
    return (total / userReviews.length).toFixed(1);
  };

  // 3. Xử lý Lưu đánh giá (FIX LỖI 9,1 Ở ĐÂY)
  const handleSaveReview = async (targetUid) => {
    // 👇 Bước 1: Thay dấu phẩy thành dấu chấm
    let formattedScore = inputScore.toString().replace(',', '.');
    const scoreNum = Number(formattedScore);

    // 👇 Bước 2: Kiểm tra hợp lệ
    if (inputScore === "" || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      return toast.warning("Vui lòng nhập điểm hợp lệ (0-10)!");
    }

    try {
      const reviewId = `${currentRoom.id}_${targetUid}_${user.uid}`;
      
      await setDoc(doc(db, "oppm_reviews", reviewId), {
        roomId: currentRoom.id,
        targetUid: targetUid,
        reviewerUid: user.uid,
        reviewerName: user.displayName,
        score: scoreNum, // Lưu số đã convert (ví dụ 9.1)
        comment: inputComment,
        updatedAt: new Date()
      });
      
      toast.success("Đã gửi đánh giá!");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi lưu.");
    }
  };

  const handleExpand = (uid) => {
    if (expandedUser === uid) {
      setExpandedUser(null);
    } else {
      setExpandedUser(uid);
      const myReview = reviews.find(r => r.targetUid === uid && r.reviewerUid === user.uid);
      // Hiển thị lại điểm cũ (chuyển dấu chấm thành phẩy cho thân thiện nếu thích)
      setInputScore(myReview?.score?.toString() || "");
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
          const receivedComments = reviews.filter(r => r.targetUid === mem.uid && r.comment);

          return (
            <div key={mem.uid} className={`table-row-group ${isExpanded ? 'active' : ''}`}>
              <div className="table-row-summary" onClick={() => handleExpand(mem.uid)}>
                <div className="col-name">
                   <div className="avatar">{mem.displayName?.charAt(0)}</div>
                   <div>
                     <strong>{mem.displayName} {mem.uid === user.uid && "(Bạn)"}</strong>
                     <span className="role">{mem.uid === currentRoom.createdBy ? 'Trưởng nhóm' : 'Thành viên'}</span>
                   </div>
                </div>
                <div className="col-sys highlight-blue">{sysScore}</div>
                <div className="col-manual">{peerScore} <span className="sub-text">/10</span></div>
                <div className="col-total highlight-green">{totalScore}</div>
                <div className="col-action">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
              </div>

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
                            type="text" // Chuyển type="number" thành "text" để nhập dấu phẩy thoải mái
                            placeholder="vd: 8,5"
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