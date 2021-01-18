const { FileNode } = require("./FileNode");

class FileTree {
    constructor(data) {
        this.idPath = {};
        this.indices = {};
        this.root = new FileNode(data, "/", (node) => {
            if (node.id) {
                this.idPath[node.id] = node.path;
            }
            this.indices[node.path] = node;
        });
    }
}

module.exports = { FileTree }
