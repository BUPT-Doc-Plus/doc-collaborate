const clients = {};
const { sendMessage } = require("./dao/Chat");

function chat(ws, userId, token) {
    if (clients[userId] === undefined) {
        clients[userId] = [];
    }
    clients[userId].push(ws);
    ws.onmessage = (e) => {
        let { sender, receiver, msg } = JSON.parse(e.data);
        sendMessage(sender, receiver, msg, token).then((resp) => {
            let chat_id = resp.data.data.chat_id;
            let outMsg = {...JSON.parse(e.data), chat_id};
            outMsg = JSON.stringify(outMsg);
            if (clients[receiver.id]) {
                for (let client of clients[receiver.id]) {
                    client.send(outMsg);
                }
                for (let client of clients[sender.id]) {
                    client.send(outMsg);
                }
            }
        })
    }
    ws.onclose = () => {
        clients[userId].splice(clients[userId].indexOf(ws), 1);
    }
}

module.exports = { chat }
