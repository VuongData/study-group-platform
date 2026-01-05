import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, 
  where, updateDoc, doc, limit, getDocs, arrayUnion, arrayRemove, deleteDoc, getDoc 
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
// Icons
import { 
  Send, Image as ImageIcon, Search, Plus, Users, MessageCircle, 
  Copy, Check, Smile, Loader2, Edit2, X, Paperclip, FileText, Download, 
  FolderOpen, Reply, Trash2, XCircle, Video, UserPlus, Settings, LogOut, ShieldAlert 
} from "lucide-react"; 
import AIAssistant from "../AI/AIAssistant";
import ChatResources from "./ChatResources"; 
import { toast } from "react-toastify";
import "./ChatRoom.scss";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Refs
  const dummyDiv = useRef(null);
  const chatContainerRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Data State
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLimit, setMsgLimit] = useState(20);
  const [isLoadingOldMessages, setIsLoadingOldMessages] = useState(false);
  const [memberDetails, setMemberDetails] = useState([]); // Danh sách chi tiết thành viên

  // UI State
  const [newMessage, setNewMessage] = useState("");
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // Search & Modal State
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [msgSearchTerm, setMsgSearchTerm] = useState("");
  const [isSearchMsgOpen, setIsSearchMsgOpen] = useState(false);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create_group"); 
  const [inputTarget, setInputTarget] = useState(""); 
  const [isProcessing, setIsProcessing] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    setMsgLimit(20);
    setIsLoadingOldMessages(false);
    setShowResources(false);
    setReplyingTo(null);
    setMemberDetails([]);
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chat_rooms"), where("members", "array-contains", user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedRoom?.id) { setMessages([]); return; }
    const q = query(collection(db, "messages"), where("roomId", "==", selectedRoom.id), orderBy("createdAt", "desc"), limit(msgLimit));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(fetchedMsgs.reverse());
      setIsLoadingOldMessages(false);
    });
    return () => unsubscribe();
  }, [selectedRoom?.id, msgLimit]);

  const fetchMemberDetails = async () => {
    if (!selectedRoom?.members) return;
    setIsProcessing(true);
    try {
      const details = await Promise.all(selectedRoom.members.map(async (uid) => {
        const userSnap = await getDoc(doc(db, "users", uid));
        return { id: uid, ...(userSnap.data() || { displayName: "Unknown", email: "N/A" }) };
      }));
      setMemberDetails(details);
    } catch (error) { console.error("Lỗi lấy thông tin:", error); } 
    finally { setIsProcessing(false); }
  };

  // --- SCROLL & UPLOAD Helpers (Giữ nguyên) ---
  useLayoutEffect(() => { if (messages.length > 0 && messages.length <= 20) dummyDiv.current?.scrollIntoView({ behavior: "auto" }); }, [messages, msgSearchTerm]);
  const handleScroll = (e) => { if (e.target.scrollTop === 0 && !isLoadingOldMessages && messages.length >= msgLimit) { setIsLoadingOldMessages(true); setTimeout(() => setMsgLimit(prev => prev + 20), 500); } };
  const uploadToCloudinary = async (file) => { const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData }); return await res.json(); };
  
  const handleFileUpload = async (e) => { const file = e.target.files[0]; if(!file) return; try { toast.info(`Đang tải: ${file.name}...`); const data = await uploadToCloudinary(file); await addDoc(collection(db, "messages"), { text: "", fileUrl: data.secure_url, fileName: file.name, fileType: "document", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); } catch (err) { toast.error("Lỗi upload"); } };
  const handleImageUpload = async (e) => { const file = e.target.files[0]; if(!file) return; try { const data = await uploadToCloudinary(file); await addDoc(collection(db, "messages"), { text: "", fileUrl: data.secure_url, fileType: "image", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); } catch (err) { toast.error("Lỗi upload"); } };

  // --- ACTIONS ---
  const handleSendMessage = async (e) => {
    e.preventDefault(); if ((!newMessage.trim()) || !selectedRoom) return;
    const payload = { text: newMessage, fileType: "text", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} };
    if (replyingTo) { payload.replyTo = { id: replyingTo.id, text: replyingTo.text || "[File]", displayName: replyingTo.displayName }; }
    await addDoc(collection(db, "messages"), payload); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); setNewMessage(""); setReplyingTo(null); dummyDiv.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleVideoCall = async () => { if (!selectedRoom) return; const callUrl = `/video-call/${selectedRoom.id}`; await addDoc(collection(db, "messages"), { text: `📞 Đã bắt đầu cuộc gọi video.`, fileType: "system", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); navigate(callUrl); };
  const handleUnsend = async (msgId) => { if (!confirm("Thu hồi tin nhắn này?")) return; try { await updateDoc(doc(db, "messages", msgId), { isUnsent: true, text: "Tin nhắn đã bị thu hồi", fileUrl: null, image: null }); } catch (err) { toast.error("Lỗi thu hồi"); } };
  const handleReaction = async (msgId, emoji) => { const msgRef = doc(db, "messages", msgId); const msg = messages.find(m => m.id === msgId); const newReactions = { ...(msg.reactions || {}) }; if (newReactions[user.uid] === emoji) delete newReactions[user.uid]; else newReactions[user.uid] = emoji; await updateDoc(msgRef, { reactions: newReactions }); setActiveReactionId(null); };

  // --- MEMBER MANAGEMENT ---
  const handleKickMember = async (memberId, memberName) => { if (!confirm(`Mời ${memberName} ra khỏi nhóm?`)) return; try { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayRemove(memberId), updatedAt: serverTimestamp() }); await addDoc(collection(db, "messages"), { text: `🚫 ${user.displayName} đã mời ${memberName} ra khỏi nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); setMemberDetails(prev => prev.filter(m => m.id !== memberId)); setSelectedRoom(prev => ({...prev, members: prev.members.filter(id => id !== memberId)})); toast.success(`Đã xóa ${memberName}`); } catch (error) { toast.error("Lỗi khi xóa"); } };
  const handleLeaveGroup = async () => { if (!confirm("Rời khỏi nhóm?")) return; try { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayRemove(user.uid), updatedAt: serverTimestamp() }); await addDoc(collection(db, "messages"), { text: `👋 ${user.displayName} đã rời nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); setSelectedRoom(null); setShowModal(false); toast.info("Đã rời nhóm"); } catch (error) { toast.error("Lỗi rời nhóm"); } };
  const handleDisbandGroup = async () => { if (!confirm("CẢNH BÁO: Xóa vĩnh viễn nhóm?")) return; try { await deleteDoc(doc(db, "chat_rooms", selectedRoom.id)); setSelectedRoom(null); setShowModal(false); toast.success("Đã giải tán nhóm"); } catch (error) { toast.error("Lỗi giải tán"); } };

  // --- 🔥 LOGIC MODAL (GMAIL FRIEND REQUEST) ---
  const handleModalSubmit = async () => {
    if (!inputTarget.trim()) return toast.warning("Vui lòng nhập thông tin!");
    setIsProcessing(true);
    const commonData = { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

    try {
      // 1. TẠO NHÓM
      if (modalMode === 'create_group') {
        await addDoc(collection(db, "chat_rooms"), { name: inputTarget, type: "group", members: [user.uid], createdBy: user.uid, ...commonData });
        toast.success("Tạo nhóm thành công!");
      } 
      
      // 2. KẾT BẠN (TÌM BẰNG GMAIL)
      else if (modalMode === 'add_friend') {
        const q = query(collection(db, "users"), where("email", "==", inputTarget.trim()));
        const snap = await getDocs(q);
        
        if (snap.empty) { toast.error("Không tìm thấy Gmail này!"); setIsProcessing(false); return; }
        
        const friend = snap.docs[0];
        if (friend.id === user.uid) { toast.warning("Không thể kết bạn với chính mình!"); setIsProcessing(false); return; }
        
        // Tạo phòng chat
        await addDoc(collection(db, "chat_rooms"), { 
          name: friend.data().displayName || "Chat riêng", 
          type: "direct", 
          members: [user.uid, friend.id], 
          ...commonData 
        });
        toast.success(`Đã kết nối với ${friend.data().displayName}!`);
      } 
      
      // 3. THÊM THÀNH VIÊN VÀO NHÓM (TÌM BẰNG GMAIL)
      else if (modalMode === 'add_member') {
        const q = query(collection(db, "users"), where("email", "==", inputTarget.trim()));
        const snap = await getDocs(q);
        
        if (snap.empty) { toast.error("Gmail không tồn tại!"); setIsProcessing(false); return; }
        
        const newMem = snap.docs[0];
        if (selectedRoom.members.includes(newMem.id)) { toast.warning("Đã có trong nhóm!"); setIsProcessing(false); return; }
        
        await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayUnion(newMem.id), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "messages"), { text: `👋 ${user.displayName} đã thêm ${newMem.data().displayName} vào nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} });
        
        setSelectedRoom(prev => ({...prev, members: [...prev.members, newMem.id]}));
        if (memberDetails.length > 0) setMemberDetails(prev => [...prev, {id: newMem.id, ...newMem.data()}]);
        toast.success("Đã thêm thành viên!");
      }

      else if (modalMode === 'rename_group') {
        await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { name: inputTarget, updatedAt: serverTimestamp() });
        setSelectedRoom(prev => ({...prev, name: inputTarget}));
        toast.success("Đổi tên thành công!");
      }

      setShowModal(false); setInputTarget("");
    } catch (error) { console.error(error); toast.error("Lỗi xử lý."); } 
    finally { setIsProcessing(false); }
  };

  // UI Helpers
  const getRoomName = (room) => { if (room.type === 'group') return room.name; const otherId = room.members.find(id => id !== user.uid); return `Bạn bè (${otherId?.slice(0,5)}...)`; };
  const isGroupAdmin = selectedRoom?.createdBy === user.uid;
  const filteredRooms = rooms.filter(r => getRoomName(r).toLowerCase().includes(roomSearchTerm.toLowerCase()));
  const displayedMessages = messages.filter(m => { if (!msgSearchTerm) return true; const content = (m.text || "") + (m.fileName || ""); return content.toLowerCase().includes(msgSearchTerm.toLowerCase()); });
  const getReactionCounts = (reactions) => { if (!reactions) return {}; return Object.values(reactions).reduce((acc, emoji) => { acc[emoji] = (acc[emoji] || 0) + 1; return acc; }, {}); };
  const idToDisplay = selectedRoom ? selectedRoom.id : user.uid;
  const labelIdDisplay = selectedRoom ? "ID Nhóm" : "My ID";

  return (
    <div className="chat-room-container">
      {/* SIDEBAR */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
           <h3>💬 Chat Nhóm</h3>
           <div className="my-id-box" onClick={() => {navigator.clipboard.writeText(idToDisplay); setCopied(true); setTimeout(()=>setCopied(false),2000)}}>
             <span title={idToDisplay}>{labelIdDisplay}: {idToDisplay.slice(0, 12)}...</span>{copied ? <Check size={14}/> : <Copy size={14}/>}
           </div>
           <div className="search-room-box"><Search size={14}/><input placeholder="Tìm..." value={roomSearchTerm} onChange={e=>setRoomSearchTerm(e.target.value)}/></div>
        </div>
        <div className="room-list">
           {filteredRooms.map(r => (
             <div key={r.id} className={`room-item ${selectedRoom?.id===r.id?'active':''}`} onClick={()=>setSelectedRoom(r)}>
               <div className="room-avatar">{r.type==='group'?<Users size={18}/>:<MessageCircle size={18}/>}</div>
               <div className="room-info"><h4>{getRoomName(r)}</h4><p>{r.type==='group'?'Nhóm':'Direct'}</p></div>
             </div>
           ))}
           <div className="sidebar-actions" style={{marginTop: 10, display: 'flex', gap: 5}}>
             <button className="btn-add-new" onClick={()=>{setModalMode('create_group'); setInputTarget(""); setShowModal(true)}} style={{flex: 1}}><Plus size={16}/> Tạo Nhóm</button>
             <button className="btn-add-new" onClick={()=>{setModalMode('add_friend'); setInputTarget(""); setShowModal(true)}} style={{flex: 1, borderColor: '#22c55e', color: '#22c55e'}}><UserPlus size={16}/> Kết bạn</button>
           </div>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className="chat-main">
        {selectedRoom ? (
          <>
            <header className="chat-header">
               <div className="header-left">
                 <div className="avatar-group">{selectedRoom.type==='group'?'#':'@'}</div>
                 <div className="info-wrapper">
                   <div className="title-row">
                      <h3>{selectedRoom.type==='group'?selectedRoom.name:getRoomName(selectedRoom)}</h3>
                      {selectedRoom.type==='group' && (
                        <>
                          <button className="btn-edit" title="Đổi tên" onClick={()=>{setModalMode('rename_group');setInputTarget(selectedRoom.name);setShowModal(true)}}><Edit2 size={14}/></button>
                        </>
                      )}
                   </div>
                   <span className="status">{selectedRoom.type === 'group' ? `${selectedRoom.members.length} thành viên` : "🟢 Online"}</span>
                 </div>
               </div>
               <div className="header-actions">
                 <button className="btn-icon" onClick={handleVideoCall} title="Video Call"><Video size={22} color="#2563eb" /></button>
                 {selectedRoom.type === 'group' && (
                   <button className="btn-icon" title="Quản lý thành viên" onClick={() => { fetchMemberDetails(); setModalMode('manage_members'); setShowModal(true); }}>
                      <Settings size={22} />
                   </button>
                 )}
                 <div className="divider"></div>
                 {isSearchMsgOpen ? <div className="msg-search"><input autoFocus placeholder="Tìm tin..." value={msgSearchTerm} onChange={e=>setMsgSearchTerm(e.target.value)}/><X size={16} onClick={()=>setIsSearchMsgOpen(false)}/></div> : <button className="btn-icon" onClick={()=>setIsSearchMsgOpen(true)}><Search size={20}/></button>}
                 <button className={`btn-icon ${showResources?'active':''}`} onClick={()=>setShowResources(!showResources)}><FolderOpen size={20}/></button>
                 <AIAssistant isInline={true}/>
               </div>
            </header>

            <div className="messages-list" ref={chatContainerRef} onScroll={handleScroll}>
              {isLoadingOldMessages && <div className="loading"><Loader2 className="spin"/> Tải tin cũ...</div>}
              {displayedMessages.map(msg => {
                if (msg.isSystem) return <div key={msg.id} className="system-msg"><span>{msg.text}</span></div>;
                const isMe = msg.uid === user.uid; const reactionCounts = getReactionCounts(msg.reactions);
                return (
                  <div key={msg.id} className={`message-row ${isMe ? 'mine' : 'theirs'}`}>
                    {!isMe && <div className="msg-avatar">{msg.displayName?.charAt(0)}</div>}
                    <div className="msg-content">
                      {!isMe && <div className="sender-name">{msg.displayName}</div>}
                      <div className="message-bubble-wrapper">
                        {msg.replyTo && !msg.isUnsent && (<div className="reply-quote"><div className="reply-bar"></div><div className="reply-info"><span className="reply-name">{msg.replyTo.displayName}</span><span className="reply-text">{msg.replyTo.text}</span></div></div>)}
                        {msg.isUnsent ? <div className="bubble unsent">🚫 Tin nhắn đã bị thu hồi</div> : (
                          <>
                            {msg.fileType === 'image' && <div className="msg-image"><img src={msg.fileUrl} onClick={()=>window.open(msg.fileUrl)}/></div>}
                            {msg.fileType === 'document' && <div className="msg-file"><FileText size={24}/><div className="file-info"><span>{msg.fileName}</span><a href={msg.fileUrl} target="_blank"><Download size={14}/> Tải</a></div></div>}
                            {msg.text && <div className={`bubble ${msgSearchTerm && msg.text.includes(msgSearchTerm)?'highlight':''}`}>{msg.text}</div>}
                          </>
                        )}
                        {!msg.isUnsent && (<div className="msg-actions"><button onClick={()=>setReplyingTo(msg)}><Reply size={14}/></button>{isMe && <button onClick={()=>handleUnsend(msg.id)}><Trash2 size={14}/></button>}<button onClick={()=>setActiveReactionId(activeReactionId===msg.id?null:msg.id)}><Smile size={14}/></button></div>)}
                        {activeReactionId === msg.id && <div className="reaction-picker">{['❤️','😆','😮','😢','👍'].map(e=><span key={e} onClick={()=>handleReaction(msg.id,e)}>{e}</span>)}</div>}
                      </div>
                      {Object.keys(reactionCounts).length > 0 && <div className="reactions-display">{Object.entries(reactionCounts).map(([emoji, count]) => <span key={emoji}>{emoji} {count}</span>)}</div>}
                      <div className="timestamp">{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '...'}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={dummyDiv}></div>
            </div>

            <div className="chat-input-wrapper">
              {replyingTo && <div className="replying-banner"><div className="reply-content"><span className="reply-label">Trả lời <b>{replyingTo.displayName}</b></span><span className="reply-preview">{replyingTo.text || "[File]"}</span></div><button onClick={()=>setReplyingTo(null)}><XCircle size={18}/></button></div>}
              <form onSubmit={handleSendMessage} className="chat-input-area">
                 <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                 <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                 <button type="button" className="btn-icon" onClick={()=>imageInputRef.current.click()}><ImageIcon size={20}/></button>
                 <button type="button" className="btn-icon" onClick={()=>fileInputRef.current.click()}><Paperclip size={20}/></button>
                 <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." />
                 <button type="submit" className="btn-send"><Send size={18}/></button>
              </form>
            </div>
          </>
        ) : <div className="no-room">Chọn phòng chat</div>}
      </div>

      {showResources && selectedRoom && <div style={{width:320, borderLeft:'1px solid #ddd'}}><ChatResources roomId={selectedRoom.id} isGroupAdmin={isGroupAdmin} roomType={selectedRoom.type}/></div>}

      {/* --- MODAL DA DỤNG --- */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <h3>
              {modalMode==='create_group' ? 'Tạo Nhóm Mới' : 
               modalMode==='add_friend' ? 'Kết Bạn Mới' : 
               modalMode==='add_member' ? 'Thêm Thành Viên' : 
               modalMode==='rename_group' ? 'Đổi Tên Nhóm' : 'Quản Lý Thành Viên'}
            </h3>
            
            <div className="modal-body">
              {modalMode === 'manage_members' ? (
                <div className="member-list-container">
                  {isProcessing && <p style={{textAlign:'center'}}>Đang tải danh sách...</p>}
                  
                  <button className="btn-add-member-in-modal" onClick={() => setModalMode('add_member')}>
                    <Plus size={16}/> Thêm thành viên mới (Gmail)
                  </button>

                  <ul className="member-list-ul">
                    {memberDetails.map(mem => (
                      <li key={mem.id} className="member-item">
                        <div className="mem-info">
                          <div className="mem-avatar">{mem.displayName?.charAt(0)}</div>
                          <div className="mem-text">
                            <strong>{mem.displayName} {mem.id === user.uid && "(Bạn)"}</strong>
                            <span>{mem.email}</span>
                          </div>
                        </div>
                        <div className="mem-actions">
                          {mem.id === selectedRoom.createdBy ? (
                            <span className="badge-admin">Trưởng nhóm</span>
                          ) : (
                            isGroupAdmin && (
                              <button className="btn-kick" title="Mời ra khỏi nhóm" onClick={() => handleKickMember(mem.id, mem.displayName)}>
                                <Trash2 size={16}/>
                              </button>
                            )
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="modal-danger-zone">
                    {!isGroupAdmin && <button className="btn-leave" onClick={handleLeaveGroup}><LogOut size={16}/> Rời nhóm</button>}
                    {isGroupAdmin && <button className="btn-disband" onClick={handleDisbandGroup}><ShieldAlert size={16}/> Giải tán nhóm</button>}
                  </div>
                </div>
              ) : (
                /* FORM NHẬP LIỆU (Gmail/Name) */
                <>
                  <div className="input-group">
                    <label>
                      {modalMode==='create_group' ? 'Tên nhóm:' : 
                       modalMode.includes('add') ? 'Nhập Gmail:' : 'Tên mới:'}
                    </label>
                    <input 
                      value={inputTarget} 
                      onChange={e=>setInputTarget(e.target.value)} 
                      placeholder={modalMode.includes('add') ? "vidu@gmail.com" : "Nhập tên..."} 
                      autoFocus
                    />
                  </div>
                  <div className="modal-actions" style={{display:'flex', gap: 10, marginTop: 15}}>
                    <button onClick={()=>setShowModal(false)} style={{background:'#ccc', flex: 1}}>Hủy</button>
                    <button onClick={handleModalSubmit} style={{background: '#2563eb', color: 'white', flex: 1}} disabled={isProcessing}>
                      {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;