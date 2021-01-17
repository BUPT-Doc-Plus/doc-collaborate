const { readable, writable, push, remove, clients } = require("./login");

function biz(app) {
    app.post("/access_change", (req, res) => {
        let data = JSON.parse(req.body.data);
        if (data.role === 0) {
            remove(writable, data.author.id, data.doc_id);
            push(readable, data.author.id, data.doc_id);
            clients[data.author.id].forEach(sess => sess.send("r"));
        } else if (data.role > 0) {
            remove(readable, data.author.id, data.doc_id);
            push(writable, data.author.id, data.doc_id);
            clients[data.author.id].forEach(sess => sess.send("w"));
        }
        res.send("success");
    })
}

module.exports = { biz };