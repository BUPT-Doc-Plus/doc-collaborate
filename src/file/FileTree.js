const { FileNode } = require("./FileNode");

class FileTree {
    constructor(data) {
        this.idPath = {};
        this.root = new FileNode(data, "/", (node) => {
            if (node.id) {
                this.idPath[node.id] = node.path;
            }
        });
    }
}

module.exports = { FileTree }
