const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const { sortTree, getDocDetail } = require('./utils');
const { FileTree } = require('./file/FileTree');
const { getDocTree, saveDocTree } = require("./dao/DocTree");

// 客户端引用计数
const clients = {};

async function tree(backend, connection, ws, type, userId, token) {
    if (clients[userId] === undefined) {
        clients[userId] = 0;
    }
    ++clients[userId];
    // 从ShareDB加载树
    var doc = connection.get('tree-' + type, '' + userId);
    console.log(`[Loading] loading ${type} tree of user ${userId} from memory`);
    doc.fetch(function (err) {
        if (err) {
            throw err;
        }
        // 新建树
        var rootTree = {};
        console.log(`[Loading] memory missing, create new ${type} tree of user ${userId}`);
        getDocTree(userId, token).then((resp) => {
            let root = resp.data.data.content;
            root = JSON.parse(root);
            sortTree(root);
            return root;
        }).then((root) => {
            getDocDetail(root.children, token).then(() => {
                rootTree = new FileTree(root);
                doc.submitOp({
                    p: [],
                    oi: rootTree
                });
            })
        })
        doc.create(rootTree, function () {
            console.log(`[Loading] new ${type} tree of user ${userId} created`);
            backend.listen(new WebSocketJSONStream(ws));
        })
    });
    ws.on('error', function (err) {
        throw err;
    });
    ws.on('close', function () {
        --clients[userId];
        console.log(`[Saving] saving doc tree ${userId} to db`);
        doc.fetch((err) => {
            if (err) throw err;
            saveDocTree(userId, JSON.stringify(doc.data.root), token).then((resp) => {
                console.log(`[Saved] doc tree ${userId} saved to db`);
            }).catch((err) => {
                console.err(`[Saving Failed] doc tree ${userId} failed saving to db`);
            })
        })
    })
}

module.exports = { tree };
