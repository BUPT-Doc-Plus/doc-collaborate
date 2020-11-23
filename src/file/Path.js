class Path {
    constructor (path) {
        path = this._trimPath(path)
        this._path = path;
        this._isDir = path.endsWith("/");
        [this._parent, this._target] = this._splitLast(path);
        this._jsonPath = this._getJPath(path);
    }

    _splitLast(path) {
        path = this._trimPath(path)
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

    _getJPath(path) {
        return path.split("/").join(" children ").trim(" ").split(" ");;
    }

    _trimPath(path) {
        return path.trim(" ").split("").reduce((a, b) => (a.slice(-1) === "/" && b === "/") ? a : (a + b));
    }

    get path() {
        return this._path;
    }

    set path(path) {
        path = this._trimPath(path)
        this._path = path;
        this._isDir = path.endsWith("/");
        [this._parent, this._target] = this._splitLast(path);
        this._jsonPath = this._getJPath(path);
    }

    get parent() {
        return new Path(this._parent);
    }

    set parent(parent) {
        parent = this._trimPath(parent)
        this._parent = parent;
        this._path = (parent.endsWith("/") ? parent + this._target : parent + "/" + this._target) + (this._isDir ? "/" : "");
        this._jsonPath = this._getJPath(this._path);
    }

    get target() {
        return this._target;
    }

    get jpath() {
        return this._jsonPath;
    }

    set jpath(jpath) {
        this._jsonPath = jpath;
        this._isDir = jpath.length % 2;
        this._path = jpath.map((e, i) => i % 2 ? e : "/").join("");
        [this._parent, this._target] = this._splitLast(this._path);
    }
}

module.exports = { Path };