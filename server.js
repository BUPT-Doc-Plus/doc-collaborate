const config = require('./server.config');
const http = require('http');
const express = require('express');
const ShareDB = require('sharedb');
const richText = require('rich-text');
const otText = require('ot-text');
const WebSocket = require('ws');
const axios = require('axios').default;
const Delta = require('quill/node_modules/quill-delta/lib/delta');
const { collaborate } = require('./src/collaborate');
const { tree } = require('./src/tree');
const { login } = require('./src/login');
const { biz } = require('./src/biz');
const { getQueryParams } = require('./src/utils')
const bodyParser = require('body-parser');
const { chat } = require('./src/chat');
const db = require("sharedb-mongo")(
    `mongodb://${config.mongo.user}:${config.mongo.pwd}@${config.mongo.host}:${config.mongo.port}/${config.mongo.db}?authSource=admin`,
    {
        useUnifiedTopology: true
    });

// HTTP前缀
const bizHost = config.biz.host;
const prefix = 'http://' + bizHost + '/';
// ShareDB
const backend = new ShareDB({ db });
const connection = backend.connect();
ShareDB.types.register(richText.type);
ShareDB.types.register(otText.type);

// 启动服务器
startServer();

function startServer() {
    // 创建express服务器
    var app = express();
    app.use(express.static('static'));
    app.use(express.static('node_modules/quill/dist'));
    app.use(bodyParser.urlencoded({ extended: false }));
    biz(app, connection);
    var server = http.createServer(app);
    // 创建WebSocket服务器
    var wss = new WebSocket.Server({ server: server });
    wss.on('connection', function (ws, req) {
        /**
         * 客户端接入回调
         */
        var [_, arg1, arg2, arg3] = req.url.split("?")[0].split('/');
        var token = getQueryParams(req.url)["token"];
        if (arg1 === 'rich-text' || arg1 === 'markdown') {
            collaborate(backend, connection, ws, arg2, arg3, token, arg1);
        } else if (arg1 === 'tree') {
            tree(backend, connection, ws, arg2, arg3, token);
        } else if (arg1 === 'login') {
            login(ws, arg2);
        } else if (arg1 === 'chat') {
            chat(ws, arg2, token);
        }
    });
    server.listen(config.server.port, config.server.host);
    console.log(`Listening on http://${config.server.host}:${config.server.port}`);
    process.on('uncaughtException', function (err) {
        console.error(err);
    })
}
