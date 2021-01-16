const writable = {};
const readable = {};
const { getAccess } = require('./dao/Author');

function login(ws, userId) {
    ws.onmessage = (e) => {
        let { token, docId }  = JSON.parse(e.data);
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
    }
}

function push(container, userId, docId) {
    if (container[userId] === undefined) {
        container[userId] = {};
    }
    container[userId][docId] = true;
}

function remove(container, userId) {
    delete container[userId];
}

module.exports = { writable, readable, login }
