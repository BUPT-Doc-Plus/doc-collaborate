const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const { readable, writable } = require('./login');

// 客户端引用计数
const clients = {};

function checkPermission(ws, userId, docId) {
    if ((!readable[userId] || !readable[userId][docId]) && (!writable[userId] || !writable[userId][docId])) {
        ws.close()
        return false;
    }
    if (!writable[userId] || !writable[userId][docId]) {
        let onmessage = ws.onmessage;
        ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            if (data.a === "hs") {
                // 允许握手消息
                onmessage(e);
            } else {
                // 第一次必需的操作消息发送后，不再允许操作消息
                onmessage(e);
                ws.onmessage = () => {};
            }
        }
    }
    return true;
}

function collaborate(backend, connection, ws, docId, userId, token, type="rich-text") {
    // 引用计数+1
    if (clients[docId] === undefined) {
        clients[docId] = [];
    }
    // 从ShareDB加载文档
    var doc = connection.get('document', '' + docId);
    clients[docId].push(doc);
    console.log(`[Loading] loading doc ${docId} from memory`);
    doc.fetch(function (err) {
        if (err) {
            throw err;
        }
        let stream = new WebSocketJSONStream(ws);
        if (!checkPermission(ws, userId, docId)) {
            return;
        }
        if (doc.type !== null) {
            console.log(`[Loading] doc ${docId} loaded from memory`);
            backend.listen(stream);
        } else {
            // 新建文档
            doc.create([], 'rich-text', function () {
                console.log('[Loading] new doc (rich-text) created');
                backend.listen(stream);
            });
        }
        doc.on("op", (op, source) => {
            checkPermission(ws, userId, docId)
        })
    });
    ws.on('error', function (err) {
        throw err;
    });
    ws.on('close', function () {
        // 引用计数-1
        clients[docId].splice(clients[docId].indexOf(doc), 1);
        doc.fetch((err) => {
            if (err) {
                throw err;
            }
            if (clients[docId].length === 0) {
                // 客户端全部下线时
            }
        })
    })

    /**
     * shareDB中的文档与数据库中的对比, Promise返回diff, 返回null表示未发生变化
     */
    function diffWithCentralServer() {
        return getDeltasByDocId(docId).then(history => {
            if (doc.data.ops.length === 0) return null;
            let current = getCurrent();
            console.log(`[Current] ${JSON.stringify(current)}`);
            console.log(`[History] ${JSON.stringify(history)}`);
            let diff = history.diff(current);
            if (diff.ops.length === 0) return null;
            return diff;
        })
    }

    /**
     * Promise返回应向后端请求的数据格式, 返回null表示不需要向后端请求
     */
    function parseRequest() {
        return diffWithCentralServer().then((diff) => {
            if (diff !== null) {
                return JSON.stringify({
                    deltas: JSON.stringify([{
                        docid: docId,
                        content: JSON.stringify(diff)
                    }])
                });
            } else {
                return null;
            }
        })
    }

    function getCurrent() {
        let current = new Delta();
        let ops = doc.data.ops;
        for (let i = ops.length - 1; i >= 0; --i) {
            current = current.compose(new Delta([ops[i]]));
        }
        return current;
    }
}

module.exports = { collaborate };
