const config = require("../server.config");
const axios = require("axios").default;

function sortTree(root) {
    let result = {};
    Object.keys(root).sort().map(key => {
        result[key] = root[key];
    });
    for (let key in root) {
        if (root[key].children) {
            sortTree(root[key].children);
        }
    }
}

async function getDocDetail(children, token, keyIndex=0) {
    let urlOf = (docId) => `http://${config.biz.host}/doc/${docId}?token=V20xV2JGcHRXWGhaZW1zd1RUSldiVTlIVFRST2FrazBUWHBDYVUxNlVUUk5WRlpzVFdwTmVVMXFWVDA9`;
    let keys = Object.keys(children);
    let key = keys[keyIndex];
    await new Promise((resolve) => {
        if (children[key].id) {
            axios.get(urlOf(children[key].id)).then((resp) => {
                children[key] = resp.data.data;
                resolve();
            }).catch((e) => {
                resolve();
            });
        } else {
            resolve();
        }
    });
    if (children[key].children) {
        await getDocDetail(children[key].children, token);
    }
    if (children[keys[keyIndex + 1]]) {
        await getDocDetail(children, token, keyIndex + 1);
    }
}

function getQueryParams(url) {
    var result = {};
    var pairs = url.split("?")[1].split("&");
    for (let pair of pairs) {
        let [key, value] = pair.split("=");
        result[key] = value;
    }
    return result;
}

module.exports = { sortTree, getDocDetail, getQueryParams };
