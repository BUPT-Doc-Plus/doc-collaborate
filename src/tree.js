const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const redis = require('redis');
const { sortTree } = require('./utils');
const { FileTree } = require('./file/FileTree');

// 客户端引用计数
const clients = {};
// 定时任务引用
const taskRefs = {};
// Redis
const redisClient = redis.createClient(config.redis.port, config.redis.host);
redisClient.auth(config.redis.auth);

function tree(backend, connection, ws, type, userId) {
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
                    "算法": {
                        id: 1,
                        label: "算法",
                        creator: 1,
                        collaborators: null,
                        show: false,
                        children: {
                            "动态规划": { id: 2, label: "动态规划", type: "rich-text", creator: 1, collaborators: [2, 3] },
                            "二叉树": { id: 3, label: "二叉树", type: "rich-text", creator: 1, collaborators: [2, 3] },
                        }
                    },
                    "计算机网络": {
                        id: 4,
                        label: "计算机网络",
                        creator: 1,
                        collaborators: null,
                        show: false,
                        children: {
                            "七层协议": {
                                id: 7, label: "七层协议", creator: 1, collaborators: null, show: false, children: {
                                    "TCP协议": { id: 5, label: "TCP协议", type: "rich-text", creator: 1, collaborators: [2, 3] },
                                    "HTTP协议": { id: 6, label: "HTTP协议", type: "rich-text", creator: 1, collaborators: [2, 3] },
                                }
                            }
                        }
                    }
                }
            }
            sortTree(root);
            rootTree = new FileTree(root);
            doc.create(rootTree, function () {
                console.log(`[Loading] new ${type} tree of user ${userId} created`);
                backend.listen(new WebSocketJSONStream(ws));
            });
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
