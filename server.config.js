module.exports = {
    server: {
        host: '0.0.0.0',
        port: 8088
    },
    redis: {
        host: 'www.liadrinz.cn',
        port: 6379,
        auth: '123456'
    },
    mongo: {
        host: 'localhost',
        port: 27017,
        db: 'test'
    },
    biz: {
        host: 'localhost:8000'
    },
    kafka: {
        address: '121.36.15.90:9092',
        groupId: 'monkeydoc-edition',
        topics: ['re-create-all-deltas', 're-create-all-message', 're-create-checkpoint']
    },
    persist: {
        toRedis: 10,
        toKafka: 30
    },
    key: 'U5MD$>kRS9zTKHN*vw{t4YOem_#,1E@Aoij(pG;u?gqXVyB^[.0LI)fC2Z:Qc<hdFxPnr!s8J%+/]7}36la&Wb'
}