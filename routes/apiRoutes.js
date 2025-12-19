const express = require('express');
const router = express.Router();

// API endpoints
router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Video Conferencing API is running' });
});

router.get('/stats', (req, res) => {
    res.json({
        app: 'Video Conferencing',
        version: '1.0.0',
        features: ['Video Calls', 'Audio Calls', 'Screen Sharing', 'Chat', 'Multiple Participants']
    });
});

module.exports = router;