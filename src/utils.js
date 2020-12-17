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

async function getDocDetail(children, token, index=0) {
    let urlOf = (docId) => `http://${config.biz.host}/doc/${docId}?token=V20xV2JGcHRXWGhaZW1zd1RUSldiVTlIVFRST2FrazBUWHBDYVUxNlVUUk5WRlpzVFdwTmVVMXFWVDA9`;
    await new Promise((resolve) => {
        console.log(children[index]);
        if (children[index].id) {
            axios.get(urlOf(children[index].id)).then((resp) => {
                children[index] = resp.data.data;
                resolve();
            }).catch((e) => {
                resolve();
            });
        } else {
            resolve();
        }
    });
    let child = children[index];
    if (child.children) {
        await getDocDetail(child.children, token);
    }
    if (children[index + 1]) {
        await getDocDetail(children, token, index + 1);
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
