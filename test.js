const { DocFileSystem } = require("./src/file/DocFileSystem");
const assert = require("assert");
const { Path } = require("./src/file/Path");

let dfs = new DocFileSystem();

describe("Doc File System API Test", () => {
    it("get file or directory test", () => {
        dfs.connect(1, () => {
            assert(dfs.get("/") !== undefined);
            assert(dfs.get("/算法") === dfs.get("/算法/"));
            assert(dfs.get("/算法/二叉树") !== undefined);
            assert(dfs.get("/算法/二叉树/") === undefined);
            dfs.close();
        });
    });
    it("create new file test", () => {
        dfs.connect(1, () => {
            let data = {
                id: 7,
                label: "递归",
                type: "rich-text",
                creator: 1,
                collaborators: [2, 3]
            };
            // 禁止在非法目录下创建新文件
            assert(!dfs.touch("/嘿嘿嘿/", data));
            assert(!dfs.touch("/算法/二叉树", data));
            assert(!dfs.touch("/算法/二叉树/", data));
            // 能够在合法目录下创建新文件并且保持数据一致性
            assert(dfs.touch("/算法/", data));
            let newNode = dfs.get("/算法/递归");
            assert(newNode !== undefined);
            assert(newNode.id === data.id);
            assert(newNode.label === data.label);
            // 禁止创建重名文件
            assert(!dfs.touch("/算法/", data));
            dfs.close();
        })
    });
    it("create new directory test", () => {
        dfs.connect(1, () => {
            // 目录存在时不改变已有目录
            assert(!dfs.mkdir("/算法/"));
            // 创建新目录
            assert(dfs.mkdir("/Java程序设计/"));
            assert(dfs.get("/Java程序设计/") !== undefined);
            // 递归创建目录
            assert(dfs.mkdir("/机器学习/监督学习/神经网络/"));
            assert(dfs.get("/机器学习/") !== undefined);
            assert(dfs.get("/机器学习/监督学习/") !== undefined);
            assert(dfs.get("/机器学习/监督学习/神经网络/") !== undefined);
            dfs.close();
        })
    });
    it("remove test", () => {
        dfs.connect(1, () => {
            dfs.mkdir("/path/to/test/");
            dfs.touch("/path/to/test/", { label: "testFile" });
            assert(dfs.remove("/path/to/test/testFile"));
            assert(dfs.get("/path/to/test/testFile") === undefined);
            assert(dfs.get("/path/to/test/") !== undefined);
            assert(!dfs.remove("/path/to/test/testFile"));
            assert(dfs.remove("/path/"));
            assert(dfs.get("/path/") === undefined);
            dfs.close();
        })
    })
    it("copy cut and paste test", () => {
        dfs.connect(1, () => {
            // 正常拷贝
            assert(dfs.copy("/算法/二叉树"));
            assert(dfs.paste("/计算机网络/") === 0);
            assert(dfs.get("/计算机网络/二叉树") !== undefined);
            // 非法路径
            assert(!dfs.copy("/算法/嘿嘿嘿"));
            assert(!dfs.cut("/算法/嘿嘿嘿"));
            assert(dfs.paste("/嘿嘿嘿/") === -1);
            assert(dfs.paste("/算法/动态规划") === -1);
            // 剪切和覆盖
            assert(dfs.cut("/算法/二叉树"));
            assert(dfs.paste("/计算机网络/") === 1);
            assert(dfs.get("/计算机网络/二叉树") !== undefined);
            assert(dfs.get("/算法/二叉树") === undefined);
            dfs.close();
        })
    });
    it("rename test", () => {
        dfs.connect(1, () => {
            dfs.touch("/", { label: "HelloWorld" });
            let old = dfs.get("/HelloWorld");
            assert(dfs.rename("/HelloWorld", "BonjourMonde"));
            assert(dfs.get("/BonjourMonde") === old);
            dfs.mkdir("/Nice/");
            old = dfs.get("/Nice/");
            assert(dfs.rename("/Nice/", "Good"));
            assert(dfs.get("/Good/") === old);
            dfs.touch("/", { label: "Hola" });
            assert(!dfs.rename("/BonjourMonde", "Hola"));
            dfs.close();
        });
    })
})

describe("Path Object Test", () => {
    let p = new Path("/path/to/somewhere/");
    it("path parse test", () => {
        assert(p.path === "/path/to/somewhere/");
        assert(arrayEqual(p.jpath, ["children", "path", "children", "to", "children", "somewhere", "children"]));
        assert(p.parent.path === "/path/to/");
        assert(p.target === "somewhere");
    });
    it("path change test", () => {
        p.jpath = ["children", "path", "children", "towards", "children", "somewhere", "children"];
        assert(p.path === "/path/towards/somewhere/");
        assert(p.parent.path === "/path/towards/");
        assert(p.target === "somewhere");

        p.path = "/path/goes/everywhere/";
        assert(arrayEqual(p.jpath, ["children", "path", "children", "goes", "children", "everywhere", "children"]));
        assert(p.parent.path === "/path/goes/");
        assert(p.target === "everywhere");

        p.parent = "/path/";
        assert(p.path === "/path/everywhere/");
        assert(p.target === "everywhere");
        assert(arrayEqual(p.jpath, ["children", "path", "children", "everywhere", "children"]));
    });
    it("vulnerability test", () => {
        p.path = "/path//to/here";
        assert(p.path === "/path/to/here");
        p.path = "/children//children//children";
        assert(arrayEqual(p.jpath, ["children", "children", "children", "children", "children", "children"]));
    });
    function arrayEqual(arr1, arr2) {
        return arr1.map((e, i) => e === arr2[i]).reduce((a, b) => a && b);
    }
})

describe("Remote Database Test", () => {
    it("create", () => {
        dfs.connect(1, () => {
            dfs.mkdir("/JavaScript高级程序设计/");
            assert(dfs.doc.data.children["JavaScript高级程序设计"] !== undefined);
            dfs.touch("/JavaScript高级程序设计/", { label: "第一章", type: "rich-text" });
            assert(dfs.doc.data.children["JavaScript高级程序设计"].children["第一章"] !== undefined);
            dfs.close();
        });
    });
})