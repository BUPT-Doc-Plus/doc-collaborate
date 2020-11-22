const { FileNode } = require("./FileNode");
const { FileTree } = require("./FileTree");
const sharedb = require("sharedb/lib/client");
const NodeWebSocket = require("ws");
const ReconnectingWebSocket = require("reconnecting-websocket");
const { Path } = require("./Path");

const RECONNECT_OPS = {
    connectionTimeout: 400,
    WebSocket: NodeWebSocket,
    debug: false,
    maxReconnectionDelay: 10000,
    maxRetries: Infinity,
    minReconnectionDelay: 4000,
    reconnectionDelayGrwoFactor: 1.3
}

class DocFileSystem {
    constructor() {
        this.doc = null;
        this.tree = null;
        this.clipboard = {
            folder: "",
            file: "",
            cut: false
        }
    }

    connect(userId, callback = () => { }) {
        if (DocFileSystem.session.document === undefined) {
            let socket = new ReconnectingWebSocket(
                DocFileSystem.url.document + userId,
                undefined,
                RECONNECT_OPS
            );
            let connection = new sharedb.Connection(socket);
            DocFileSystem.session.document = connection;
        }
        this.doc = DocFileSystem.session.document.get("tree-document", "" + userId);
        this.doc.subscribe((err) => {
            if (err) throw err;
            this.tree = new FileTree(this.doc.data);
            callback(this.doc, this.tree);
        })
    }

    close() {
        if (DocFileSystem.session.document)
            DocFileSystem.session.document.close();
    }

    get(path) {
        return this.tree.indices[path] || this.tree.indices[path + "/"];
    }

    touch(path, data) {
        if (this.get(path + data.label) !== undefined)
            return false;
        let parent = this.get(path);
        if (parent === undefined || parent.children === undefined)
            return false;
        let newNode = new FileNode(data, path + data.label + "/", (node) => {
            this.tree.indices[node.path] = node;
        })
        parent.children[data.label] = newNode;
        this.doc.submitOp({
            p: new Path(path + data.label).jpath,
            oi: data
        });
        return true;
    }

    mkdir(path) {
        if (this.get(path) !== undefined) return false;
        let [prevPath, newDir] = DocFileSystem.splitLast(path);
        if (this.get(prevPath) === undefined) {
            this.mkdir(prevPath);
        }
        if (newDir !== "") {
            let data = {
                label: newDir,
                creator: 1,
                children: {},
                collaborators: null,
                show: false
            };
            this.get(prevPath).children[newDir] = new FileNode(data, path, (node) => {
                this.tree.indices[node.path] = node;
            });
            this.doc.submitOp({
                p: new Path(path.slice(0, -1)).jpath,
                oi: data
            })
        }
        return true;
    }

    remove(path) {
        if (this.get(path) === undefined)
            return false;
        return delete this.get(path) && delete this.tree.indices[path];
    }

    copy(src) {
        if (this.get(src) === undefined)
            return false;
        [this.clipboard.folder, this.clipboard.file] = DocFileSystem.splitLast(src);
        return true;
    }

    cut(src) {
        if (this.get(src) === undefined)
            return false;
        [this.clipboard.folder, this.clipboard.file] = DocFileSystem.splitLast(src);
        this.clipboard.cut = true;
        return true;
    }

    paste(dest) {
        if (this.get(dest) === undefined || this.get(dest).children === undefined)
            return -1;
        let flag = 0;
        let src = this.clipboard.folder + this.clipboard.file;
        let destFile = dest + this.clipboard.file;
        if (this.get(destFile) !== undefined) {
            flag = 1;
        }
        this.get(dest).children[this.clipboard.file] = new FileNode(this.get(src), destFile + "/", (node) => {
            this.tree.indices[node.path] = node;
        });
        if (this.clipboard.cut) {
            this.clipboard.cut = false;
            this.remove(src);
        }
        return flag;
    }

    rename(path, newName) {
        let p = new Path(path);
        let newPath = p.parent.path + newName + (p._isDir ? "/" : "");
        if (this.get(newPath) !== undefined)
            return false;
        this.tree.indices[newPath] = this.get(path);
        this.get(path).label = newName;
        this.get(path).path = newPath;
        this.get(p.parent.path)[newName] = this.get(path);
        delete this.get(path);
        return true;
    }
}

DocFileSystem.url = {
    document: "ws://localhost:8088/tree/document/"
};
DocFileSystem.session = {};
DocFileSystem.splitLast = function (path) {
    path = path.split("").reduce((a, b) => (a.slice(-1) === "/" && b === "/") ? a : (a + b));
    let pathList = path.split("/");
    let newDir = "";
    if (pathList.slice(-1)[0] === "") {
        newDir = pathList.slice(-2)[0];
        pathList = pathList.slice(0, -2);
    } else {
        newDir = pathList.slice(-1)[0];
        pathList = pathList.slice(0, -1);
    }
    return [pathList.join("/") + "/", newDir];
}
DocFileSystem.recycleTemplate = {
    id: -1,
    label: "$recycleBin",
    show: false,
    children: {}
};

module.exports = { DocFileSystem };
