const config = require('./server.config');
const http = require('http');
const express = require('express');
const ShareDB = require('sharedb');
const richText = require('rich-text');
const WebSocket = require('ws');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const redis = require('redis');
const axios = require('axios').default;
const { Kafka } = require('kafkajs');
const Delta = require('quill/node_modules/quill-delta/lib/delta');

// HTTP前缀
const bizHost = config.biz.host;
const prefix = 'http://' + bizHost + '/';
// ShareDB
const backend = new ShareDB();
const connection = backend.connect();
ShareDB.types.register(richText.type);
// Kafka消息队列
var seq = 0;
const kafka = new Kafka({
    clientId: 'quill-backend',
    brokers: [config.kafka.address]
});
const producer = kafka.producer();
producer.connect();
// 客户端引用计数
const clients = {};
// 定时任务引用
const taskRefs = {};
// Redis
const redisClient = redis.createClient(config.redis.port, config.redis.host);
redisClient.auth(config.redis.auth);
// 启动服务器
startServer();

function startServer() {
    // 创建express服务器
    var app = express();
    app.use(express.static('static'));
    app.use(express.static('node_modules/quill/dist'));
    app.get('/fullArticle:docId?', (req, res) => {
        getDeltasByDocId(req.query.docId, true).then(history => {
            let text = history.filter(op => typeof op.insert === 'string')
                .map(op => op.insert)
                .join('');
            res.send(text);
        })
    })
    var server = http.createServer(app);
    // 创建WebSocket服务器
    var wss = new WebSocket.Server({ server: server });
    wss.on('connection', function(ws, req) {
        /**
         * 客户端接入回调
         */
        var [_, name, docId, userId] = req.url.split('/');
        if (name === 'collaborate') {
            // 接入时取消之前的定时任务
            if (taskRefs[docId]) {
                clearTimeout(taskRefs[docId]);
            }
            // 引用计数+1
            if (clients[docId] === undefined) {
                clients[docId] = [];
            }
            clients[docId].push(userId);
            // 从ShareDB加载文档
            var doc = connection.get('document', '' + docId);
            console.log(`[Loading] loading doc ${docId} from memory`);
            doc.fetch(function(err) {
                if (err) {
                    throw err;
                }
                if (doc.type !== null) {
                    console.log(`[Loading] doc ${docId} loaded from memory`);
                    backend.listen(new WebSocketJSONStream(ws));
                } else {
                    // 从redis加载文档
                    console.log(`[Loading] memory missing, loading doc ${docId} from redis`);
                    redisClient.get('history-' + docId, function(err, data) {
                        if (err) {
                            throw err;
                        }
                        if (data !== null) {
                            doc.create(JSON.parse(data), 'rich-text', function() {
                                console.log(`[Loading] doc ${docId} loaded from redis`);
                                backend.listen(new WebSocketJSONStream(ws));
                            });
                        } else {
                            // 从业务服务器加载文档
                            console.log(`[Loading] redis missing, loading doc ${docId} from central server`);
                            axios.get(prefix + 'doc/delta/?docid=' + docId).then(res => {
                                let data = res.data.data;
                                if (data !== null) {
                                    let ops = [];
                                    for (let item of data) {
                                        ops.push(...JSON.parse(item.content).ops);
                                    }
                                    doc.create(ops, 'rich-text', function() {
                                        console.log(`[Loading] doc ${docId} loaded from central server`);
                                        backend.listen(new WebSocketJSONStream(ws));
                                    })
                                } else {
                                    // 新建文档
                                    console.log(`[Loading] central server missing, creating new doc`);
                                    doc.create([], 'rich-text', function() {
                                        console.log('[Loading] new doc created');
                                        backend.listen(new WebSocketJSONStream(ws));
                                    });
                                }
                            });
                        }
                    })
                }
            });
            ws.on('error', function(err) {
                throw err;
            });
            ws.on('close', function() {
                // 引用计数-1
                clients[docId].splice(clients[docId].indexOf(userId), 1);
                doc.fetch((err) => {
                    if (err) {
                        throw err;
                    }
                    if (clients[docId].length === 0) {
                        taskRefs[docId] = setTimeout(() => {
                            // 将文档存到redis
                            console.log(`[Saving] saving doc ${docId} to redis, doc data: ${JSON.stringify(doc.data)}`);
                            redisClient.set('history-' + docId, JSON.stringify(doc.data), (err) => {
                                if (err) {
                                    throw err;
                                };
                                console.log(`[Saving] doc ${docId} saved to redis`);
                                taskRefs[docId] = setTimeout(() => {
                                    // 将文档存到后端
                                    console.log(`[Saving] sending doc ${docId} to MQ`);
                                    parseRequest().then(body => {
                                        if (body !== null) {
                                            return producer.send({
                                                topic: 'create-all-deltas',
                                                messages: [{
                                                    key: (seq++).toString(),
                                                    value: body
                                                }]
                                            }).then(() => {
                                                console.log(`[Saving] doc ${docId} sent to MQ`);
                                            })
                                        }
                                    })
                                }, config.persist.toKafka * 1000);
                            })
                        }, config.persist.toRedis * 1000)
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
    });

    /**
     * 根据文档ID获取变更
     * @param {文档ID} docId 
     */
    function getDeltasByDocId(docId, userFree = false) {
        return axios.get(prefix + 'doc/delta/?docid=' + docId).then(res => {
            let deltas = res.data.data;
            if (deltas === null) deltas = [];
            let history = new Delta();
            if (userFree) {
                for (let delta of deltas) {
                    let d = JSON.parse(delta.content);
                    delete d.attributes;
                    history = history.compose(JSON.parse(delta.content));
                }
            } else {
                for (let delta of deltas) {
                    history = history.compose(JSON.parse(delta.content));
                }
            }
            return history;
        })
    }

    server.listen(config.server.port, config.server.host);
    console.log(`Listening on http://${config.server.host}:${config.server.port}`);
    process.on('uncaughtException', function(err) {
        console.error(err);
    })
}