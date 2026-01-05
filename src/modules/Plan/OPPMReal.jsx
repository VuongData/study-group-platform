// src/modules/Plan/OPPMReal.jsx
import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, deleteDoc 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Plus, CheckCircle, Trash2 } from "lucide-react";
import "./OPPMReal.scss";

const TOTAL_WEEKS = 15;

const OPPMReal = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: "", owner: "", startWeek: 1, duration: 1 });

  useEffect(() => {
    const q = query(collection(db, "oppm_matrix"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    await addDoc(collection(db, "oppm_matrix"), {
      title: newTask.title,
      owner: newTask.owner || "Team",
      startWeek: parseInt(newTask.startWeek),
      duration: parseInt(newTask.duration),
      status: "planned",
      createdAt: serverTimestamp()
    });
    setNewTask({ title: "", owner: "", startWeek: 1, duration: 1 });
  };

  const toggleDone = async (task) => {
    await updateDoc(doc(db, "oppm_matrix", task.id), {
      status: task.status === "done" ? "planned" : "done"
    });
  };

  const handleDelete = async (id) => {
    if(confirm("Xóa việc này?")) await deleteDoc(doc(db, "oppm_matrix", id));
  };

  const isActiveWeek = (task, currentWeek) => {
    const endWeek = task.startWeek + task.duration - 1;
    return currentWeek >= task.startWeek && currentWeek <= endWeek;
  };

  // --- LOGIC MỚI: TÍNH TOÁN TIẾN ĐỘ TUẦN (ALGORITHM) ---
  const getWeeklyStatus = (week) => {
    // 1. Tìm tất cả task ĐANG CHẠY trong tuần này
    const activeTasks = tasks.filter(t => isActiveWeek(t, week));
    
    if (activeTasks.length === 0) return { type: 'empty', label: '' };

    // 2. Đếm số task đã xong
    const doneCount = activeTasks.filter(t => t.status === 'done').length;
    const total = activeTasks.length;
    const percent = (doneCount / total) * 100;

    // 3. Trả về trạng thái màu sắc
    if (percent === 100) return { type: 'success', label: `🟢 ${doneCount}/${total}` }; // Xong hết
    if (percent === 0) return { type: 'danger', label: `🔴 0/${total}` }; // Chưa xong cái nào
    return { type: 'warning', label: `🟡 ${doneCount}/${total}` }; // Xong một phần
  };

  return (
    <div className="oppm-matrix-container">
      <header>
        <h1>🎯 OPPM - Ma Trận Kế Hoạch</h1>
        <p>Quản lý tiến độ thực tế (Real-time Progress Matrix)</p>
      </header>

      <form onSubmit={handleAddTask} className="matrix-form">
        <input 
          placeholder="Tên công việc..." 
          value={newTask.title} 
          onChange={e => setNewTask({...newTask, title: e.target.value})} 
          required
        />
        <input 
          placeholder="Người làm..." 
          value={newTask.owner} 
          onChange={e => setNewTask({...newTask, owner: e.target.value})} 
          required
        />
        <div className="group-input">
          <label>Bắt đầu Tuần:</label>
          <input type="number" min="1" max={TOTAL_WEEKS} value={newTask.startWeek} onChange={e => setNewTask({...newTask, startWeek: e.target.value})} />
        </div>
        <div className="group-input">
          <label>Làm trong:</label>
          <input type="number" min="1" max={TOTAL_WEEKS} value={newTask.duration} onChange={e => setNewTask({...newTask, duration: e.target.value})} />
        </div>
        <button type="submit"><Plus size={16}/> Thêm</button>
      </form>

      <div className="matrix-wrapper">
        <table className="oppm-table">
          <thead>
            <tr>
              <th className="col-task">Nội dung công việc</th>
              <th className="col-owner">Phụ trách</th>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => (
                <th key={week} className="col-week">{week}</th>
              ))}
              <th style={{width: 50}}></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id} className={task.status}>
                <td className="task-name" onClick={() => toggleDone(task)}>
                  {task.status === 'done' ? <CheckCircle size={16} color="#4ade80"/> : <div className="circle-placeholder"></div>}
                  {task.title}
                </td>
                <td className="owner-name">{task.owner}</td>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
                  const active = isActiveWeek(task, week);
                  return (
                    <td key={week} className={`cell-dot ${active ? 'active-zone' : ''}`}>
                      {active && <div className={`dot ${task.status}`}></div>}
                    </td>
                  );
                })}
                <td><button onClick={() => handleDelete(task.id)} className="btn-icon"><Trash2 size={14}/></button></td>
              </tr>
            ))}

            {/* --- HÀNG TỔNG KẾT THÔNG MINH (SMART SUMMARY ROW) --- */}
            <tr className="summary-row">
              <td colSpan={2} style={{textAlign: 'right', fontWeight: 'bold', color: '#555'}}>
                📊 Tổng kết tuần:
              </td>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
                const status = getWeeklyStatus(week);
                return (
                  <td key={week} className={`status-cell ${status.type}`}>
                    {status.label && <span className="status-tag">{status.label}</span>}
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OPPMReal;