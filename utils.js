function sortTree(root) {
    if (root === null) return;
    root.forEach((item) => {
        if (item.children) {
            sortTree(item.children);
        }
    });
    root.sort((a, b) => {
        if (a.children === undefined && b.children !== undefined) {
            return 1;
        } else if (a.children !== undefined && b.children === undefined) {
            return -1;
        } else {
            if (a.label < b.label) {
                return -1;
            } else {
                return 1;
            }
        }
    });
    return root;
}

module.exports = { sortTree };
