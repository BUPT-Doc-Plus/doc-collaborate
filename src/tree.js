const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const { sortTree, getDocDetail, countDocInTree } = require('./utils');
const { FileTree } = require('./file/FileTree');
const { getDocTree, saveDocTree } = require("./dao/DocTree");

// 客户端引用计数
const clients = {};

function tree(backend, connection, ws, type, userId, token) {
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
            rootTree = new FileTree(root);
            doc.submitOp({
                p: [],
                oi: rootTree
            });
            var docsInTree = countDocInTree(root.children);
            var count = docsInTree;
            console.log(count);
            if (count === 0) {
                doc.submitOp({
                    p: ["loaded"],
                    oi: true
                })
            } else {
                getDocDetail(root.children, token, ["root", "children"], 0, (p, content, success) => {
                    if (!success) {
                        // 文件已因为种种原因失效，直接移除
                        doc.submitOp({
                            p,
                            od: content
                        })
                    } else {
                        doc.submitOp({
                            p,
                            od: content,
                            oi: content
                        })
                    }
                    doc.submitOp({
                        p: ["loaded"],
                        oi: 1 - count / docsInTree
                    })
                    if (--count === 0) {
                        doc.submitOp({
                            p: ["loaded"],
                            oi: true
                        })
                    }
                })
            }
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
        doc.fetch((err) => {
            if (err) throw err;
            saveDocTree(userId, JSON.stringify(doc.data.root), token).then((resp) => {
                console.log(`[Saved] doc tree ${userId} saved to db`);
            }).catch((err) => {
                console.error(`[Saving Failed] doc tree ${userId} failed saving to db`);
            })
        })
    })
}

module.exports = { tree };
