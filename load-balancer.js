const config = require('./server.config');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const axios = require('axios').default;

var app = express();
app.get('/fullArticle:docId?', (req, res) => {
    axios.get(`http://${config.server.host}:${config.server.port}/fullArticle?docId=${req.query.docId}`).then((result) => {
        res.send(result.data);
    })
})
var server = http.createServer(app);
var wss = new WebSocket.Server({ server: server });
// 客户端----负载均衡
wss.on('connection', function(socketFromClient, req) {
    var [_, name, docId, userId] = req.url.split('/');
    if (name === 'collaborate') {
        // 负载均衡----协同服务
        var socketToServer = new WebSocket(`ws://${config.server.host}:${config.server.port}/collaborate/${docId}/${userId}`);
        socketToServer.on('open', () => {
            console.log('[Socket To Server] opened');
            // 收到协同服务的消息包时, 将其发给客户端
            socketToServer.on('message', (data) => {
                    socketFromClient.send(data);
                })
                // 收到客户端的消息包时, 将其发给协同服务
            socketFromClient.on('message', (data) => {
                socketToServer.send(data);
            })
        });
    }
})
server.listen(config.lb.port, config.lb.host);
console.log(`Listening on http://${config.lb.host}:${config.lb.port}`);
process.on('uncaughtException', function(err) {
    console.error(err);
})