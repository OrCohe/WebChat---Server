var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');
var port = process.env.NODE_PORT;

http.listen(port, function() {
    console.log('Server Started. Listening on *:' + port);
});
let connectedUsers = {}
let connectedUsersID = {}
let connectedUsersName = {}

io.on('connection', (socket) => {
    const client = redis.createClient();
    socket.on('SEND_MESSAGE', (data) => {
        io.to(connectedUsersName[data.to]).emit(`RECEIVE_MESSAGE_${data.to}`, data);
    })
    socket.on('LOGIN', (data) => {
        if (connectedUsersName[data.name]) {
            return socket.emit(`LOGIN_${data.name}`, {status: false, name: data.name, password: data.password});
        }
        if (data.password.trim().length > 3 && data.name.trim().length > 1) {
            client.hget('user',data.name, (err, obj) => {
                if (obj) {
                    if (obj === data.password) {
                        const newUser = {[data.name]: {history: [], logged: true}};
                        const newUserID = {[socket.id]: data.name};
                        const newUserName = {[data.name]: socket.id};
                        connectedUsers = {...connectedUsers, ...newUser};
                        connectedUsersID = {...connectedUsersID, ...newUserID};
                        connectedUsersName = {...connectedUsersName, ...newUserName}
                        socket.emit(`LOGIN_${data.name}`, {status: true, name: data.name, password: data.password});
                        socket.emit('CONNECTED_USERS', connectedUsers);
                        socket.broadcast.emit('NEW_USER', data.name);
                    } else {
                        socket.emit(`LOGIN_${data.name}`, {status: false, name: data.name, password: data.password});
                    }
                } else {
                    const newUser = {[data.name]: {history: [], logged: true}};
                    const newUserID = {[socket.id]: data.name};
                    const newUserName = {[data.name]: socket.id};
                    connectedUsers = {...connectedUsers, ...newUser};
                    connectedUsersID = {...connectedUsersID, ...newUserID};
                    connectedUsersName = {...connectedUsersName, ...newUserName}
                    client.hset('user',data.name, data.password);
                    socket.emit(`LOGIN_${data.name}`, {status: true, name: data.name, password: data.password});
                    socket.emit('CONNECTED_USERS', connectedUsers);
                    socket.broadcast.emit('NEW_USER', data.name);
                }
            })
        }
    })
    socket.on('LOGOUT', () => {
        const name = connectedUsersID[socket.id];
        delete connectedUsersName[name];
        delete connectedUsersID[socket.id];
        delete connectedUsers[name];
        io.emit('DROP_USER', name);
    })
    socket.on('disconnect', () => {
        const name = connectedUsersID[socket.id];
        delete connectedUsersName[name];
        delete connectedUsersID[socket.id];
        delete connectedUsers[name];
        io.emit('DROP_USER', name);
    })
});