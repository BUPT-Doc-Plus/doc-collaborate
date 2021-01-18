const { readable, writable, push, remove, clients } = require("./login");
const treeDocs = require("./tree").clients;
const { Path } = require("./file/Path");

function biz(app) {
    app.post("/access_change", (req, res) => {
        let data = JSON.parse(req.body.data);
        if (data.role === 0) {
            remove(writable, data.author.id, data.doc_id);
            push(readable, data.author.id, data.doc_id);
            if (clients[data.author.id])
                clients[data.author.id].forEach(sess => sess.send("r"));
        } else if (data.role > 0) {
            remove(readable, data.author.id, data.doc_id);
            push(writable, data.author.id, data.doc_id);
            if (clients[data.author.id])
                clients[data.author.id].forEach(sess => sess.send("w"));
        }
        res.send("ack");
    })
    app.post("/invite_or_kick", (req, res) => {
        let data = JSON.parse(req.body.data);
        let treeDoc = treeDocs[data.author.id];
        for (let tDoc of treeDoc) {
            tDoc.fetch((err) => {
                if (err) throw err;
                if (data.type === "invite") {
                    let key = data.doc.label + "-" + data.doc.id;
                    if (tDoc.data.idPath[data.doc.id] === undefined) {
                        let p = new Path("/" + key);
                        tDoc.submitOp([
                            {
                                p: ["root", ...p.jpath],
                                oi: data.doc
                            },
                            {
                                p: ["indices", p.path],
                                oi: data.doc
                            },
                            {
                                p: ["idPath", data.doc.id],
                                oi: p.path
                            }
                        ]);
                    }
                } else if (data.type === "kick") {
                    if (tDoc.data.idPath[data.doc.id]) {
                        let p = new Path(tDoc.data.idPath[data.doc.id]);
                        tDoc.submitOp([
                            {
                                p: ["root", ...p.jpath],
                                od: data.doc
                            },
                            {
                                p: ["indices", p.path],
                                od: data.doc
                            },
                            {
                                p: ["idPath", data.doc.id],
                                od: p.path
                            }
                        ]);
                    }
                }
            })
        }
        res.send("ack");
    })
}

module.exports = { biz };