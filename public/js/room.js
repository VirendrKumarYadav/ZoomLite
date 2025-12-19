// public/js/room.js - SIMPLIFIED WORKING VERSION
class VideoConference {
    constructor() {
        console.log('✅ VideoConference class initialized');
        
        // Get room ID and user info from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('userId') || 'user_' + Math.random().toString(36).substr(2, 9);
        this.userName = urlParams.get('userName') || `User_${this.userId.substring(0, 5)}`;
        this.roomId = window.location.pathname.split('/').pop();
        
        // Set up properties
        this.socket = null;
        this.localStream = null;
        this.isAudioMuted = false;
        this.isVideoOff = false;
        
        // Initialize immediately
        this.init();
    }

    async init() {
        console.log('🚀 Initializing conference for room:', this.roomId);
        console.log('👤 User ID:', this.userId);
        
        // 1. Update UI elements
        this.updateUI();
        
        // 2. Set up event listeners FIRST
        this.setupEventListeners();
        
        // 3. Try to get media
        await this.getUserMedia();
        
        // 4. Connect to socket
        this.connectSocket();
    }

    updateUI() {
        // Update room ID display
        const roomIdElement = document.getElementById('roomIdDisplay');
        if (roomIdElement) {
            roomIdElement.textContent = this.roomId;
            console.log('✅ Room ID updated in UI:', this.roomId);
        } else {
            console.error('❌ Cannot find roomIdDisplay element');
        }
        
        // Update participant count
        this.updateParticipantCount();
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Mute/Unmute button
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            console.log('✅ Found mute button');
            muteBtn.addEventListener('click', () => this.toggleAudio());
        } else {
            console.error('❌ Cannot find muteBtn element');
        }
        
        // Video toggle button
        const videoBtn = document.getElementById('videoBtn');
        if (videoBtn) {
            console.log('✅ Found video button');
            videoBtn.addEventListener('click', () => this.toggleVideo());
        } else {
            console.error('❌ Cannot find videoBtn element');
        }
        
        // Screen share button
        const screenShareBtn = document.getElementById('screenShareBtn');
        if (screenShareBtn) {
            console.log('✅ Found screen share button');
            screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        }
        
        // Chat toggle button
        const chatToggleBtn = document.getElementById('chatToggleBtn');
        if (chatToggleBtn) {
            console.log('✅ Found chat toggle button');
            chatToggleBtn.addEventListener('click', () => this.toggleChat());
        }
        
        // Copy room ID button
        const copyRoomIdBtn = document.getElementById('copyRoomId');
        if (copyRoomIdBtn) {
            console.log('✅ Found copy room ID button');
            copyRoomIdBtn.addEventListener('click', () => this.copyRoomId());
        }
        
        // Leave room button
        const leaveRoomBtn = document.getElementById('leaveRoom');
        if (leaveRoomBtn) {
            console.log('✅ Found leave room button');
            leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }
        
        // Send message button
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            console.log('✅ Found send message button');
            sendMessageBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // Message input Enter key
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        
        // Close chat button
        const closeChatBtn = document.getElementById('closeChatBtn');
        if (closeChatBtn) {
            closeChatBtn.addEventListener('click', () => this.toggleChat());
        }
        
