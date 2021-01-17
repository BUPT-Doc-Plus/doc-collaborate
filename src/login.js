const writable = {};
const readable = {};
const { getAccess } = require('./dao/Author');

const clients = {};

function login(ws, userId) {
    if (clients[userId] === undefined) {
        clients[userId] = [];
    }
    clients[userId].push(ws);
    ws.onmessage = (e) => {
        let { token, docId }  = JSON.parse(e.data);
        if (writable[userId] && writable[userId][docId]) {
            ws.send("w");
            return;
        }
        if (readable[userId] && readable[userId][docId]) {
            ws.send("r");
            return;
        }
        getAccess(docId, userId, token).then((role) => {
            if (role === 0) {
                push(readable, userId, docId);
                ws.send("r");
            } else {
                push(writable, userId, docId);
                ws.send("w");
            }
        }).catch((err) => {
            ws.send("n");
        })
    }
    ws.onclose = () => {
        remove(readable, userId);
        remove(writable, userId);
        clients[userId].splice(clients[userId].indexOf(ws), 1);
    }
}

function push(container, userId, docId) {
    if (container[userId] === undefined) {
        container[userId] = {};
    }
    container[userId][docId] = true;
}

function remove(container, userId, docId) {
    if (container[userId] && container[userId][docId]) {
        delete container[userId][docId];
    }
}

function remove(container, userId) {
    if (container[userId]) {
        delete container[userId];
    }
}

module.exports = { writable, readable, login, push, remove, clients }
