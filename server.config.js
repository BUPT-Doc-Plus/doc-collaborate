const fs = require("fs")
const ini = require("ini")

var info = ini.parse(fs.readFileSync("../config.ini", "utf-8"))

module.exports = {
    server: {
        host: info["doc-collaborate"]["host"],
        port: parseInt(info["doc-collaborate"]["port"])
    },
    mongo: {
        host: info["mongodb"]["host"],
        port: parseInt(info["mongodb"]["port"]),
        db: info["mongodb"]["db"],
        user: info["mongodb"]["user"],
        pwd: info["mongodb"]["pwd"]
    },
    biz: {
        host: `${info["doc-server"]["host"]}:${info["doc-server"]["port"]}`
    },
    key: 'U5MD$>kRS9zTKHN*vw{t4YOem_#,1E@Aoij(pG;u?gqXVyB^[.0LI)fC2Z:Qc<hdFxPnr!s8J%+/]7}36la&Wb'
}