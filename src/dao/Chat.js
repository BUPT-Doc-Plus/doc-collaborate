const axios = require("axios").default;
const config = require("../../server.config");

function sendMessage(sender, receiver, msg, token) {
    return axios.post(`http://${config.biz.host}/chat/?token=${token}`, {
        sender: sender.id, receiver: receiver.id, msg
    });
}

module.exports = { sendMessage };