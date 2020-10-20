var ReconnectingWebSocket = require('reconnecting-websocket');
var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill');
sharedb.types.register(richText.type);

var docId = 124;
var userId = window.location.href.split('?')[1].split('&')[0].split('=')[1];

// Open WebSocket connection to ShareDB server
var socket = new ReconnectingWebSocket('ws://' + window.location.host + `/collaborate/${docId}/${userId}`);
var connection = new sharedb.Connection(socket);

// For testing reconnection
window.disconnect = function() {
    connection.close();
};
window.connect = function() {
    var socket = new ReconnectingWebSocket('ws://' + window.location.host + `/collaborate/${docId}/${userId}`);
    connection.bindToSocket(socket);
};

// Create local Doc instance mapped to 'examples' collection document with id 'richtext'
var doc = connection.get('document', '' + docId);
doc.subscribe(function(err) {
    if (err) throw err;
    console.log(doc.data);
    var quill = new Quill('#editor', { theme: 'snow' });
    quill.setContents(doc.data);
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source !== 'user') return;
        doc.submitOp(delta, { source: quill });
        console.log(doc.data.ops.map(e => e.attributes.userId));
    });
    doc.on('op', function(op, source) {
        if (source === quill) return;
        quill.updateContents(op);
    });
});