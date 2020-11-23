const { DocFileSystem } = require("./src/file/DocFileSystem");

let dfs1 = new DocFileSystem();
let dfs2 = new DocFileSystem();
dfs2.connect(1, () => { }, (op, doc, tree) => {
    console.log(dfs2.get("/C#程序设计/类和对象"), dfs2.get("/类和对象"), dfs2.get("/对象和类"));
})
dfs1.connect(1, () => {
    dfs1.mkdir("/C#程序设计/");
    dfs1.touch("/C#程序设计/", { label: "类和对象" });
    dfs1.cut("/C#程序设计/类和对象");
    dfs1.paste("/");
    dfs1.rename("/类和对象", "对象和类");
});