        console.log('✅ All event listeners set up');
    }

    async getUserMedia() {
        try {
            console.log('🎥 Requesting camera and microphone...');
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            console.log('✅ Media access granted');
            this.addLocalVideo();
            
        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            alert('Could not access camera and microphone. Please check permissions.');
            
            // Create a fake video element for testing
            this.createTestVideo();
        }
    }

    addLocalVideo() {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) {
            console.error('❌ Cannot find videoGrid element');
            return;
        }
        
        // Clear existing local video
        const existingVideo = document.getElementById('localVideo');
        if (existingVideo) existingVideo.remove();
        
        // Create video wrapper
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper';
        videoWrapper.id = 'localVideoWrapper';
        
        // Create video element
        const video = document.createElement('video');
        video.id = 'localVideo';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = this.localStream;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        overlay.innerHTML = `
            <span>${this.userName} (You)</span>
            <div class="status-icons">
                <span id="localAudioStatus">🔊</span>
                <span id="localVideoStatus">📹</span>
            </div>
        `;
        
        // Append elements
        videoWrapper.appendChild(video);
        videoWrapper.appendChild(overlay);
        videoGrid.appendChild(videoWrapper);
        
        console.log('✅ Local video added to page');
    }

    createTestVideo() {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;
        
        const testDiv = document.createElement('div');
        testDiv.className = 'video-wrapper';
        testDiv.innerHTML = `
            <div style="background: #333; color: white; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 10px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px;">🎥</div>
                    <div>${this.userName} (You)</div>
                    <div style="font-size: 12px; color: #aaa;">Camera not available</div>
                </div>
            </div>
        `;
        
        videoGrid.appendChild(testDiv);
        console.log('✅ Test video placeholder created');
    }

    toggleAudio() {
        console.log('🔊 Toggling audio...');
        
        if (!this.localStream) {
            console.error('❌ No local stream available');
            return;
        }
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) {
            console.error('❌ No audio track found');
            return;
        }
        
        this.isAudioMuted = !audioTrack.enabled;
        audioTrack.enabled = !this.isAudioMuted;
        
        // Update button
        const muteBtn = document.getElementById('muteBtn');
        const statusIcon = document.getElementById('localAudioStatus');
        
        if (this.isAudioMuted) {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            muteBtn.classList.remove('active');
            if (statusIcon) statusIcon.textContent = '🔇';
            console.log('🔇 Audio muted');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            muteBtn.classList.add('active');
            if (statusIcon) statusIcon.textContent = '🔊';
            console.log('🔊 Audio unmuted');
        }
        
        // Notify server (for future peer connections)
        if (this.socket) {
            this.socket.emit('toggle-audio', this.isAudioMuted);
        }

        // Update all peer connections
        Object.values(this.peers).forEach(call => {
            if (call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (sender) sender.track.enabled = !this.isAudioMuted;
            }
        });
    }

    toggleVideo() {
        console.log('📹 Toggling video...');
        
        if (!this.localStream) {
            console.error('❌ No local stream available');
            return;
        }
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) {
            console.error('❌ No video track found');
            return;
        }
        
        this.isVideoOff = !videoTrack.enabled;
        videoTrack.enabled = !this.isVideoOff;
        
        // Update button
        const videoBtn = document.getElementById('videoBtn');
        const statusIcon = document.getElementById('localVideoStatus');
        
        if (this.isVideoOff) {
            videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
            videoBtn.classList.remove('active');
            if (statusIcon) statusIcon.textContent = '📷❌';
            console.log('📷 Video stopped');
        } else {
            videoBtn.innerHTML = '<i class="fas fa-video"></i>';
            videoBtn.classList.add('active');
            if (statusIcon) statusIcon.textContent = '📹';
            console.log('📹 Video started');
        }
        
        // Notify server (for future peer connections)
        if (this.socket) {
            this.socket.emit('toggle-video', this.isVideoOff);
        }

        // Update all peer connections
        Object.values(this.peers).forEach(call => {
            if (call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.track.enabled = !this.isVideoOff;
            }
        });
    }

    async toggleScreenShare() {
        if (!this.localStream) {
            console.error('❌ No local stream available');
            return;
        }
        if (this.isScreenSharing) {
            // Stop screen sharing and revert to camera
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                const cameraTrack = cameraStream.getVideoTracks()[0];
                const oldTrack = this.localStream.getVideoTracks()[0];
                this.localStream.removeTrack(oldTrack);
                this.localStream.addTrack(cameraTrack);
                document.getElementById('localVideo').srcObject = this.localStream;
                this.isScreenSharing = false;
                document.getElementById('screenShareBtn').innerHTML = '<i class="fas fa-desktop"></i>';
                // Update all peer connections
                Object.values(this.peers).forEach(call => {
                    if (call.peerConnection) {
                        const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) sender.replaceTrack(cameraTrack);
                    }
                });
                if (this.socket) this.socket.emit('screen-sharing', false);
            } catch (error) {
                console.error('❌ Error reverting to camera:', error);
            }
        } else {
            // Start screen sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                const oldTrack = this.localStream.getVideoTracks()[0];
                this.localStream.removeTrack(oldTrack);
                this.localStream.addTrack(screenTrack);
                document.getElementById('localVideo').srcObject = this.localStream;
                this.isScreenSharing = true;
                document.getElementById('screenShareBtn').innerHTML = '<i class="fas fa-stop"></i>';
                // Update all peer connections
                Object.values(this.peers).forEach(call => {
                    if (call.peerConnection) {
                        const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) sender.replaceTrack(screenTrack);
                    }
                });
                if (this.socket) this.socket.emit('screen-sharing', true);
                screenTrack.onended = () => {
                    this.toggleScreenShare();
                };
            } catch (error) {
                console.error('❌ Error sharing screen:', error);
            }
        }
    }

    toggleChat() {
        console.log('💬 Toggling chat...');
        
        const participantsSection = document.getElementById('participantsSection');
        const chatSection = document.getElementById('chatSection');
        
        if (!participantsSection || !chatSection) {
            console.error('❌ Cannot find chat/participants sections');
            return;
        }
        
        if (chatSection.style.display === 'none' || chatSection.style.display === '') {
            participantsSection.style.display = 'none';
            chatSection.style.display = 'flex';
            console.log('💬 Chat shown');
        } else {
            participantsSection.style.display = 'block';
            chatSection.style.display = 'none';
            console.log('👥 Participants shown');
        }
    }

    copyRoomId() {
        console.log('📋 Copying room ID...');
        
        navigator.clipboard.writeText(this.roomId)
            .then(() => {
                console.log('✅ Room ID copied to clipboard:', this.roomId);
                alert('Meeting ID copied to clipboard: ' + this.roomId);
            })
            .catch(err => {
                console.error('❌ Failed to copy:', err);
                // Fallback for older browsers
                const tempInput = document.createElement('input');
                document.body.appendChild(tempInput);
                tempInput.value = this.roomId;
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                alert('Meeting ID copied!');
            });
    }

    leaveRoom() {
        console.log('🚪 Leaving room...');
        
        if (confirm('Are you sure you want to leave the meeting?')) {
            // Stop all media tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            // Disconnect socket
            if (this.socket) {
                this.socket.disconnect();
            }
            
            // Redirect to home
            window.location.href = '/';
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        console.log('📨 Sending message:', message);
        
        // Add to chat UI
        this.addMessage(this.userName, message, true);
        
        // Send via socket (if connected)
        if (this.socket) {
            this.socket.emit('send-message', message);
        }
        
        // Clear input
        messageInput.value = '';
    }

    addMessage(userName, message, isSelf = false) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSelf ? 'self' : ''}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${userName}</strong>
                <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="message-content">${message}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('💬 Message added to chat:', message);
    }

    updateParticipantCount() {
        const participantsList = document.getElementById('participantsList');
        const participantsCount = document.getElementById('participantsCount');
        const participantCount = document.getElementById('participantCount');
        
        // Add self to participants list
        if (participantsList) {
            participantsList.innerHTML = '';
            
            const selfItem = document.createElement('div');
            selfItem.className = 'participant-item';
            selfItem.innerHTML = `
                <div class="participant-avatar">${this.userName.charAt(0)}</div>
                <div class="participant-info">
                    <div class="participant-name">${this.userName} (You)</div>
                    <div class="participant-status">
                        <span id="part-audio-self">🔊</span>
                        <span id="part-video-self">📹</span>
                    </div>
                </div>
            `;
            
            participantsList.appendChild(selfItem);
        }
        
        // Update counts
        if (participantsCount) {
            participantsCount.textContent = '1';
        }
        if (participantCount) {
            participantCount.textContent = '1 participant';
        }
        
        console.log('👥 Participant count updated');
    }

    connectSocket() {
        console.log('🔌 Connecting to socket server...');
        
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('✅ Socket.io connected:', this.socket.id);
                
                // Join room
                this.socket.emit('join-room', this.roomId, this.userId, this.userName);
                console.log('📨 Joined room via socket:', this.roomId);
            });
            
            this.socket.on('user-connected', (data) => {
                console.log('👋 User connected:', data.userId);
                this.addParticipant(data.userId, data.userName);
            });
            
            this.socket.on('user-disconnected', (data) => {
                console.log('👋 User disconnected:', data.userId);
                this.removeParticipant(data.userId);
            });
            
            this.socket.on('receive-message', (data) => {
                console.log('📩 Message received:', data);
                this.addMessage(data.userName, data.message, false);
            });
            
            this.socket.on('room-stats', (data) => {
                console.log('📊 Room stats:', data);
                if (data.participantCount > 1) {
                    this.updateParticipantCountDisplay(data.participantCount);
                }
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
            });

            this.setupSocketListeners();
            
        } catch (error) {
            console.error('❌ Error setting up socket:', error);
        }
    }

    setupSocketListeners() {
        // Handle current participants and call each one
        this.socket.on('current-participants', (participants) => {
            participants.forEach(({ userId, userName }) => {
                const call = this.peer.call(userId, this.localStream);
                call.on('stream', (remoteStream) => {
                    this.addVideoStream(userId, remoteStream);
                });
                this.peers[userId] = call;
                this.addParticipant(userId, userName);
            });
        });

        // When a new user connects, call them
        this.socket.on('user-connected', ({ userId, userName }) => {
            const call = this.peer.call(userId, this.localStream);
            call.on('stream', (remoteStream) => {
                this.addVideoStream(userId, remoteStream);
            });
            this.peers[userId] = call;
            this.addParticipant(userId, userName);
        });

        // User disconnected
        this.socket.on('user-disconnected', (userId) => {
            if (this.peers[userId]) {
                this.peers[userId].close();
                delete this.peers[userId];
            }
            this.removeParticipant(userId);
        });

        // Receive chat message
        this.socket.on('receive-message', ({ userName, message }) => {
            this.addMessage(userName, message);
        });

        // Listen for audio toggles
        this.socket.on('user-audio-toggled', ({ userId, isMuted }) => {
            const audioStatus = document.getElementById(`part-audio-${userId}`);
            if (audioStatus) {
                audioStatus.textContent = isMuted ? '🔇' : '🔊';
            }
            // Optionally update video overlay icon as well
        });

        // Listen for video toggles
        this.socket.on('user-video-toggled', ({ userId, isVideoOff }) => {
            const videoStatus = document.getElementById(`part-video-${userId}`);
            if (videoStatus) {
                videoStatus.textContent = isVideoOff ? '📷❌' : '📹';
            }
            // Optionally hide/show video element
            const videoElem = document.getElementById(`stream-${userId}`);
            if (videoElem) {
                videoElem.style.display = isVideoOff ? 'none' : 'block';
            }
        });
    }

    addParticipant(userId, userName) {
        const participantsList = document.getElementById('participantsList');
        if (!participantsList) return;
        
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        participantItem.id = `participant-${userId}`;
        
        participantItem.innerHTML = `
            <div class="participant-avatar">${userName.charAt(0)}</div>
            <div class="participant-info">
                <div class="participant-name">${userName}</div>
                <div class="participant-status">
                    <span id="part-audio-${userId}">🔊</span>
                    <span id="part-video-${userId}">📹</span>
                </div>
            </div>
        `;
        
        participantsList.appendChild(participantItem);
        this.updateParticipantCountDisplay(participantsList.children.length);
        console.log('👤 Participant added:', userName);
    }

    removeParticipant(userId) {
        const participantElement = document.getElementById(`participant-${userId}`);
        if (participantElement) {
            participantElement.remove();
            this.updateParticipantCountDisplay(
                document.getElementById('participantsList').children.length
            );
            console.log('👤 Participant removed:', userId);
        }
    }

    updateParticipantCountDisplay(count) {
        const participantsCount = document.getElementById('participantsCount');
        const participantCount = document.getElementById('participantCount');
        
        if (participantsCount) participantsCount.textContent = count;
        if (participantCount) {
            participantCount.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        }
        
        console.log('👥 Participant count updated to:', count);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM fully loaded, initializing app...');
    window.videoConference = new VideoConference();
});