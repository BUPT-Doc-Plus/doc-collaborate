const { FileNode } = require("./FileNode");

class FileTree {
    constructor(data) {
        this.indices = {};
        this.root = new FileNode(data, "/", (node) => {
            this.indices[node.path] = node;
        });
    }
}

module.exports = { FileTree }
