const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const { sortTree, getDocDetail } = require('./utils');
const { FileTree } = require('./file/FileTree');

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
        if (doc.type !== null) {
            console.log(`[Loading] ${type} tree of user ${userId} loaded from memory`);
            backend.listen(new WebSocketJSONStream(ws));
        } else {
            // 新建树
            console.log(`[Loading] memory missing, create new ${type} tree of user ${userId}`);
            let root = {
                children: {
                    "0": {
                        label: "算法",
                        show: false,
                        children: {
                            "0": {
                                label: "计算机网络",
                                show: false,
                                children: {
                                    "0": { id: 2 },
                                    "1": { id: 3 },
                                }
                            },
                            "1": { id: 1 },
                        }
                    },
                }
            }
            sortTree(root);
            getDocDetail(root.children, token).then(() => {
                let rootTree = new FileTree(root);
                doc.submitOp({
                    p: [],
                    oi: rootTree
                });
            })
            doc.create({}, function() {
                console.log(`[Loading] new ${type} tree of user ${userId} created`);
                backend.listen(new WebSocketJSONStream(ws));
            })
        }
    });
    ws.on('error', function (err) {
        throw err;
    });
    ws.on('close', function () {
        --clients[userId];
    })
}

module.exports = { tree };
