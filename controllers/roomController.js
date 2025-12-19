const { v4: uuidv4 } = require('uuid');
const { generateRoomId, isValidRoomId } = require('../utils/helpers');

// Store active rooms (in production, use Redis or database)
const activeRooms = new Map();

class RoomController {
    // Home page
    getHomePage(req, res) {
        res.sendFile('index.html', { root: './public' });
    }

    // Create new room
    createRoom(req, res) {
        const roomId = generateRoomId();
        const userId = `user_${uuidv4().substring(0, 8)}`;
        
        // Create room with initial data
        activeRooms.set(roomId, {
            id: roomId,
            createdAt: new Date(),
            participants: [],
            maxParticipants: 10,
            settings: {
                allowScreenShare: true,
                allowChat: true,
                requireAuth: false
            }
        });

        // Redirect to room with user ID
        res.redirect(`/room/${roomId}?userId=${userId}`);
    }

    // Get join page
    getJoinPage(req, res) {
        res.sendFile('join.html', { root: './public' });
    }

    // Room page
    getRoomPage(req, res) {
        const { roomId } = req.params;
        const { userId } = req.query;
        
        if (!roomId || !userId) {
            return res.redirect('/');
        }

        // Validate room exists
        if (!activeRooms.has(roomId)) {
            // Create room if it doesn't exist
            activeRooms.set(roomId, {
                id: roomId,
                createdAt: new Date(),
                participants: [],
                maxParticipants: 10,
                settings: {
                    allowScreenShare: true,
                    allowChat: true,
                    requireAuth: false
                }
            });
        }

        res.sendFile('room.html', { root: './public' });
    }

    // Validate room
    validateRoom(req, res) {
        const { roomId } = req.params;
        
        if (!isValidRoomId(roomId)) {
            return res.json({ valid: false, message: 'Invalid room ID format' });
        }

        const room = activeRooms.get(roomId);
        
        if (!room) {
            return res.json({ valid: false, message: 'Room does not exist' });
        }

        if (room.participants.length >= room.maxParticipants) {
            return res.json({ valid: false, message: 'Room is full' });
        }

        res.json({ 
            valid: true, 
            roomId, 
            participants: room.participants.length,
            maxParticipants: room.maxParticipants 
        });
    }

    // Get all active rooms (for monitoring)
    getAllRooms(req, res) {
        const rooms = [];
        activeRooms.forEach((room, id) => {
            rooms.push({
                id,
                participants: room.participants.length,
                createdAt: room.createdAt,
                maxParticipants: room.maxParticipants
            });
        });
        
        res.json({ rooms });
    }

    // Add participant to room
    addParticipant(roomId, userId, socketId) {
        if (!activeRooms.has(roomId)) {
            return false;
        }

        const room = activeRooms.get(roomId);
        const participant = {
            id: userId,
            socketId,
            joinedAt: new Date(),
            audioEnabled: true,
            videoEnabled: true,
            isScreenSharing: false
        };

        room.participants.push(participant);
        activeRooms.set(roomId, room);
        return true;
    }

    // Remove participant from room
    removeParticipant(roomId, userId) {
        if (!activeRooms.has(roomId)) {
            return false;
        }

        const room = activeRooms.get(roomId);
        room.participants = room.participants.filter(p => p.id !== userId);
        activeRooms.set(roomId, room);

        // Clean up empty rooms
        if (room.participants.length === 0) {
            setTimeout(() => {
                if (activeRooms.get(roomId)?.participants.length === 0) {
                    activeRooms.delete(roomId);
                }
            }, 5000); // Remove room after 5 seconds if still empty
        }

        return true;
    }

    // Get room participants
    getRoomParticipants(roomId) {
        const room = activeRooms.get(roomId);
        return room ? room.participants : [];
    }

    // Update participant settings
    updateParticipant(roomId, userId, updates) {
        if (!activeRooms.has(roomId)) {
            return false;
        }

        const room = activeRooms.get(roomId);
        const participantIndex = room.participants.findIndex(p => p.id === userId);
        
        if (participantIndex === -1) {
            return false;
        }

        room.participants[participantIndex] = {
            ...room.participants[participantIndex],
            ...updates
        };

        activeRooms.set(roomId, room);
        return true;
    }
}

module.exports = new RoomController();