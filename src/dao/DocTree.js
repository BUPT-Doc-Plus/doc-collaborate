const axios = require("axios").default;
const config = require("../../server.config");

function getDocTree(authorId, token) {
    return axios.get(
        `http://${config.biz.host}/doctree/${authorId}?token=${token}`);
}

function saveDocTree(authorId, content, token) {
    return axios.post(
        `http://${config.biz.host}/doctree/${authorId}?token=${token}`, { content });
}

module.exports = { getDocTree, saveDocTree };
