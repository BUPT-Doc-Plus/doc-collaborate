const config = require('../server.config');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

// 客户端引用计数
const clients = {};

function collaborate(backend, connection, ws, docId, userId, token, type="rich-text") {
    // 引用计数+1
    if (clients[docId] === undefined) {
        clients[docId] = [];
    }
    clients[docId].push(userId);
    // 从ShareDB加载文档
    var doc = connection.get('document', '' + docId);
    console.log(`[Loading] loading doc ${docId} from memory`);
    doc.fetch(function (err) {
        if (err) {
            throw err;
        }
        if (doc.type !== null) {
            console.log(`[Loading] doc ${docId} loaded from memory`);
            backend.listen(new WebSocketJSONStream(ws));
        } else {
            // 新建文档
            if (type === "rich-text") {
                doc.create([], 'rich-text', function () {
                    console.log('[Loading] new doc (rich-text) created');
                    backend.listen(new WebSocketJSONStream(ws));
                });
            } else if (type === "markdown") {
                doc.create("", "text", function () {
                    console.log('[Loading] new doc (markdown) created');
                    backend.listen(new WebSocketJSONStream(ws));
                });
            }
        }
    });
    ws.on('error', function (err) {
        throw err;
    });
    ws.on('close', function () {
        // 引用计数-1
        clients[docId].splice(clients[docId].indexOf(userId), 1);
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
