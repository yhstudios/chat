const fs = require('fs');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// User codes (these should be unique for each user)
let users = {
    'Yehuda': { code: 'jaxson' },
    'Daniel': { code: '5678' }, 
    'Yosef': { code: 'r0B10x' },
    'Levy': { code: '3764' },
};

let connectedUsers = {};
let messages = [];

// Load messages from file
try {
    const data = fs.readFileSync('messages.json');
    messages = JSON.parse(data);
} catch (err) {
    messages = [];
}


// Save messages to file
function saveMessages() {
    fs.writeFileSync('messages.json', JSON.stringify(messages, null, 2));
}

app.use(express.static('public'));

io.on('connection', (socket) => {

    // Authentication
    socket.on('authenticate', (code) => {
        const user = Object.keys(users).find(user => users[user].code === code);
        
        if (!user) {
            socket.emit('authError', 'Invalid code.');
            return;
        }

        if (messages.length === 0) {
            socket.emit('errorMessage', 'Failed to load chat history. Please try again later.');
        }

        connectedUsers[socket.id] = user;
        socket.emit('authSuccess', user);
        
        // Send chat history to the new user
        socket.emit('chatHistory', messages);

        // Listen for incoming messages from this user
        socket.on('message', (msg) => {
            const fullMsg = { user, timestamp: new Date().toLocaleString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }).replace(/(\w+)\s(\d)/, '$1, $2'), text: msg };
            messages.push(fullMsg);
            saveMessages();

            // Broadcast the message to other users (excluding the sender)
            for (let [id] of Object.entries(connectedUsers)) {
                if (id !== socket.id) {
                    io.to(id).emit('message', fullMsg);
                }
            }
                
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            delete connectedUsers[socket.id];
        });
    });
});


app.get('/debug/messages', (req, res) => {
    res.json(messages);
});

// Use Glitch's or other host's dynamic port
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.stack || err);
    io.emit('errorMessage', 'A server error occurred. Please try again later.');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    io.emit('errorMessage', 'A server error occurred. Please try again later.');
});
