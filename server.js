const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { ExpressPeerServer } = require('peer');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);


const peerServer = ExpressPeerServer(server, {
       debug: true,
    path: '/peerjs',
    allow_discovery: true,
    proxied: true,
    ssl: process.env.NODE_ENV === 'production'
});

// Middleware
app.use(express.static('public'));
app.use('/peerjs', peerServer);

// Store active rooms
const rooms = new Map();


// Socket.io Connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId, userName) => {
        // Create room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                participants: new Map(),
                createdAt: new Date()
            });
        }

        const room = rooms.get(roomId);
        
        // Add participant to room
        room.participants.set(userId, {
            socketId: socket.id,
            userName: userName || `User${userId.slice(0, 5)}`,
            audioEnabled: true,
            videoEnabled: true,
            isScreenSharing: false
        });

        socket.join(roomId);

        // Notify others in room
        socket.to(roomId).emit('user-connected', {
            userId,
            userName: userName || `User${userId.slice(0, 5)}`
        });

        // Send current participants to new user
        const participants = Array.from(room.participants.entries())
            .filter(([id]) => id !== userId)
            .map(([id, data]) => ({
                userId: id,
                userName: data.userName
            }));

        socket.emit('current-participants', participants);

        // Update room stats
        io.to(roomId).emit('room-stats', {
            participantCount: room.participants.size,
            roomId: roomId
        });

        // Handle WebRTC signaling
        socket.on('signal', (data) => {
            const targetSocketId = room.participants.get(data.targetUserId)?.socketId;
            if (targetSocketId) {
                io.to(targetSocketId).emit('signal', {
                    from: userId,
                    signal: data.signal,
                    type: data.type
                });
            }
        });

        // Handle chat messages
        socket.on('send-message', (message) => {
            io.to(roomId).emit('receive-message', {
                userId,
                userName: userName || `User${userId.slice(0, 5)}`,
                message,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('screen-sharing', (isSharing) => {
            socket.to(roomId).emit('user-screen-sharing', { userId, isSharing });
        });

        socket.on('toggle-audio', (isMuted) => {
            console.log(`User ${userId} ${isMuted ? 'muted' : 'unmuted'} audio`);
            socket.to(roomId).emit('user-audio-toggled', { userId, isMuted });
        });

        socket.on('toggle-video', (isVideoOff) => {
            console.log(`User ${userId} ${isVideoOff ? 'stopped' : 'started'} video`);
            socket.to(roomId).emit('user-video-toggled', { userId, isVideoOff });
        });

        // Handle chat messages
        socket.on('send-message', (message) => {
            const messageData = {
                userId: userId,
                userName: userName || `User${userId.slice(0, 5)}`,
                message: message,
                timestamp: new Date().toISOString()
            };
            
            console.log(`Chat from ${userId}: ${message}`);
            io.to(roomId).emit('receive-message', messageData);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            
            // Remove from room
            if (room) {
                room.participants.delete(userId);
                
                // Clean empty rooms
                if (room.participants.size === 0) {
                    rooms.delete(roomId);
                } else {
                    socket.to(roomId).emit('user-disconnected', { userId });
                    
                    // Update room stats
                    io.to(roomId).emit('room-stats', {
                        participantCount: room.participants.size,
                        roomId: roomId
                    });
                }
            }
        });
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

app.get('/api/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
        return res.json({ exists: false });
    }
    
    res.json({
        exists: true,
        participantCount: room.participants.size,
        createdAt: room.createdAt
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`PeerJS server running on /peerjs`);
});