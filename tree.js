const config = require('./server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const redis = require('redis');

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
        console.log(doc.data);
        if (doc.type !== null) {
            console.log(`[Loading] ${type} tree of user ${userId} loaded from memory`);
            backend.listen(new WebSocketJSONStream(ws));
        } else {
            // 新建树
            console.log(`[Loading] redis missing, create new ${type} tree of user ${userId}`);
            let mockTree = {
                children: [
                    {
                        id: 1,
                        label: "算法",
                        creator: 1,
                        collaborators: null,
                        show: false,
                        children: [
                            { id: 2, label: "动态规划", type: "rich-text", creator: 1, collaborators: [2, 3] },
                            { id: 3, label: "二叉树", type: "rich-text", creator: 1, collaborators: [2, 3] },
                        ]
                    },
                    {
                        id: 4,
                        label: "计算机网络",
                        creator: 1,
                        collaborators: null,
                        show: false,
                        children: [
                            { id: 5, label: "TCP协议", type: "rich-text", creator: 1, collaborators: [2, 3] },
                            { id: 6, label: "HTTP协议", type: "rich-text", creator: 1, collaborators: [2, 3] },
                        ]
                    },
                ]
            };
            console.log(mockTree);
            doc.create(mockTree, function () {
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
