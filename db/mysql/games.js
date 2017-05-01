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
            if (["name", "company", "controller", "store"].indexOf(req.query.sort) === -1) {
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
            let prices = el.prices.split(';').map(i => i ? i : null);
            let dates = el.dates.split(';').map(i => i ? i : null);
            let platformIds = el.platformIds.split(';').map(i => i ? i : null);
            let platformNames = el.platformNames.split(';').map(i => i ? i : null);
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
            let prices = el.prices.split(';').map(i => i ? i : null);
            let dates = el.dates.split(';').map(i => i ? i : null);
            let platformIds = el.platformIds.split(';').map(i => i ? i : null);
            let platformNames = el.platformNames.split(';').map(i => i ? i : null);
            let obj = {
                _id: el.id,
                name: el.name,
                genre: el.genre,
                rating: el.rating,
                releases: []
            };
            if (platformIds.length > 1) {
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
        let prices = el.prices.split(';').map(i => i ? i : null);
        let dates = el.dates.split(';').map(i => i ? i : null);
        let platformIds = el.platformIds.split(';').map(i => i ? i : null);
        let platformNames = el.platformNames.split(';').map(i => i ? i : null);
        let obj = {
            _id: el.id,
            name: el.name,
            genre: el.genre,
            rating: el.rating,
            releases: []
        };
        if (platformIds.length > 1) {
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
    let db = req.app.locals.mongo;
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
    //выборка вставленной записи
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
        let prices = el.prices.split(';').map(i => i ? i : null);
        let dates = el.dates.split(';').map(i => i ? i : null);
        let platformIds = el.platformIds.split(';').map(i => i ? i : null);
        let platformNames = el.platformNames.split(';').map(i => i ? i : null);
        let obj = {
            _id: el.id,
            name: el.name,
            genre: el.genre,
            rating: el.rating,
            releases: []
        };
        if (platformIds.length > 1) {
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
    let db = req.app.locals.mongo;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('games').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            return result.releases;
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

router.get('/:id/releases/:idp', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })
    .then(() => {
        if (!ObjectId.isValid(req.params.idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        } else {
            idp = ObjectId.ObjectID(req.params.idp);
        }
    })

    //запрос
    .then(() => {
        return db.collection('games').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            return result.releases;
        }
    })

    //поиск релиза
    .then(releases => {
        return releases.find(i => i.platform._id.equals(idp));
    })
    .then(release => {
        if (!release) {
            throw {code: 404, data: {error: "Platform not found"}};
        } else {
            res.send(release);
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

router.put('/:id/releases', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //валидация параметров
    .then(() => {
        if (!req.body.platform) {
            throw {code: 400, data: {error:"Parameter platform is required"}};
        }
        if (!ObjectId.isValid(req.body.platform)) {
            throw {code: 400, data: {error: `Platform id: ${req.body.platform} is invalid`}};
        }
        idp = ObjectId.ObjectID(req.body.platform);
    })
    .then(() => {
        if (req.body.price) {
            if (typeof(req.body.price) != "number") {
                throw {code: 400, data: {error: "Parameter price has to be a number"}};
            }
        }
    })
    .then(() => {
        if (req.body.date) {
            if (typeof(req.body.date) != "number") {
                throw {code: 400, data: {error: "Parameter date has to be a number (Unix timestamp)"}};
            }
        }
    })

    //проверка существования релиза для данной платформы
    .then(() => {
        return db.collection('games').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            return result.releases.find(i => i.platform._id.equals(idp));
        }
    })
    .then(platform => {
        if (platform) {
            throw {code: 403, data: {error: `Release with platform ${idp.toString()} is already exists`}};
        }
    })


    //запрос плафтормы
    .then(() => {
        return db.collection('platforms').findOne({_id: idp});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Platform not found"}};
        } else {
            return result;
        }
    })

    //создание объекта
    .then(platform => {
        obj = {
            platform: {
                _id: platform._id,
                name: platform.name
            }
        };
        if (req.body.price) obj.price = req.body.price;
        if (req.body.date) obj.date = req.body.date;

        return obj;
    })

    //запрос
    .then(obj => {
        return db.collection('games').updateOne({_id: id}, {$addToSet: {releases: obj}});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            return db.collection('games').findOne({_id: id});
        }
    })
    .then(game => {
        return game.releases.find(i => i.platform._id.equals(idp));
    })
    .then(release => {
        res.send(release);
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
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })
    .then(() => {
        if (!ObjectId.isValid(req.params.idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        } else {
            idp = ObjectId.ObjectID(req.params.idp);
        }
    })

    //запрос
    .then(() => {
        return db.collection('games').updateOne({_id: id}, {$pull: {releases: {"platform._id": idp}}});
    })
    .then(result => {
        if (result.matchedCount === 0) {
            throw {code: 404, data: {error: "Game not found"}};
        }
        if (result.modifiedCount === 0) {
            throw {code: 404, data: {error: "Platform not found"}};
        }
        res.send({success: true});
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
    let db = req.app.locals.mongo;
    let id, idp;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })
    .then(() => {
        if (!ObjectId.isValid(req.params.idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        } else {
            idp = ObjectId.ObjectID(req.params.idp);
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

    //формирование объекта для обновления
    .then(() => {
        let upd = {};
        for (let i in obj) {
            upd[`releases.$.${i}`] = obj[i];
        }
        return {$set: upd};
    })

    //запрос
    .then(upd => {
        return db.collection('games').updateOne({_id: id, "releases.platform._id": idp}, upd);
    })
    .then(result => {
        if (result.matchedCount === 0) {
            throw {code: 404, data: {error: "Game or platform not found"}};
        }
        return db.collection('games').findOne({_id: id});
    })
    .then(result => {
        return result.releases.find(i => i.platform._id.equals(idp));
    })
    .then(release => {
        res.send(release);
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