const axios = require("axios").default;
const config = require("../../server.config");

function getAccess(docId, userId, token) {
    return new Promise((resolve, reject) => {
        axios.get(`http://${config.biz.host}/reveal/?token=${token}`).then((resp) => {
            if (userId != resp.data.data.id) {
                reject(resp);
                return;
            }
            axios.get(`http://${config.biz.host}/invite/?author_id=${userId}&doc_id=${docId}&token=${token}`).then((resp) => {
                let role = resp.data.data.role;
                resolve(role);
            }).catch((err) => {
                reject(err);
            })
        }).catch((err) => {
            reject(err);
        })
    })
}

module.exports = { getAccess };
