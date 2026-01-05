// src/modules/Meeting/VideoRoom.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useAuth } from "../../context/AuthContext";
import { Video, LogOut } from "lucide-react";
import "./VideoRoom.scss";

// --- ⚠️ QUAN TRỌNG: THAY BẰNG KEY CỦA BẠN TỪ ZEGOCLOUD ---
const APP_ID = 667315820; // Thay số AppID của bạn vào đây (dạng số)
const SERVER_SECRET = "71fa57b40cb54e95ced402940d9a2950"; // Thay ServerSecret (dạng chuỗi)

const VideoRoom = () => {
  const { roomId } = useParams(); // Lấy ID phòng từ URL (nếu có)
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inputRoomId, setInputRoomId] = useState("");

  // 1. GIAO DIỆN LOBBY (Nếu chưa vào phòng)
  const handleJoin = () => {
    if (!inputRoomId) return;
    navigate(`/video-call/${inputRoomId}`);
  };

  // 2. HÀM KHỞI TẠO CUỘC GỌI (Zego Logic)
  const myMeeting = async (element) => {
    if (!roomId || !user) return;

    // Tạo Token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID,
      SERVER_SECRET,
      roomId,
      user.uid,           // User ID
      user.displayName || "User" // Tên hiển thị trong cuộc gọi
    );

    // Khởi tạo Instance
    const zp = ZegoUIKitPrebuilt.create(kitToken);

    // Bắt đầu join phòng
    zp.joinRoom({
      container: element,
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference, // Chế độ họp nhiều người
      },
      showScreenSharingButton: true, // Cho phép chia sẻ màn hình
      showPreJoinView: true,         // Xem trước Camera/Mic trước khi vào
      
      // Khi bấm nút rời phòng
      onLeaveRoom: () => {
        navigate("/"); // Quay về Dashboard
      },
    });
  };

  // --- RENDER ---

  // Trường hợp 1: Chưa có Room ID (Đang ở sảnh chờ)
  if (!roomId) {
    return (
      <div className="video-lobby">
        <div className="lobby-card">
          <h1>🎥 Họp Trực Tuyến</h1>
          <p>Nhập mã phòng để tham gia hoặc tạo phòng mới.</p>
          
          <input 
            type="text" 
            placeholder="Nhập tên phòng (VD: Team1)..."
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
          />
          
          <button onClick={handleJoin} disabled={!inputRoomId}>
            <Video size={18}/> Vào Ngay
          </button>
          
          <button className="btn-back" onClick={() => navigate("/")}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // Trường hợp 2: Đã có Room ID -> Hiển thị Video Call
  return (
    <div
      className="myCallContainer"
      ref={myMeeting}
      style={{ width: "100vw", height: "100vh" }}
    ></div>
  );
};

export default VideoRoom;