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

function countDocInTree(children) {
    let r = 0;
    for (let key in children) {
        if (children[key].children) {
            r += countDocInTree(children[key].children);
        } else {
            r += 1;
        }
    }
    return r;
}

function getDocDetail(children, token, path, keyIndex=0, eachCallback = (p, content, success) => {}) {
    let urlOf = (docId) => `http://${config.biz.host}/doc/${docId}?token=${token}`;
    let keys = Object.keys(children);
    if (keys.length === 0) return;
    let key = keys[keyIndex];
    if (children[key].id) {
        axios.get(urlOf(children[key].id)).then((resp) => {
            resp.data.data.path = children[key].path;
            Object.assign(children[key], resp.data.data);
            eachCallback(path.concat(key), children[key], true);
        }).catch((err) => {
            eachCallback(path.concat(key), children[key], false);
        })
    }
    if (children[key].children) {
        getDocDetail(children[key].children, token, path.concat([key, "children"]), 0, eachCallback);
    }
    if (children[keys[keyIndex + 1]]) {
        getDocDetail(children, token, path, keyIndex + 1, eachCallback);
    }
}

function getQueryParams(url) {
    var result = {};
    var half = url.split("?")[1]
    if (half === undefined) return result;
    var pairs = half.split("&");
    for (let pair of pairs) {
        let [key, value] = pair.split("=");
        result[key] = value;
    }
    return result;
}

module.exports = { sortTree, getDocDetail, getQueryParams, countDocInTree };
