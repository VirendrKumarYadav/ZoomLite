const crypto = require('crypto');

// Generate random room ID
function generateRoomId() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Validate room ID format
function isValidRoomId(roomId) {
    return /^[A-Z0-9]{8}$/.test(roomId);
}

// Generate user ID
function generateUserId() {
    return 'user_' + crypto.randomBytes(4).toString('hex');
}

// Format time
function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Create data channel message
function createDataChannelMessage(type, data) {
    return {
        id: Date.now(),
        type,
        data,
        timestamp: new Date().toISOString()
    };
}

// Validate media constraints
function validateMediaConstraints(constraints) {
    const validConstraints = {};
    
    if (constraints.video) {
        validConstraints.video = constraints.video === true ? true : {
            width: constraints.video.width || 1280,
            height: constraints.video.height || 720,
            frameRate: constraints.video.frameRate || 30
        };
    }
    
    if (constraints.audio) {
        validConstraints.audio = constraints.audio === true ? true : {
            echoCancellation: constraints.audio.echoCancellation !== false,
            noiseSuppression: constraints.audio.noiseSuppression !== false,
            autoGainControl: constraints.audio.autoGainControl !== false
        };
    }
    
    return validConstraints;
}

// Calculate bandwidth usage
function calculateBandwidth(stats) {
    if (!stats) return 0;
    
    let totalBytes = 0;
    if (stats.bytesSent) totalBytes += stats.bytesSent;
    if (stats.bytesReceived) totalBytes += stats.bytesReceived;
    
    return totalBytes;
}

module.exports = {
    generateRoomId,
    isValidRoomId,
    generateUserId,
    formatTime,
    createDataChannelMessage,
    validateMediaConstraints,
    calculateBandwidth
};