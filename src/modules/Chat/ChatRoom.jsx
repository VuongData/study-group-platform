import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, 
  where, updateDoc, doc, limit, getDocs, arrayUnion, arrayRemove, deleteDoc, getDoc, writeBatch
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ✅ IMPORT ICON
import { 
  Send, Image as ImageIcon, Search, Plus, Users, MessageCircle, 
  Copy, Check, Smile, Loader2, Edit2, X, Paperclip, FileText, Download, 
  FolderOpen, Reply, Trash2, XCircle, Video, Settings, LogOut, ShieldAlert,
  Bell, UserCheck, UserX, BookUser, UserMinus, PenTool, 
  Presentation, UserPlus
} from "lucide-react"; 

import AIAssistant from "../AI/AIAssistant";
import ChatResources from "./ChatResources"; 
import Whiteboard from "../Whiteboard/Whiteboard"; 
import { toast } from "react-toastify";
import "./ChatRoom.scss";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

// 👇 1. BỘ EMOJI PHONG PHÚ
const EMOJI_LIST = ['❤️', '😆', '😮', '😢', '😡', '👍', '👎', '🎉', '🚀', '👀'];

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // --- REFS ---
  const dummyDiv = useRef(null);
  const chatContainerRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- STATES ---
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]); 
  const [memberDetails, setMemberDetails] = useState([]);   
  const [friendList, setFriendList] = useState([]); 
  const [userNames, setUserNames] = useState({});

  const [activeBoardId, setActiveBoardId] = useState(null); 
  const [boardTitle, setBoardTitle] = useState("");

  const [msgLimit, setMsgLimit] = useState(20);
  const [isLoadingOldMessages, setIsLoadingOldMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [msgSearchTerm, setMsgSearchTerm] = useState("");
  const [isSearchMsgOpen, setIsSearchMsgOpen] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create_group"); 
  const [inputTarget, setInputTarget] = useState(""); 
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================================================================
  // DATA FETCHING
  // =========================================================================================

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chat_rooms"), where("members", "array-contains", user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || rooms.length === 0) return;
    const fetchUserNames = async () => {
      const missingIds = new Set();
      rooms.forEach(room => {
        if (room.type === 'direct') {
          const otherId = room.members.find(id => id !== user.uid);
          if (otherId && !userNames[otherId]) missingIds.add(otherId);
        }
      });
      if (missingIds.size === 0) return;
      const newNames = {};
      await Promise.all(Array.from(missingIds).map(async (uid) => {
        try {
          const docSnap = await getDoc(doc(db, "users", uid));
          newNames[uid] = docSnap.exists() ? docSnap.data().displayName : "Người dùng ẩn";
        } catch (e) { newNames[uid] = "Lỗi tải tên"; }
      }));
      setUserNames(prev => ({ ...prev, ...newNames }));
    };
    fetchUserNames();
  }, [rooms, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "friend_requests"), where("toUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFriendRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedRoom?.id) { setMessages([]); return; }
    setMsgLimit(20); setIsLoadingOldMessages(false); setShowResources(false); setReplyingTo(null); setMemberDetails([]);
    const q = query(collection(db, "messages"), where("roomId", "==", selectedRoom.id), orderBy("createdAt", "desc"), limit(msgLimit));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
      setIsLoadingOldMessages(false);
    });
    return () => unsubscribe();
  }, [selectedRoom?.id, msgLimit]);

  const fetchMemberDetails = async () => { if (!selectedRoom?.members) return; setIsProcessing(true); try { const details = await Promise.all(selectedRoom.members.map(async (uid) => { const snap = await getDoc(doc(db, "users", uid)); return { id: uid, ...(snap.data() || { displayName: "Unknown", email: "N/A" }) }; })); setMemberDetails(details); } catch (error) { console.error(error); } finally { setIsProcessing(false); } };
  const fetchFriendList = async () => { setIsProcessing(true); try { const directRooms = rooms.filter(r => r.type === 'direct'); const friendsData = await Promise.all(directRooms.map(async (room) => { const friendId = room.members.find(id => id !== user.uid); if(!friendId) return null; const snap = await getDoc(doc(db, "users", friendId)); return { roomId: room.id, friendId: friendId, ...(snap.data() || { displayName: "Unknown", email: "N/A" }) }; })); setFriendList(friendsData.filter(f => f !== null)); } catch (error) { console.error(error); } finally { setIsProcessing(false); } };
  
  useLayoutEffect(() => { if (messages.length > 0 && messages.length <= 20) dummyDiv.current?.scrollIntoView({ behavior: "auto" }); }, [messages, msgSearchTerm]);
  const handleScroll = (e) => { if (e.target.scrollTop === 0 && !isLoadingOldMessages && messages.length >= msgLimit) { setIsLoadingOldMessages(true); setTimeout(() => setMsgLimit(prev => prev + 20), 500); } };

  // =========================================================================================
  // ACTIONS
  // =========================================================================================
  const uploadToCloudinary = async (file) => { const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData }); return await res.json(); };
  const handleFileUpload = async (e) => { const file = e.target.files[0]; if(!file) return; try { toast.info("Đang tải file..."); const data = await uploadToCloudinary(file); await addDoc(collection(db, "messages"), { fileUrl: data.secure_url, fileName: file.name, fileType: "document", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp() }); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); } catch (err) { toast.error("Lỗi upload"); } };
  const handleImageUpload = async (e) => { const file = e.target.files[0]; if(!file) return; try { const data = await uploadToCloudinary(file); await addDoc(collection(db, "messages"), { fileUrl: data.secure_url, fileType: "image", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp() }); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); } catch (err) { toast.error("Lỗi upload"); } };
  const handleSendMessage = async (e) => { e.preventDefault(); if ((!newMessage.trim()) || !selectedRoom) return; const payload = { text: newMessage, fileType: "text", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp() }; if (replyingTo) payload.replyTo = { id: replyingTo.id, text: replyingTo.text || "[File]", displayName: replyingTo.displayName }; await addDoc(collection(db, "messages"), payload); updateDoc(doc(db, "chat_rooms", selectedRoom.id), { updatedAt: serverTimestamp() }); setNewMessage(""); setReplyingTo(null); dummyDiv.current?.scrollIntoView({ behavior: "smooth" }); };
  const handleUnsend = async (msgId) => { if(!confirm("Thu hồi tin nhắn?")) return; try { await updateDoc(doc(db, "messages", msgId), { isUnsent: true, text: "Tin nhắn đã thu hồi", fileUrl: null }); } catch (e) { toast.error("Lỗi thu hồi"); } };
  
  // 👇 2. LOGIC REACTION (ĐÃ CẬP NHẬT)
  const handleReaction = async (msgId, emoji) => {
    const msgRef = doc(db, "messages", msgId);
    const msg = messages.find(m => m.id === msgId);
    
    // Copy object reactions hiện tại
    const newReactions = { ...(msg.reactions || {}) };
    
    // Toggle Logic: Nếu đã thả icon này rồi -> Xóa. Chưa thả -> Thêm/Đè.
    if (newReactions[user.uid] === emoji) {
      delete newReactions[user.uid];
    } else {
      newReactions[user.uid] = emoji;
    }
    
    await updateDoc(msgRef, { reactions: newReactions });
    setActiveReactionId(null); // Đóng popup
  };
  
  const handleVideoCall = async () => { if (!selectedRoom) return; const callUrl = `/video-call/${selectedRoom.id}`; window.open(callUrl, '_blank'); try { await addDoc(collection(db, "messages"), { text: `📞 Đã bắt đầu cuộc gọi video.`, fileType: "system", uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, roomId: selectedRoom.id, createdAt: serverTimestamp(), reactions: {} }); } catch (error) { console.error(error); } };
  const openGroupWhiteboard = () => { if (!selectedRoom) return; setActiveBoardId(selectedRoom.id); setBoardTitle(`Bảng nhóm: ${selectedRoom.name || "Chưa đặt tên"}`); };
  const openPersonalWhiteboard = () => { if (!user) return; setActiveBoardId(`${user.uid}_personal`); setBoardTitle("🎨 Bảng nháp cá nhân"); };

  // Management functions
  const handleKickMember = async (memberId, memberName) => { if (!confirm(`Mời ${memberName} ra khỏi nhóm?`)) return; try { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayRemove(memberId), updatedAt: serverTimestamp() }); await addDoc(collection(db, "messages"), { text: `🚫 ${user.displayName} đã mời ${memberName} ra khỏi nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp() }); setMemberDetails(prev => prev.filter(m => m.id !== memberId)); setSelectedRoom(prev => ({...prev, members: prev.members.filter(id => id !== memberId)})); toast.success(`Đã xóa ${memberName}`); } catch (error) { toast.error("Lỗi khi xóa"); } };
  const handleLeaveGroup = async () => { if (!confirm("Rời khỏi nhóm?")) return; try { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayRemove(user.uid), updatedAt: serverTimestamp() }); await addDoc(collection(db, "messages"), { text: `👋 ${user.displayName} đã rời nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp() }); setSelectedRoom(null); setShowModal(false); toast.info("Đã rời nhóm"); } catch (error) { toast.error("Lỗi rời nhóm"); } };
  const handleDisbandGroup = async () => { if (!confirm("CẢNH BÁO: Xóa vĩnh viễn nhóm và toàn bộ tin nhắn?")) return; setIsProcessing(true); try { const batch = writeBatch(db); const msgSnap = await getDocs(query(collection(db, "messages"), where("roomId", "==", selectedRoom.id))); msgSnap.forEach(doc => batch.delete(doc.ref)); const taskSnap = await getDocs(query(collection(db, "oppm_tasks"), where("roomId", "==", selectedRoom.id))); taskSnap.forEach(doc => batch.delete(doc.ref)); const wbSnap = await getDocs(query(collection(db, "whiteboards", selectedRoom.id, "elements"))); wbSnap.forEach(doc => batch.delete(doc.ref)); batch.delete(doc(db, "chat_rooms", selectedRoom.id)); await batch.commit(); setSelectedRoom(null); setShowModal(false); toast.success("Đã giải tán nhóm!"); } catch (error) { console.error(error); toast.error("Lỗi giải tán: " + error.message); } finally { setIsProcessing(false); } };
  const handleUnfriend = async (roomId, friendName) => { if (!confirm(`Bạn muốn hủy kết bạn với ${friendName}?`)) return; setFriendList(prev => prev.filter(f => f.roomId !== roomId)); try { const batch = writeBatch(db); const msgSnap = await getDocs(query(collection(db, "messages"), where("roomId", "==", roomId))); msgSnap.forEach(doc => batch.delete(doc.ref)); batch.delete(doc(db, "chat_rooms", roomId)); await batch.commit(); if(selectedRoom?.id === roomId) setSelectedRoom(null); toast.success(`Đã hủy kết bạn với ${friendName}`); } catch (error) { toast.error("Lỗi hủy kết bạn"); console.error(error); fetchFriendList(); } };
  const handleAcceptRequest = async (req) => { setIsProcessing(true); try { const newRoom = { name: req.fromName, type: "direct", members: [user.uid, req.fromUid], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; const roomRef = await addDoc(collection(db, "chat_rooms"), newRoom); await addDoc(collection(db, "messages"), { text: `👋 Hai bạn đã trở thành bạn bè.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: roomRef.id, createdAt: serverTimestamp() }); await deleteDoc(doc(db, "friend_requests", req.id)); toast.success(`Đã kết bạn với ${req.fromName}`); if(friendRequests.length <= 1) setShowModal(false); } catch (e) { toast.error("Lỗi kết bạn"); } finally { setIsProcessing(false); } };
  const handleRejectRequest = async (reqId) => { if(!confirm("Từ chối?")) return; try { await deleteDoc(doc(db, "friend_requests", reqId)); toast.info("Đã từ chối"); if(friendRequests.length <= 1) setShowModal(false); } catch (e) { toast.error("Lỗi"); } };
  const handleModalSubmit = async () => { if (!inputTarget.trim()) return toast.warning("Vui lòng nhập thông tin!"); setIsProcessing(true); const commonData = { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; try { if (modalMode === 'create_group') { await addDoc(collection(db, "chat_rooms"), { name: inputTarget, type: "group", members: [user.uid], createdBy: user.uid, ...commonData }); toast.success("Tạo nhóm thành công!"); } else if (modalMode === 'add_friend') { const snap = await getDocs(query(collection(db, "users"), where("email", "==", inputTarget.trim()))); if (snap.empty) { toast.error("Gmail không tồn tại!"); setIsProcessing(false); return; } const targetUser = snap.docs[0]; if (targetUser.id === user.uid) { toast.warning("Không thể tự kết bạn!"); setIsProcessing(false); return; } const existing = rooms.find(r => r.type === 'direct' && r.members.includes(targetUser.id)); if (existing) { toast.info("Đã là bạn bè!"); setIsProcessing(false); return; } const reqSnap = await getDocs(query(collection(db, "friend_requests"), where("fromUid", "==", user.uid), where("toUid", "==", targetUser.id))); if (!reqSnap.empty) { toast.warning("Đã gửi lời mời rồi!"); setIsProcessing(false); return; } await addDoc(collection(db, "friend_requests"), { fromUid: user.uid, fromName: user.displayName, fromEmail: user.email, toUid: targetUser.id, createdAt: serverTimestamp() }); toast.success("Đã gửi lời mời!"); } else if (modalMode === 'add_member') { const snap = await getDocs(query(collection(db, "users"), where("email", "==", inputTarget.trim()))); if (snap.empty) { toast.error("Gmail không tồn tại!"); setIsProcessing(false); return; } const newMem = snap.docs[0]; if (selectedRoom.members.includes(newMem.id)) { toast.warning("Đã có trong nhóm!"); setIsProcessing(false); return; } await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { members: arrayUnion(newMem.id), updatedAt: serverTimestamp() }); await addDoc(collection(db, "messages"), { text: `👋 Đã thêm ${newMem.data().displayName} vào nhóm.`, fileType: "system", uid: "SYSTEM", displayName: "Hệ thống", roomId: selectedRoom.id, createdAt: serverTimestamp() }); setSelectedRoom(prev => ({...prev, members: [...prev.members, newMem.id]})); toast.success("Đã thêm thành viên!"); } else if (modalMode === 'set_nickname') { const otherId = selectedRoom.members.find(id => id !== user.uid); if (otherId) { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { [`nicknames.${otherId}`]: inputTarget, updatedAt: serverTimestamp() }); setSelectedRoom(prev => ({ ...prev, nicknames: { ...prev.nicknames, [otherId]: inputTarget } })); toast.success("Đã đặt biệt danh mới!"); } } else if (modalMode === 'rename_group') { await updateDoc(doc(db, "chat_rooms", selectedRoom.id), { name: inputTarget, updatedAt: serverTimestamp() }); setSelectedRoom(prev => ({...prev, name: inputTarget})); toast.success("Đổi tên thành công!"); } setShowModal(false); setInputTarget(""); } catch (error) { console.error(error); toast.error("Lỗi xử lý."); } finally { setIsProcessing(false); } };

  // Helpers UI
  const getRoomName = (room) => { if (room.type === 'group') return room.name; const otherId = room.members.find(id => id !== user.uid); if (room.nicknames && room.nicknames[otherId]) return room.nicknames[otherId]; return userNames[otherId] || "Đang tải..."; };
  const isGroupAdmin = selectedRoom?.createdBy === user.uid;
  const idToDisplay = selectedRoom ? selectedRoom.id : user.uid;

  return (
    <div className="chat-room-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
             <h3 style={{margin:0}}>💬 Chat Nhóm</h3>
             <div style={{display:'flex', gap: 8}}>
               <div title="Bảng nháp cá nhân" style={{cursor:'pointer'}} onClick={openPersonalWhiteboard}><Presentation size={20} color="#059669"/></div>
               <div title="Danh bạ" style={{cursor:'pointer'}} onClick={()=>{ fetchFriendList(); setModalMode('manage_friends'); setShowModal(true); }}><BookUser size={20} color="#64748b"/></div>
               <div className="notification-bell" style={{position:'relative', cursor:'pointer'}} onClick={() => { if(friendRequests.length > 0) { setModalMode('view_requests'); setShowModal(true); } else toast.info("Không có lời mời nào."); }}><Bell size={20} color="#64748b"/>{friendRequests.length > 0 && <span style={{position:'absolute', top:-5, right:-5, background:'#ef4444', color:'white', fontSize:'0.7rem', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center'}}>{friendRequests.length}</span>}</div>
             </div>
           </div>
           <div className="my-id-box" onClick={() => {navigator.clipboard.writeText(idToDisplay); setCopied(true); setTimeout(()=>setCopied(false),2000)}}><span>ID: {idToDisplay.slice(0, 8)}...</span>{copied ? <Check size={14}/> : <Copy size={14}/>}</div>
           <div className="search-room-box"><Search size={14}/><input placeholder="Tìm..." value={roomSearchTerm} onChange={e=>setRoomSearchTerm(e.target.value)}/></div>
        </div>
        <div className="room-list">
           {rooms.filter(r => getRoomName(r).toLowerCase().includes(roomSearchTerm.toLowerCase())).map(r => (
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

      <div className="chat-main">
        {selectedRoom ? (
          <>
            <header className="chat-header">
               <div className="header-left">
                 <div className="avatar-group">{selectedRoom.type==='group'?'#':'@'}</div>
                 <div className="info-wrapper">
                   <div className="title-row">
                      <h3>{getRoomName(selectedRoom)}</h3>
                      {selectedRoom.type==='group' && <button className="btn-edit" onClick={()=>{setModalMode('rename_group');setInputTarget(selectedRoom.name);setShowModal(true)}}><Edit2 size={14}/></button>}
                   </div>
                   {selectedRoom.type === 'group' ? <span className="status">{selectedRoom.members.length} thành viên</span> : <button className="btn-set-nickname" onClick={() => { const otherId = selectedRoom.members.find(id => id !== user.uid); const currentNick = selectedRoom.nicknames?.[otherId] || ""; setModalMode('set_nickname'); setInputTarget(currentNick); setShowModal(true); }}><PenTool size={12} style={{marginRight: 4}}/> Đặt biệt danh</button>}
                 </div>
               </div>
               <div className="header-actions">
                 <button className="btn-icon" onClick={handleVideoCall} title="Video Call"><Video size={22} color="#2563eb" /></button>
                 <button className="btn-icon" onClick={openGroupWhiteboard} title="Bảng trắng nhóm"><PenTool size={22} color="#9333ea" /></button>
                 {selectedRoom.type === 'group' && <button className="btn-icon" onClick={() => { fetchMemberDetails(); setModalMode('manage_members'); setShowModal(true); }}><Settings size={22} /></button>}
                 <div className="divider"></div>
                 {isSearchMsgOpen ? <div className="msg-search"><input autoFocus placeholder="Tìm tin..." value={msgSearchTerm} onChange={e=>setMsgSearchTerm(e.target.value)}/><X size={16} onClick={()=>setIsSearchMsgOpen(false)}/></div> : <button className="btn-icon" onClick={()=>setIsSearchMsgOpen(true)}><Search size={20}/></button>}
                 <button className={`btn-icon ${showResources?'active':''}`} onClick={()=>setShowResources(!showResources)}><FolderOpen size={20}/></button>
                 <AIAssistant isInline={true}/>
               </div>
            </header>

            <div className="messages-list" ref={chatContainerRef} onScroll={handleScroll}>
              {isLoadingOldMessages && <div className="loading"><Loader2 className="spin"/> Tải tin cũ...</div>}
              {messages.filter(m => !msgSearchTerm || (m.text||"").toLowerCase().includes(msgSearchTerm.toLowerCase())).map(msg => {
                if (msg.isSystem) return <div key={msg.id} className="system-msg"><span>{msg.text}</span></div>;
                const isMe = msg.uid === user.uid;
                
                // 👇 LỌC ICON ĐÃ THẢ
                const uniqueReactions = [...new Set(Object.values(msg.reactions || {}))];

                return (
                  <div key={msg.id} className={`message-row ${isMe ? 'mine' : 'theirs'}`}>
                    {!isMe && <div className="msg-avatar">{msg.displayName?.charAt(0)}</div>}
                    
                    <div className="msg-content">
                      {!isMe && <div className="sender-name">{msg.displayName}</div>}
                      
                      {/* 👇 WRAPPER CHỨA TIN NHẮN + NÚT ACTION BÊN CẠNH */}
                      <div className="message-wrapper-outer">
                        <div className="message-bubble-wrapper">
                          {msg.replyTo && !msg.isUnsent && <div className="reply-quote"><div className="reply-bar"></div><div className="reply-info"><span className="reply-name">{msg.replyTo.displayName}</span><span className="reply-text">{msg.replyTo.text}</span></div></div>}
                          {msg.isUnsent ? <div className="bubble unsent">🚫 Thu hồi</div> : (
                            <>
                              {msg.fileType === 'image' && <div className="msg-image"><img src={msg.fileUrl} onClick={()=>window.open(msg.fileUrl)}/></div>}
                              {msg.fileType === 'document' && <div className="msg-file"><FileText size={24}/><div className="file-info"><span>{msg.fileName}</span><a href={msg.fileUrl} target="_blank"><Download size={14}/></a></div></div>}
                              {msg.text && <div className={`bubble ${msgSearchTerm && msg.text.includes(msgSearchTerm)?'highlight':''}`}>{msg.text}</div>}
                            </>
                          )}
                          
                          {/* 👇 HIỂN THỊ KẾT QUẢ ICON ĐÃ THẢ */}
                          {uniqueReactions.length > 0 && !msg.isUnsent && (
                            <div className="reactions-display">
                              {uniqueReactions.map((emoji, idx) => (
                                <span key={idx}>{emoji}</span>
                              ))}
                              <span className="count">{Object.keys(msg.reactions).length}</span>
                            </div>
                          )}
                        </div>

                        {/* 👇 NÚT ACTION (Chỉ hiện khi hover) */}
                        {!msg.isUnsent && (
                          <div className="msg-actions-hover">
                            <button onClick={()=>setActiveReactionId(msg.id)} title="Thả tim"><Smile size={16}/></button>
                            <button onClick={()=>setReplyingTo(msg)} title="Trả lời"><Reply size={16}/></button>
                            {isMe && <button onClick={()=>handleUnsend(msg.id)} title="Thu hồi"><Trash2 size={16}/></button>}
                          </div>
                        )}
                      </div>

                      <div className="timestamp">{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '...'}</div>
                      
                      {/* 👇 BẢNG CHỌN EMOJI */}
                      {activeReactionId === msg.id && (
                        <div className="reaction-picker-popover">
                          {EMOJI_LIST.map(e => (
                            <span 
                              key={e} 
                              onClick={() => handleReaction(msg.id, e)}
                              className={msg.reactions?.[user.uid] === e ? 'active' : ''}
                            >
                              {e}
                            </span>
                          ))}
                          <div className="close-picker" onClick={() => setActiveReactionId(null)}><X size={12}/></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={dummyDiv}></div>
            </div>

            <div className="chat-input-wrapper">
              {replyingTo && <div className="replying-banner"><div className="reply-content"><span className="reply-label">Trả lời <b>{replyingTo.displayName}</b></span><span className="reply-preview">{replyingTo.text}</span></div><button onClick={()=>setReplyingTo(null)}><XCircle size={18}/></button></div>}
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

      {showResources && selectedRoom && <div style={{width:320, borderLeft:'1px solid #ddd'}}><ChatResources roomId={selectedRoom.id}/></div>}
      {activeBoardId && (<Whiteboard boardId={activeBoardId} title={boardTitle} onClose={() => setActiveBoardId(null)} />)}
      
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <h3>{modalMode==='view_requests'?'Lời Mời Kết Bạn':modalMode==='set_nickname'?'Đặt Biệt Danh':modalMode==='create_group'?'Tạo Nhóm Mới':modalMode==='add_friend'?'Gửi Lời Mời':modalMode==='add_member'?'Thêm Thành Viên':modalMode==='manage_friends'?'Danh sách bạn bè':modalMode==='manage_members'?'Quản Lý Thành Viên':'Đổi Tên Nhóm'}</h3>
            <div className="modal-body">
              {modalMode === 'view_requests' ? (
                <div className="requests-list" style={{maxHeight: 300, overflowY:'auto'}}>
                   {friendRequests.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>Không có lời mời nào.</p> : friendRequests.map(req => (<div key={req.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding: '10px', borderBottom:'1px solid #eee'}}><div><strong>{req.fromName}</strong><div style={{fontSize:'0.8rem', color:'#666'}}>{req.fromEmail}</div></div><div style={{display:'flex', gap:5}}><button onClick={()=>handleRejectRequest(req.id)} style={{background:'#fee2e2', color:'#ef4444', padding: '6px 10px', border:'none', borderRadius: 4, cursor:'pointer'}}><UserX size={16}/></button><button onClick={()=>handleAcceptRequest(req)} style={{background:'#dcfce7', color:'#166534', padding: '6px 10px', border:'none', borderRadius: 4, cursor:'pointer'}}><UserCheck size={16}/></button></div></div>))}
                </div>
              ) : modalMode === 'manage_friends' ? (
                 <div className="friend-list-container" style={{maxHeight: 300, overflowY:'auto'}}>{isProcessing ? <p style={{textAlign:'center'}}>Đang tải...</p> : friendList.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>Chưa có bạn bè nào.</p> : friendList.map(friend => (<div key={friend.friendId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding: '10px 0', borderBottom:'1px solid #eee'}}><div style={{display:'flex', alignItems:'center', gap:10}}><div style={{width:32, height:32, background:'#e2e8f0', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>{friend.displayName.charAt(0)}</div><div><strong>{friend.displayName}</strong><div style={{fontSize:'0.8rem', color:'#666'}}>{friend.email}</div></div></div><button onClick={()=>handleUnfriend(friend.roomId, friend.displayName)} title="Hủy kết bạn" style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444'}}><UserMinus size={18}/></button></div>))}</div>
              ) : modalMode === 'manage_members' ? (
                 <div className="member-list-container" style={{maxHeight:300, overflowY:'auto'}}><button className="btn-add-member-in-modal" onClick={() => setModalMode('add_member')}><Plus size={16}/> Thêm (Gmail)</button>{memberDetails.map(mem => (<div key={mem.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}><div><strong>{mem.displayName}</strong><div style={{fontSize:'0.8rem', color:'#666'}}>{mem.email}</div></div>{mem.id !== selectedRoom.createdBy && isGroupAdmin && <button onClick={()=>handleKickMember(mem.id, mem.displayName)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><Trash2 size={16}/></button>}{mem.id === selectedRoom.createdBy && <span style={{fontSize:'0.7rem', background:'#dcfce7', color:'#166534', padding:'2px 5px', borderRadius:4}}>Admin</span>}</div>))}<div style={{marginTop:20, paddingTop:15, borderTop:'1px solid #eee', display:'flex', justifyContent:'center'}}>{!isGroupAdmin && <button onClick={handleLeaveGroup} style={{color:'#64748b', background:'#f1f5f9', padding:'8px 15px', border:'none', borderRadius:6, cursor:'pointer', display:'flex', gap:5}}><LogOut size={16}/> Rời nhóm</button>}{isGroupAdmin && <button onClick={handleDisbandGroup} style={{color:'white', background:'#ef4444', padding:'8px 15px', border:'none', borderRadius:6, cursor:'pointer', display:'flex', gap:5}}><ShieldAlert size={16}/> Giải tán nhóm</button>}</div></div>
              ) : (
                <><div className="input-group"><label>{modalMode==='set_nickname'?'Biệt danh mới:':modalMode.includes('add')?'Nhập Gmail:':'Tên mới:'}</label><input value={inputTarget} onChange={e=>setInputTarget(e.target.value)} placeholder="..." autoFocus /></div><div className="modal-actions" style={{display:'flex', gap: 10, marginTop: 15}}><button onClick={()=>setShowModal(false)} style={{background:'#ccc', flex: 1}}>Hủy</button><button onClick={handleModalSubmit} style={{background: '#2563eb', color: 'white', flex: 1}} disabled={isProcessing}>Xác nhận</button></div></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;