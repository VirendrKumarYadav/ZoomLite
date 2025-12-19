document.addEventListener('DOMContentLoaded', () => {
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomIdInput = document.getElementById('roomIdInput');

    // Generate random room ID
    function generateRoomId() {
    return Math.random().toString(16).substring(2, 10).toUpperCase();
}

    // Create new room
    createRoomBtn.addEventListener('click', () => {
        const roomId = generateRoomId();
        const userId = 'user_' + Math.random().toString(36).substring(2, 9);
        
        // Generate a random username
        const usernames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];
        const randomName = usernames[Math.floor(Math.random() * usernames.length)];
        
        window.location.href = `/room/${roomId}?userId=${userId}&userName=${randomName}`;
    });

    // Join existing room
    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim().toUpperCase();
        
        if (!roomId) {
            alert('Please enter a meeting ID');
            return;
        }

        // Validate room ID format
        if (roomId.length < 4) {
            alert('Meeting ID must be at least 4 characters');
            return;
        }

        // Check if room exists
        fetch(`/api/room/${roomId}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    const userId = 'user_' + Math.random().toString(36).substring(2, 9);
                    const usernames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];
                    const randomName = usernames[Math.floor(Math.random() * usernames.length)];
                    
                    window.location.href = `/room/${roomId}?userId=${userId}&userName=${randomName}`;
                } else {
                    alert('Meeting not found. Please check the ID or create a new meeting.');
                }
            })
            .catch(error => {
                console.error('Error checking room:', error);
                alert('Error checking meeting. Please try again.');
            });
    });

    // Allow pressing Enter to join
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
});