function sortTree(root) {
    let result = {};
    Object.keys(root).sort().map(key => {
        result[key] = root[key];
    });
    for (let key in root) {
        if (root[key].children) {
            sortTree(root[key].children);
        }
    }
}

module.exports = { sortTree };
