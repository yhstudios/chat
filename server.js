const fs = require('fs');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// User codes (these should be unique for each user)
let users = {
    'Yehuda': '1234',  // user1's code
    'Daniel': '5678',   // user2's code
    'Unknown': 'moshe'
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
    console.log('A user connected.');

    // Authentication
    socket.on('authenticate', (code) => {
        const user = Object.keys(users).find(user => users[user] === code);
        
        if (!user) {
            socket.emit('authError', 'Invalid code.');
            socket.disconnect();
            return;
        }

        connectedUsers[socket.id] = user;
        socket.emit('authSuccess', user);

        // Send chat history to the new user
        socket.emit('chatHistory', messages);

        // Listen for incoming messages from this user
        socket.on('message', (msg) => {
            const fullMsg = { user, time: Date.now(), text: msg };
            messages.push(fullMsg);
            saveMessages();
/*
            if (Notification.permission === "granted") {
                new Notification("Hello!", { body: "This is a test notification." });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Hello!", { body: "Thanks for allowing notifications!" });
                    } else {
                        alert("Notification permission denied.");
                    }
                });
            }
    */
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
            console.log(`${user} disconnected.`);
        });
    });
});

// Use Glitch's or other host's dynamic port
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
