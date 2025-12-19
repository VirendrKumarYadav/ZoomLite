const roomController = require('../controllers/roomController');

module.exports = function socketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('New user connected:', socket.id);

        // Join room
        socket.on('join-room', (roomId, userId, userName) => {
            // Validate room
            if (!roomController.addParticipant(roomId, userId, socket.id)) {
                socket.emit('room-error', 'Invalid room or room is full');
                return;
            }

            socket.join(roomId);
            
            // Notify others in the room
            socket.to(roomId).emit('user-connected', {
                userId,
                userName: userName || `User_${userId.substring(0, 5)}`
            });

            // Send current participants to the new user
            const participants = roomController.getRoomParticipants(roomId)
                .filter(p => p.id !== userId)
                .map(p => ({
                    id: p.id,
                    userName: p.userName || `User_${p.id.substring(0, 5)}`
                }));

            socket.emit('current-participants', participants);

            console.log(`${userId} joined room ${roomId}`);
            
            // Update room stats
            const roomParticipants = roomController.getRoomParticipants(roomId);
            io.to(roomId).emit('participants-updated', {
                count: roomParticipants.length,
                participants: roomParticipants.map(p => ({
                    id: p.id,
                    userName: p.userName || `User_${p.id.substring(0, 5)}`
                }))
            });

            // Handle signaling for WebRTC
            socket.on('signal', (data) => {
                socket.to(data.targetUserId).emit('signal', {
                    senderId: userId,
                    signal: data.signal,
                    type: data.type
                });
            });

            // Handle chat messages
            socket.on('send-message', (messageData) => {
                const message = {
                    id: Date.now(),
                    userId,
                    userName: userName || `User_${userId.substring(0, 5)}`,
                    text: messageData.text,
                    timestamp: new Date().toISOString(),
                    type: messageData.type || 'text'
                };

                io.to(roomId).emit('receive-message', message);
            });

            // Handle media controls
            socket.on('toggle-audio', (isMuted) => {
                roomController.updateParticipant(roomId, userId, { audioEnabled: !isMuted });
                socket.to(roomId).emit('user-audio-toggled', { userId, isMuted });
            });

            socket.on('toggle-video', (isVideoOff) => {
                roomController.updateParticipant(roomId, userId, { videoEnabled: !isVideoOff });
                socket.to(roomId).emit('user-video-toggled', { userId, isVideoOff });
            });

            socket.on('screen-sharing', (isSharing) => {
                roomController.updateParticipant(roomId, userId, { isScreenSharing: isSharing });
                socket.to(roomId).emit('user-screen-sharing', { userId, isSharing });
            });

            // Handle raise hand
            socket.on('raise-hand', () => {
                socket.to(roomId).emit('user-raised-hand', { userId });
            });

            // Handle user typing
            socket.on('typing', (isTyping) => {
                socket.to(roomId).emit('user-typing', { userId, isTyping });
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                
                roomController.removeParticipant(roomId, userId);
                
                socket.to(roomId).emit('user-disconnected', { userId });
                
                // Update room stats
                const roomParticipants = roomController.getRoomParticipants(roomId);
                io.to(roomId).emit('participants-updated', {
                    count: roomParticipants.length,
                    participants: roomParticipants.map(p => ({
                        id: p.id,
                        userName: p.userName || `User_${p.id.substring(0, 5)}`
                    }))
                });
            });

            // Handle leave room
            socket.on('leave-room', () => {
                socket.leave(roomId);
                roomController.removeParticipant(roomId, userId);
                socket.to(roomId).emit('user-disconnected', { userId });
                
                const roomParticipants = roomController.getRoomParticipants(roomId);
                io.to(roomId).emit('participants-updated', {
                    count: roomParticipants.length,
                    participants: roomParticipants.map(p => ({
                        id: p.id,
                        userName: p.userName || `User_${p.id.substring(0, 5)}`
                    }))
                });
            });
        });

        // Handle peer connection offer
        socket.on('offer', (data) => {
            socket.to(data.target).emit('offer', {
                sdp: data.sdp,
                sender: socket.id,
                type: data.type
            });
        });

        // Handle peer connection answer
        socket.on('answer', (data) => {
            socket.to(data.target).emit('answer', {
                sdp: data.sdp,
                sender: socket.id
            });
        });

        // Handle ICE candidates
        socket.on('ice-candidate', (data) => {
            socket.to(data.target).emit('ice-candidate', {
                candidate: data.candidate,
                sender: socket.id
            });
        });

        // Handle peer connection errors
        socket.on('peer-error', (error) => {
            console.error('Peer connection error:', error);
        });
    });
};