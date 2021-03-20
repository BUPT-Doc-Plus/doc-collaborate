class FileNode {
    constructor(data, root="/", buildCallback = (node) => {}) {
        Object.assign(this, data);
        if (data.children) {
            this.path = root;
            for (let key in data.children) {
                let nRoot = root + key + "/";
                let child = new FileNode(data.children[key], nRoot, buildCallback);
                data.children[key] = child;
            }
        } else {
            this.path = root.slice(0, -1);
        }
        buildCallback(this);
    }
}

module.exports = { FileNode };
