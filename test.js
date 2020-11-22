const { DocFileSystem } = require("./src/file/DocFileSystem");
const assert = require("assert");

describe("Doc File System API Test", () => {
    let docFileSystem = new DocFileSystem();
    it("get file or directory test", () => {
        docFileSystem.connect(1, () => {
            assert(docFileSystem.get("/") !== undefined);
            assert(docFileSystem.get("/算法") === docFileSystem.get("/算法/"));
            assert(docFileSystem.get("/算法/二叉树") !== undefined);
            assert(docFileSystem.get("/算法/二叉树/") === undefined);
            docFileSystem.close();
        });
    });
    it("create new file test", () => {
        docFileSystem.connect(1, () => {
            let data = {
                id: 7,
                label: "递归",
                type: "rich-text",
                creator: 1,
                collaborators: [2, 3]
            };
            // 禁止在非法目录下创建新文件
            assert(!docFileSystem.touch("/嘿嘿嘿/", data));
            assert(!docFileSystem.touch("/算法/二叉树", data));
            assert(!docFileSystem.touch("/算法/二叉树/", data));
            // 能够在合法目录下创建新文件并且保持数据一致性
            assert(docFileSystem.touch("/算法/", data));
            let newNode = docFileSystem.get("/算法/递归");
            assert(newNode !== undefined);
            assert(newNode.id === data.id);
            assert(newNode.label === data.label);
            // 禁止创建重名文件
            assert(!docFileSystem.touch("/算法/", data));
            docFileSystem.close();
        })
    });
    it("create new directory test", () => {
        docFileSystem.connect(1, () => {
            // 目录存在时不改变已有目录
            assert(!docFileSystem.mkdir("/算法/"));
            // 创建新目录
            assert(docFileSystem.mkdir("/Java程序设计/"));
            assert(docFileSystem.get("/Java程序设计/") !== undefined);
            // 递归创建目录
            assert(docFileSystem.mkdir("/机器学习/监督学习/神经网络/"));
            assert(docFileSystem.get("/机器学习/") !== undefined);
            assert(docFileSystem.get("/机器学习/监督学习/") !== undefined);
            assert(docFileSystem.get("/机器学习/监督学习/神经网络/") !== undefined);
            docFileSystem.close();
        })
    });
    it("remove test", () => {
        docFileSystem.connect(1, () => {
            docFileSystem.mkdir("/path/to/test/");
            docFileSystem.touch("/path/to/test/", { label: "testFile" });
            assert(docFileSystem.remove("/path/to/test/testFile"));
            assert(docFileSystem.get("/path/to/test/testFile") === undefined);
            assert(docFileSystem.get("/path/to/test/") !== undefined);
            assert(!docFileSystem.remove("/path/to/test/testFile"));
            assert(docFileSystem.remove("/path/"));
            assert(docFileSystem.get("/path/") === undefined);
        })
    })
    it("copy cut and paste test", () => {
        docFileSystem.connect(1, () => {
            // 正常拷贝
            assert(docFileSystem.copy("/算法/二叉树"));
            assert(docFileSystem.paste("/计算机网络/") === 0);
            assert(docFileSystem.get("/计算机网络/二叉树") !== undefined);
            // 非法路径
            assert(!docFileSystem.copy("/算法/嘿嘿嘿"));
            assert(!docFileSystem.cut("/算法/嘿嘿嘿"));
            assert(docFileSystem.paste("/嘿嘿嘿/") === -1);
            assert(docFileSystem.paste("/算法/动态规划") === -1);
            // 剪切和覆盖
            assert(docFileSystem.cut("/算法/二叉树"));
            assert(docFileSystem.paste("/计算机网络/") === 1);
            assert(docFileSystem.get("/计算机网络/二叉树") !== undefined);
            assert(docFileSystem.get("/算法/二叉树") === undefined);
        })
    });
    it("recycle and restore test", () => {
        docFileSystem.connect(1, () => {
            // 正常删除功能
            docFileSystem.mkdir("/path/to/test/");
            docFileSystem.touch("/path/to/test/", { label: "testFile" });
            assert(docFileSystem.recycle("/path/to/test/testFile"));
            assert(docFileSystem.get("/path/to/test/testFile") === undefined);
            assert(docFileSystem.get("/path/to/test/") !== undefined);
            assert(!docFileSystem.recycle("/path/to/test/testFile"));
            assert(docFileSystem.recycle("/path/"));
            assert(docFileSystem.get("/path/") === undefined);
            // 重名删除+恢复
            docFileSystem.touch("/", { label: "testFile" });
            docFileSystem.recycle("/testFile");
            docFileSystem.touch("/", { label: "testFile" });
            docFileSystem.recycle("/testFile");
            assert(docFileSystem.restore("/$recycleBin/testFile", 0) == 0);
            assert(docFileSystem.get("/testFile") !== undefined);
        })
    })
})
