const router = require('express').Router();
const {GetConnection, Query} = require('./functions');


router.get('/', (req, res) => {
    let db;

    let filter = [], ratingExact, ratingFrom, ratingTo;
    let sort, order;
    let limit = 10, skip = 0;

    Promise.resolve()
    //фильтрация
    .then(() => {
        if (req.query.name) {
            filter.push({key: 'name', value: req.query.name});
        }
    })
    .then(() => {
        if (req.query.genre) {
            filter.push({key: 'genre', value: req.query.genre});
        }
    })
    .then(() => {
        if (req.query.rating) {
            if (req.query.rating.indexOf(";") != -1) {
                let ratingArr = req.query.rating.split(";");
                if (ratingArr.length != 2) {
                    throw {code: 400, data: {error: "Parameter rating is invalid"}};
                }
                let low = parseInt(ratingArr[0]);
                let top = parseInt(ratingArr[1]);
                if (ratingArr[0] && ratingArr[1]) {
                    if (isNaN(low) || isNaN(top)) {
                        throw {code: 400, data: {error: "Parameter rating is invalid"}};
                    }
                    ratingFrom = low;
                    ratingTo = top;
                } else if (ratingArr[0]) {
                    if (isNaN(low)) {
                        throw {code: 400, data: {error: "Parameter rating is invalid"}};
                    }
                    ratingFrom = low;
                } else if (ratingArr[1]) {
                    if (isNaN(top)) {
                        throw {code: 400, data: {error: "Parameter rating is invalid"}};
                    }
                    ratingTo = top;              
                } else {
                    throw {code: 400, data: {error: "Parameter rating is invalid"}};
                }
            } else {
                let rating = parseInt(req.query.rating);
                if (isNaN(rating)) {
                    throw {code: 400, data: {error: "Parameter rating is invalid"}};
                }
                ratingExact = rating;
            }
        }
    })

    //сортировка
    .then(() => {
        if (req.query.sort) {
            if (["name", "genre", "rating"].indexOf(req.query.sort) === -1) {
                throw {code: 400, data: {error: "Parameter sort is invalid"}};
            } else {
                if (!req.query.order || req.query.order === "asc") {
                    sort = req.query.sort;
                    order = "ASC";
                } else if (req.query.order === "desc") {
                    sort = req.query.sort;
                    order = "DESC";
                } else {
                    throw {code: 400, data: {error: "Parameter order is invalid"}};
                }
            }
        }
    })

    //пагинация
    .then(() => {
        if (req.query.limit) {
            limit = parseInt(req.query.limit);
            if (isNaN(limit) || limit > 100 || limit <= 0) {
                throw {code: 400, data: {error: "Parameter limit is invalid"}};
            }
        }
    })
    .then(() => {
        if (req.query.skip) {
            skip = parseInt(req.query.skip);
            if (isNaN(skip) || skip < 0) {
                throw {code: 400, data: {error: "Parameter skip is invalid"}};
            }
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка запроса
    .then(() => {
        return [
            'SELECT',
            [
                'g.id as id',
                'g.name as name',
                'g.genre as genre',
                'g.rating as rating',
                'GROUP_CONCAT(IFNULL(gr.price, "") SEPARATOR ";") as prices',
                'GROUP_CONCAT(IFNULL(gr.date, "") SEPARATOR ";") as dates',
                'GROUP_CONCAT(IFNULL(p.id, "") SEPARATOR ";") as platformIds',
                'GROUP_CONCAT(IFNULL(p.name, "") SEPARATOR ";") as platformNames'
            ].join(', '),
            'FROM games AS g',
            'LEFT OUTER JOIN games_releases AS gr ON g.id = gr.id_game',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            ...((filter.length > 0 || typeof(ratingExact) != 'undefined' || typeof(ratingFrom) != 'undefined' || typeof(ratingTo) != 'undefined')
            ? [
                [
                    'WHERE',
                    ...(filter.length > 0 ? [filter.map(i => `(${i.key} LIKE ${db.escape('%'+i.value+'%')})`).join(' AND ')] : []),
                    ...(typeof(ratingExact) != 'undefined' ? [`genre = ${ratingExact}`] : []),
                    ...(typeof(ratingFrom) != 'undefined' && typeof(ratingTo) != 'undefined' ? [`rating BETWEEN ${ratingFrom} AND ${ratingTo}`] : []),
                    ...(typeof(ratingFrom) != 'undefined' && typeof(ratingTo) == 'undefined' ? [`rating > ${ratingFrom}`] : []),
                    ...(typeof(ratingFrom) == 'undefined' && typeof(ratingTo) != 'undefined' ? [`rating < ${ratingTo}`] : [])
                ].join(' ')
            ] 
            : []),
            'GROUP BY g.id, g.name, g.genre, g.rating',
            ...(typeof(sort) != 'undefined' ? [`ORDER BY ${db.escapeId(sort)} ${order}`] : []),
            `LIMIT ${limit}`,
            `OFFSET ${skip}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(el => {
            let prices = el.prices ? el.prices.split(';').map(i => i ? i : null) : [];
            let dates = el.dates ? el.dates.split(';').map(i => i ? i : null) : [];
            let platformIds = el.platformIds ? el.platformIds.split(';').map(i => i ? i : null) : [];
            let platformNames = el.platformNames ? el.platformNames.split(';').map(i => i ? i : null) : [];
            let obj = {
                _id: el.id,
                name: el.name,
                genre: el.genre,
                rating: el.rating,
                releases: []
            };
            for (let i = 0; i < platformIds.length; i++) {
                obj.releases.push({
                    platform: {
                        _id: platformIds[i],
                        name: platformNames[i]
                    },
                    price: prices[i],
                    date: dates[i]
                });
            }
            return obj;
        })
    })
    .then(result => {
        res.send(result);
    })


    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });

});

router.get('/:id', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка запроса
    .then(() => {
        return [
            'SELECT',
            [
                'g.id as id',
                'g.name as name',
                'g.genre as genre',
                'g.rating as rating',
                'GROUP_CONCAT(IFNULL(gr.price, "") SEPARATOR ";") as prices',
                'GROUP_CONCAT(IFNULL(gr.date, "") SEPARATOR ";") as dates',
                'GROUP_CONCAT(IFNULL(p.id, "") SEPARATOR ";") as platformIds',
                'GROUP_CONCAT(IFNULL(p.name, "") SEPARATOR ";") as platformNames'
            ].join(', '),
            'FROM games AS g',
            'LEFT OUTER JOIN games_releases AS gr ON g.id = gr.id_game',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE g.id = ${db.escape(id)}`,
            'GROUP BY g.id, g.name, g.genre, g.rating'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            let el = result.result[0];
            let prices = el.prices ? el.prices.split(';').map(i => i ? i : null) : [];
            let dates = el.dates ? el.dates.split(';').map(i => i ? i : null) : [];
            let platformIds = el.platformIds ? el.platformIds.split(';').map(i => i ? i : null) : [];
            let platformNames = el.platformNames ? el.platformNames.split(';').map(i => i ? i : null) : [];
            let obj = {
                _id: el.id,
                name: el.name,
                genre: el.genre,
                rating: el.rating,
                releases: []
            };
            for (let i = 0; i < platformIds.length; i++) {
                obj.releases.push({
                    platform: {
                        _id: platformIds[i],
                        name: platformNames[i]
                    },
                    price: prices[i],
                    date: dates[i]
                });
            }
            return obj;
        }
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });

});

router.put('/', (req, res) => {
    let db;
    let obj = {};

    Promise.resolve()
    //валидация параметров
    .then(() => {
        if (!req.body.name) {
            throw {code: 400, data: {error: "Parameter name is required"}};
        }
        if (typeof(req.body.name) !== "string") {
            throw {code: 400, data: {error: "Parameter name has to be a string"}};
        }

        obj.name = req.body.name;
    })
    .then(() => {
        if (req.body.genre) {
            if (typeof(req.body.genre) !== "string") {
                throw {code: 400, data: {error: "Parameter genre has to be a string"}};
            }

            obj.genre = req.body.genre;
        } else {
            obj.genre = null;
        }
    })
    .then(() => {
        if (req.body.rating) {
            if (typeof(req.body.rating) !== "number") {
                throw {code: 400, data: {error: "Parameter rating has to be a number"}};
            }

            obj.rating = req.body.rating;
        } else {
            obj.rating = null;
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка sql
    .then(() => {
        return [
            'INSERT INTO games',
            '(name, genre, rating)',
            'VALUES',
            `(${db.escape(obj.name)}, ${db.escape(obj.genre)}, ${db.escape(obj.rating)})`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Game with name: ${req.body.name} already exists`}};
        } else {
            throw error;
        }
    })
    //выборка вставленной записи
    .then(result => {
        return result.result.insertId;
    })
    //подготовка запроса
    .then(id => {
        return [
            'SELECT',
            [
                'g.id as id',
                'g.name as name',
                'g.genre as genre',
                'g.rating as rating',
                'GROUP_CONCAT(IFNULL(gr.price, "") SEPARATOR ";") as prices',
                'GROUP_CONCAT(IFNULL(gr.date, "") SEPARATOR ";") as dates',
                'GROUP_CONCAT(IFNULL(p.id, "") SEPARATOR ";") as platformIds',
                'GROUP_CONCAT(IFNULL(p.name, "") SEPARATOR ";") as platformNames'
            ].join(', '),
            'FROM games AS g',
            'LEFT OUTER JOIN games_releases AS gr ON g.id = gr.id_game',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE g.id = ${db.escape(id)}`,
            'GROUP BY g.id, g.name, g.genre, g.rating'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        let prices = el.prices ? el.prices.split(';').map(i => i ? i : null) : [];
        let dates = el.dates ? el.dates.split(';').map(i => i ? i : null) : [];
        let platformIds = el.platformIds ? el.platformIds.split(';').map(i => i ? i : null) : [];
        let platformNames = el.platformNames ? el.platformNames.split(';').map(i => i ? i : null) : [];
        let obj = {
            _id: el.id,
            name: el.name,
            genre: el.genre,
            rating: el.rating,
            releases: []
        };
        for (let i = 0; i < platformIds.length; i++) {
            obj.releases.push({
                platform: {
                    _id: platformIds[i],
                    name: platformNames[i]
                },
                price: prices[i],
                date: dates[i]
            });
        }
        return obj;
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });

});

router.delete('/:id', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка sql
    .then(() => {
        return [
            'DELETE FROM games',
            `WHERE id = ${db.escape(id)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            res.send({success: true});
        }
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });

});

router.patch('/:id', (req, res) => {
    let db;
    let id;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })

    //Проверка наличия параметров
    .then(() => {
        if (Object.keys(req.body).length === 0) {
            throw {code: 400, data: {error: "Parameters for update are empty"}};
        }
    })

    //валидация параметров
    .then(() => {
        if (req.body.name) {
            if (typeof(req.body.name) !== "string") {
                throw {code: 400, data: {error: "Parameter name has to be a string"}};
            }

            obj.name = req.body.name;
        }
    })
    .then(() => {
        if (req.body.genre) {
            if (typeof(req.body.genre) !== "string") {
                throw {code: 400, data: {error: "Parameter genre has to be a string"}};
            }

            obj.genre = req.body.genre;
        }
    })
    .then(() => {
        if (req.body.rating) {
            if (typeof(req.body.rating) !== "number") {
                throw {code: 400, data: {error: "Parameter rating has to be a number"}};
            }

            obj.rating = req.body.rating;
        }
    })

    //Проверка наличия параметров для обновления
    .then(() => {
        if (Object.keys(obj).length === 0) {
            throw {code: 400, data: {error: "Allowed parameters are not set"}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка sql
    .then(() => {
        return [
            'UPDATE games SET',
            Object.keys(obj).map(i => `${i} = ${db.escape(obj[i])}`).join(', '),
            `WHERE id = ${db.escape(id)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Game with name: ${req.body.name} already exists`}};
        } else {
            throw error;
        }
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Platform not found"}};
        }
    })  
    //выборка вставленной записи
    .then(() => {
        return [
            'SELECT',
            [
                'g.id as id',
                'g.name as name',
                'g.genre as genre',
                'g.rating as rating',
                'GROUP_CONCAT(IFNULL(gr.price, "") SEPARATOR ";") as prices',
                'GROUP_CONCAT(IFNULL(gr.date, "") SEPARATOR ";") as dates',
                'GROUP_CONCAT(IFNULL(p.id, "") SEPARATOR ";") as platformIds',
                'GROUP_CONCAT(IFNULL(p.name, "") SEPARATOR ";") as platformNames'
            ].join(', '),
            'FROM games AS g',
            'LEFT OUTER JOIN games_releases AS gr ON g.id = gr.id_game',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE g.id = ${db.escape(id)}`,
            'GROUP BY g.id, g.name, g.genre, g.rating'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        let prices = el.prices ? el.prices.split(';').map(i => i ? i : null) : [];
        let dates = el.dates ? el.dates.split(';').map(i => i ? i : null) : [];
        let platformIds = el.platformIds ? el.platformIds.split(';').map(i => i ? i : null) : [];
        let platformNames = el.platformNames ? el.platformNames.split(';').map(i => i ? i : null) : [];
        let obj = {
            _id: el.id,
            name: el.name,
            genre: el.genre,
            rating: el.rating,
            releases: []
        };
        for (let i = 0; i < platformIds.length; i++) {
            obj.releases.push({
                platform: {
                    _id: platformIds[i],
                    name: platformNames[i]
                },
                price: prices[i],
                date: dates[i]
            });
        }
        return obj;
    })
    .then(result => {
        res.send(result);
    })

     //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });   

});






router.get('/:id/releases', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка запроса
    .then(() => {
        return [
            'SELECT',
            [
                'gr.price as price',
                'gr.date as date',
                'p.id as platformId',
                'p.name as platformName'
            ].join(', '),
            'FROM games_releases AS gr',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE gr.id_game = ${db.escape(id)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(el => ({
            platform: {
                _id: el.platformId,
                name: el.platformName
            },
            price: el.price,
            date: el.date
        }))
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });
 
});

router.get('/:id/releases/:idp', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка запроса
    .then(() => {
        return [
            'SELECT',
            [
                'gr.price as price',
                'gr.date as date',
                'p.id as platformId',
                'p.name as platformName'
            ].join(', '),
            'FROM games_releases AS gr',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE gr.id_game = ${db.escape(id)} AND gr.id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "Game or platform not found"}};
        } else {
            let el = result.result[0];
            return {
                platform: {
                    _id: el.platformId,
                    name: el.platformName
                },
                price: el.price,
                date: el.date
            };
        }
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });

});

router.put('/:id/releases', (req, res) => {
    let db;
    let id, idp;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })

    //валидация параметров
    .then(() => {
        if (!req.body.platform) {
            throw {code: 400, data: {error:"Parameter platform is required"}};
        }
        idp = parseInt(req.body.platform);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.body.platform} is invalid`}};
        }        
    })
    .then(() => {
        if (req.body.price) {
            if (typeof(req.body.price) != "number") {
                throw {code: 400, data: {error: "Parameter price has to be a number"}};
            }
            obj.price = req.body.price;
        }
    })
    .then(() => {
        if (req.body.date) {
            if (typeof(req.body.date) != "number") {
                throw {code: 400, data: {error: "Parameter date has to be a number (Unix timestamp)"}};
            }
            obj.date = req.body.date;
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка sql
    .then(() => {
        return [
            'INSERT INTO games_releases',
            '(id_game, id_platform, price, date)',
            'VALUES',
            `(${db.escape(id)}, ${db.escape(idp)}, ${db.escape(obj.price)}, ${db.escape(obj.date)})`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Release with platform ${idp} is already exists`}};
        } else if (error.code == "ER_NO_REFERENCED_ROW_2") {
            throw {code: 404, data: {error: "Game or platform not found"}};
        } else {
            throw error;
        }
    })
    //выборка вставленной записи
    .then(result => {
        return result.result.insertId;
    })

    //подготовка запроса
    .then(insId => {
        return [
            'SELECT',
            [
                'gr.price as price',
                'gr.date as date',
                'p.id as platformId',
                'p.name as platformName'
            ].join(', '),
            'FROM games_releases AS gr',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE gr.id = ${db.escape(insId)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        return {
            platform: {
                _id: el.platformId,
                name: el.platformName
            },
            price: el.price,
            date: el.date
        };
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });          

});

router.delete('/:id/releases/:idp', (req, res) => {
    let db;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })

    //подготовка sql
    .then(() => {
        return [
            'DELETE FROM games_releases',
            `WHERE id_game = ${db.escape(id)} AND id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Game or platform not found"}};
        } else {
            res.send({success: true});
        }
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });  

   
});

router.patch('/:id/releases/:idp', (req, res) => {
    let db;
    let id, idp;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })

    //Проверка наличия параметров
    .then(() => {
        if (Object.keys(req.body).length === 0) {
            throw {code: 400, data: {error: "Parameters for update are empty"}};
        }
    })

    //валидация параметров
    .then(() => {
        if (req.body.price) {
            if (typeof(req.body.price) != "number") {
                throw {code: 400, data: {error: "Parameter price has to be a number"}};
            }

            obj.price = req.body.price;
        }
    })
    .then(() => {
        if (req.body.date) {
            if (typeof(req.body.date) != "number") {
                throw {code: 400, data: {error: "Parameter date has to be a number (Unix timestamp)"}};
            }

            obj.date = req.body.date;
        }
    })

    //Проверка наличия параметров для обновления
    .then(() => {
        if (Object.keys(obj).length === 0) {
            throw {code: 400, data: {error: "Allowed parameters are not set"}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })
    //подготовка sql
    .then(() => {
        return [
            'UPDATE games_releases SET',
            Object.keys(obj).map(i => `${i} = ${db.escape(obj[i])}`).join(', '),
            `WHERE id_game = ${db.escape(id)} AND id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })    
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Game or platform not found"}};
        }
    })  
    //выборка вставленной записи
    .then(() => {
        return [
            'SELECT',
            [
                'gr.price as price',
                'gr.date as date',
                'p.id as platformId',
                'p.name as platformName'
            ].join(', '),
            'FROM games_releases AS gr',
            'LEFT OUTER JOIN platforms as p ON gr.id_platform = p.id',
            `WHERE gr.id_game = ${db.escape(id)} AND gr.id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "Game or platform not found"}};
        } else {
            let el = result.result[0];
            return {
                platform: {
                    _id: el.platformId,
                    name: el.platformName
                },
                price: el.price,
                date: el.date
            };
        }
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (!error.code) {
            throw error;
        } else {
            res.status(error.code).send(error.data);
        }
    })
    .catch(error => {
        res.status(500).send(error);
    });     

 

});

module.exports = router;