const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Home page
router.get('/', roomController.getHomePage);

// Create new room
router.get('/create', roomController.createRoom);

// Join existing room
router.get('/join', roomController.getJoinPage);

// Room page
router.get('/room/:roomId', roomController.getRoomPage);

// Validate room
router.get('/api/validate-room/:roomId', roomController.validateRoom);

module.exports = router;