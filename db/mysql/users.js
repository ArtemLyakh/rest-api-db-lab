const router = require('express').Router();
const {GetConnection, Query} = require('./functions');
const md5 = require('md5');



router.get('/', (req, res) => {
    let db;

    let filter = [];
    let sort, order;
    let limit = 10, skip = 0;

    Promise.resolve()
    //фильтрация
    .then(() => {
        if (req.query.name) {
            filter.push({key: 'name', value: req.query.name});
        }
    })

    //сортировка
    .then(() => {
        if (req.query.sort) {
            if (["name"].indexOf(req.query.sort) === -1) {
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
                'iq.id as id',
                'iq.name as name',
                'iq.password as password',
                'GROUP_CONCAT(IFNULL(iq.platformId, "") SEPARATOR "#") as platformIds',
                'GROUP_CONCAT(IFNULL(iq.platformName, "") SEPARATOR "#") as platformNames',
                'GROUP_CONCAT(IFNULL(iq.gameIds, "") SEPARATOR "#") as gameIds',
                'GROUP_CONCAT(IFNULL(iq.gameNames, "") SEPARATOR "#") as gameNames'
            ].join(', '),
            'FROM (',
                'SELECT',
                [
                    'u.id as id',
                    'u.name as name',
                    'u.password as password',
                    'p.id as platformId',
                    'p.name as platformName',
                    'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                    'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames',
                ].join(', '),
                'FROM users as u',
                'LEFT OUTER JOIN user_libraries as ul ON u.id = ul.id_user',
                'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
                'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
                'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
                'GROUP BY u.id, u.name, u.password, p.id, p.name',
            ') as iq',
            ...(filter.length > 0 ? [[
                    'WHERE',
                    filter.map(i => `(${i.key} LIKE ${db.escape('%'+i.value+'%')})`).join(' AND ')
                ].join(' ')] : []
            ),
            'GROUP BY iq.id, iq.name, iq.password',
            ...(typeof(sort) != 'undefined' ? [`ORDER BY ${db.escapeId(sort)} ${order}`] : []),
            `LIMIT ${limit}`,
            `OFFSET ${skip}`,
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(el => {
            let platformIds = el.platformIds ? el.platformIds.split('#').map(i => i ? i : null) : [];
            let platformNames = el.platformNames ? el.platformNames.split('#').map(i => i ? i : null) : [];
            let gameIdsGroup = el.gameIds ? el.gameIds.split('#').map(i => i ? i : null) : [];
            let gameNamesGroup = el.gameNames ? el.gameNames.split('#').map(i => i ? i : null) : [];
            let obj = {
                _id: el.id,
                name: el.name,
                password: el.password,
                libraries: []
            };
            for (let i = 0; i < platformIds.length; i++) {
                let gameIds = gameIdsGroup[i] ? gameIdsGroup[i].split(';').map(i => i ? i : null) : [];
                let gameNames = gameNamesGroup[i] ? gameNamesGroup[i].split(';').map(i => i ? i : null) : [];
                let library = {
                    platform: {
                        _id: platformIds[i],
                        name: platformNames[i]
                    },
                    games: []
                };
                for (let j = 0; j < gameIds.length; j++) {
                    let game = {
                        _id: gameIds[j],
                        name: gameNames[j]
                    };
                    library.games.push(game);
                }
                obj.libraries.push(library);
            }
            return obj;
        })
    })
    .then(result => {
        res.send(result);
    })


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
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
                'iq.id as id',
                'iq.name as name',
                'iq.password as password',
                'GROUP_CONCAT(IFNULL(iq.platformId, "") SEPARATOR "#") as platformIds',
                'GROUP_CONCAT(IFNULL(iq.platformName, "") SEPARATOR "#") as platformNames',
                'GROUP_CONCAT(IFNULL(iq.gameIds, "") SEPARATOR "#") as gameIds',
                'GROUP_CONCAT(IFNULL(iq.gameNames, "") SEPARATOR "#") as gameNames'
            ].join(', '),
            'FROM (',
                'SELECT',
                [
                    'u.id as id',
                    'u.name as name',
                    'u.password as password',
                    'p.id as platformId',
                    'p.name as platformName',
                    'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                    'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames',
                ].join(', '),
                'FROM users as u',
                'LEFT OUTER JOIN user_libraries as ul ON u.id = ul.id_user',
                'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
                'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
                'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
                'GROUP BY u.id, u.name, u.password, p.id, p.name',
            ') as iq',
            `WHERE iq.id = ${db.escape(id)}`,
            'GROUP BY iq.id, iq.name, iq.password'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            let el = result.result[0];
            let platformIds = el.platformIds ? el.platformIds.split('#').map(i => i ? i : null) : [];
            let platformNames = el.platformNames ? el.platformNames.split('#').map(i => i ? i : null) : [];
            let gameIdsGroup = el.gameIds ? el.gameIds.split('#').map(i => i ? i : null) : [];
            let gameNamesGroup = el.gameNames ? el.gameNames.split('#').map(i => i ? i : null) : [];
            let obj = {
                _id: el.id,
                name: el.name,
                password: el.password,
                libraries: []
            };
            for (let i = 0; i < platformIds.length; i++) {
                let gameIds = gameIdsGroup[i] ? gameIdsGroup[i].split(';').map(i => i ? i : null) : [];
                let gameNames = gameNamesGroup[i] ? gameNamesGroup[i].split(';').map(i => i ? i : null) : [];
                let library = {
                    platform: {
                        _id: platformIds[i],
                        name: platformNames[i]
                    },
                    games: []
                };
                for (let j = 0; j < gameIds.length; j++) {
                    let game = {
                        _id: gameIds[j],
                        name: gameNames[j]
                    };
                    library.games.push(game);
                }
                obj.libraries.push(library);
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
        if (!req.body.password) {
            throw {code: 400, data: {error: "Parameter password is required"}};
        }
        if (typeof(req.body.password) !== "string") {
            throw {code: 400, data: {error: "Parameter password has to be a string"}};
        }

        obj.password = md5(req.body.password + req.app.get('salt'));
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
            'INSERT INTO users',
            '(name, password)',
            'VALUES',
            `(${db.escape(obj.name)}, ${db.escape(obj.password)})`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `User with name: ${req.body.name} already exists`}};
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
                'iq.id as id',
                'iq.name as name',
                'iq.password as password',
                'GROUP_CONCAT(IFNULL(iq.platformId, "") SEPARATOR "#") as platformIds',
                'GROUP_CONCAT(IFNULL(iq.platformName, "") SEPARATOR "#") as platformNames',
                'GROUP_CONCAT(IFNULL(iq.gameIds, "") SEPARATOR "#") as gameIds',
                'GROUP_CONCAT(IFNULL(iq.gameNames, "") SEPARATOR "#") as gameNames'
            ].join(', '),
            'FROM (',
                'SELECT',
                [
                    'u.id as id',
                    'u.name as name',
                    'u.password as password',
                    'p.id as platformId',
                    'p.name as platformName',
                    'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                    'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames',
                ].join(', '),
                'FROM users as u',
                'LEFT OUTER JOIN user_libraries as ul ON u.id = ul.id_user',
                'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
                'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
                'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
                'GROUP BY u.id, u.name, u.password, p.id, p.name',
            ') as iq',
            `WHERE iq.id = ${db.escape(id)}`,
            'GROUP BY iq.id, iq.name, iq.password'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        let platformIds = el.platformIds ? el.platformIds.split('#').map(i => i ? i : null) : [];
        let platformNames = el.platformNames ? el.platformNames.split('#').map(i => i ? i : null) : [];
        let gameIdsGroup = el.gameIds ? el.gameIds.split('#').map(i => i ? i : null) : [];
        let gameNamesGroup = el.gameNames ? el.gameNames.split('#').map(i => i ? i : null) : [];
        let obj = {
            _id: el.id,
            name: el.name,
            password: el.password,
            libraries: []
        };
        for (let i = 0; i < platformIds.length; i++) {
            let gameIds = gameIdsGroup[i] ? gameIdsGroup[i].split(';').map(i => i ? i : null) : [];
            let gameNames = gameNamesGroup[i] ? gameNamesGroup[i].split(';').map(i => i ? i : null) : [];
            let library = {
                platform: {
                    _id: platformIds[i],
                    name: platformNames[i]
                },
                games: []
            };
            for (let j = 0; j < gameIds.length; j++) {
                let game = {
                    _id: gameIds[j],
                    name: gameNames[j]
                };
                library.games.push(game);
            }
            obj.libraries.push(library);
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
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
            'DELETE FROM users',
            `WHERE id = ${db.escape(id)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "User not found"}};
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
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
        if (req.body.password) {
            if (typeof(req.body.password) !== "string") {
                throw {code: 400, data: {error: "Parameter password has to be a string"}};
            }

            obj.password = md5(req.body.password + req.app.get('salt'));
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
            'UPDATE users SET',
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
            throw {code: 403, data: {error: `User with name: ${req.body.name} already exists`}};
        } else {
            throw error;
        }
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "User not found"}};
        }
    })  

    //подготовка запроса
    .then(() => {
        return [
            'SELECT',
            [
                'iq.id as id',
                'iq.name as name',
                'iq.password as password',
                'GROUP_CONCAT(IFNULL(iq.platformId, "") SEPARATOR "#") as platformIds',
                'GROUP_CONCAT(IFNULL(iq.platformName, "") SEPARATOR "#") as platformNames',
                'GROUP_CONCAT(IFNULL(iq.gameIds, "") SEPARATOR "#") as gameIds',
                'GROUP_CONCAT(IFNULL(iq.gameNames, "") SEPARATOR "#") as gameNames'
            ].join(', '),
            'FROM (',
                'SELECT',
                [
                    'u.id as id',
                    'u.name as name',
                    'u.password as password',
                    'p.id as platformId',
                    'p.name as platformName',
                    'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                    'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames',
                ].join(', '),
                'FROM users as u',
                'LEFT OUTER JOIN user_libraries as ul ON u.id = ul.id_user',
                'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
                'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
                'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
                'GROUP BY u.id, u.name, u.password, p.id, p.name',
            ') as iq',
            `WHERE iq.id = ${db.escape(id)}`,
            'GROUP BY iq.id, iq.name, iq.password'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            let el = result.result[0];
            let platformIds = el.platformIds ? el.platformIds.split('#').map(i => i ? i : null) : [];
            let platformNames = el.platformNames ? el.platformNames.split('#').map(i => i ? i : null) : [];
            let gameIdsGroup = el.gameIds ? el.gameIds.split('#').map(i => i ? i : null) : [];
            let gameNamesGroup = el.gameNames ? el.gameNames.split('#').map(i => i ? i : null) : [];
            let obj = {
                _id: el.id,
                name: el.name,
                password: el.password,
                libraries: []
            };
            for (let i = 0; i < platformIds.length; i++) {
                let gameIds = gameIdsGroup[i] ? gameIdsGroup[i].split(';').map(i => i ? i : null) : [];
                let gameNames = gameNamesGroup[i] ? gameNamesGroup[i].split(';').map(i => i ? i : null) : [];
                let library = {
                    platform: {
                        _id: platformIds[i],
                        name: platformNames[i]
                    },
                    games: []
                };
                for (let j = 0; j < gameIds.length; j++) {
                    let game = {
                        _id: gameIds[j],
                        name: gameNames[j]
                    };
                    library.games.push(game);
                }
                obj.libraries.push(library);
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










router.get('/:id/libraries', (req, res) => {
    let db;
    let id;

     Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
                'p.id as platformId',
                'p.name as platformName',
                'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames'
            ].join(', '),
            'FROM user_libraries as ul',
            'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
            'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ul.id_user = ${db.escape(id)}`,
            'GROUP BY p.id, p.name'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(el => {
            let gameIds = el.gameIds ? el.gameIds.split(';').map(i => i ? i : null) : [];
            let gameNames = el.gameNames ? el.gameNames.split(';').map(i => i ? i : null) : [];
            let obj = {
                platform: {
                    _id: el.platformId,
                    name: el.platformName
                },
                games: []
            };
            for (let i = 0; i < gameIds.length; i++) {
                let game = {
                    _id: gameIds[i],
                    name: gameNames[i]
                };
                obj.games.push(game);
            }
            return obj;
        });
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

router.get('/:id/libraries/:idp', (req, res) => {
    let db ;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
                'p.id as platformId',
                'p.name as platformName',
                'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames'
            ].join(', '),
            'FROM user_libraries as ul',
            'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
            'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ul.id_user = ${db.escape(id)} AND p.id = ${db.escape(idp)}`,
            'GROUP BY p.id, p.name'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "User or platform not found"}};
        } else {
            let el = result.result[0];
            let gameIds = el.gameIds ? el.gameIds.split(';').map(i => i ? i : null) : [];
            let gameNames = el.gameNames ? el.gameNames.split(';').map(i => i ? i : null) : [];
            let obj = {
                platform: {
                    _id: el.platformId,
                    name: el.platformName
                },
                games: []
            };
            for (let i = 0; i < gameIds.length; i++) {
                let game = {
                    _id: gameIds[i],
                    name: gameNames[i]
                };
                obj.games.push(game);
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

router.put('/:id/libraries', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
            'INSERT INTO user_libraries',
            '(id_user, id_platform)',
            'VALUES',
            `(${db.escape(id)}, ${db.escape(idp)})`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Library with platform ${idp} is already exists`}};
        } else if (error.code == "ER_NO_REFERENCED_ROW_2") {
            throw {code: 404, data: {error: "User or platform not found"}};
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
                'p.id as platformId',
                'p.name as platformName',
                'GROUP_CONCAT(IFNULL(g.id, "") SEPARATOR ";") as gameIds',
                'GROUP_CONCAT(IFNULL(g.name, "") SEPARATOR ";") as gameNames'
            ].join(', '),
            'FROM user_libraries as ul',
            'LEFT OUTER JOIN platforms as p ON ul.id_platform = p.id',
            'LEFT OUTER JOIN user_libraries_games as ulg ON ul.id = ulg.id_user_library',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ul.id = ${db.escape(insId)}`,
            'GROUP BY p.id, p.name'
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        let gameIds = el.gameIds ? el.gameIds.split(';').map(i => i ? i : null) : [];
        let gameNames = el.gameNames ? el.gameNames.split(';').map(i => i ? i : null) : [];
        let obj = {
            platform: {
                _id: el.platformId,
                name: el.platformName
            },
            games: []
        };
        for (let i = 0; i < gameIds.length; i++) {
            let game = {
                _id: gameIds[i],
                name: gameNames[i]
            };
            obj.games.push(game);
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

router.delete('/:id/libraries/:idp', (req, res) => {
    let db;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
            'DELETE FROM user_libraries',
            `WHERE id_user = ${db.escape(id)} AND id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "User or platform not found"}};
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










router.get('/:id/libraries/:idp/games', (req, res) => {
    let db ;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platforms id: ${req.params.idp} is invalid`}};
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
                'g.name as name'
            ].join(', '),
            'FROM user_libraries_games as ulg',
            'LEFT OUTER JOIN user_libraries as ul ON ulg.id_user_library = ul.id',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ul.id_user = ${db.escape(id)} AND ul.id_platform = ${db.escape(idp)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(el => ({
            _id: el.id,
            name: el.name
        }));
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

router.get('/:id/libraries/:idp/games/:idg', (req, res) => {
    let db;
    let id, idp, idg;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })
    .then(() => {
        idg = parseInt(req.params.idg);
        if (isNaN(idg)) {
            throw {code: 400, data: {error: `Game id: ${req.params.idg} is invalid`}};
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
                'g.name as name'
            ].join(', '),
            'FROM user_libraries_games as ulg',
            'LEFT OUTER JOIN user_libraries as ul ON ulg.id_user_library = ul.id',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ul.id_user = ${db.escape(id)} AND ul.id_platform = ${db.escape(idp)} AND g.id = ${db.escape(idg)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "Not found"}};
        } else {
            let el = result.result[0];
            return {
                _id: el.id,
                name: el.name
            };
        }
    })
    .then(result => {
        res.send(result);
    })


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

router.put('/:id/libraries/:idp/games', (req, res) => {
    let db;
    let id, idp, idg;
    let id_ul;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })

    //валидация параметров
    .then(() => {
        if (!req.body.game) {
            throw {code: 400, data: {error:"Parameter game is required"}};
        }
        idg = parseInt(req.body.game);
        if (isNaN(idg)) {
            throw {code: 400, data: {error: `Game id: ${req.body.game} is invalid`}};
        }        
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })

    //получение id user_libraries
    .then(() => {
        return [
            'SELECT id FROM user_libraries',
            `WHERE id_user = ${db.escape(id)} AND id_platform = ${db.escape(idp)}`,
        ].join(' ');
    })    
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data:{error: 'User or platform not found'}};
        } else {
            id_ul = result.result[0].id;
        }
    })

    //проверка наличия релиза игры для данной платформы
    //подготовка sql
    .then(() => {
        return [
            'SELECT 1 FROM games_releases',
            `WHERE id_game = ${db.escape(idg)} AND id_platform = ${db.escape(idp)}`,
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 403, data:{error: `Game ${idg} hasn't released on platform ${idp} yet`}};
        }
    })

    //подготовка sql
    .then(() => {
        return [
            'INSERT INTO user_libraries_games',
            '(id_user_library, id_game)',
            'VALUES',
            `(${db.escape(id_ul)}, ${db.escape(idg)})`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Game ${idg} is already exists`}};
        } else if (error.code == "ER_NO_REFERENCED_ROW_2") {
            throw {code: 404, data: {error: "Game not found"}};
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
                'g.id as id',
                'g.name as name'
            ].join(', '),
            'FROM user_libraries_games as ulg',
            'LEFT OUTER JOIN user_libraries as ul ON ulg.id_user_library = ul.id',
            'LEFT OUTER JOIN games as g ON ulg.id_game = g.id',
            `WHERE ulg.id = ${db.escape(insId)}`
        ].join(' ');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        let el = result.result[0];
        return {
            _id: el.id,
            name: el.name
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

router.delete('/:id/libraries/:idp/games/:idg', (req, res) => {
    let db;
    let id, idp, idg;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        }
    })
    .then(() => {
        idp = parseInt(req.params.idp);
        if (isNaN(idp)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.idp} is invalid`}};
        }
    })
    .then(() => {
        idg = parseInt(req.params.idg);
        if (isNaN(idg)) {
            throw {code: 400, data: {error: `Game id: ${req.params.idg} is invalid`}};
        }
    })

    //подключение
    .then(() => {
        return GetConnection(req.app.locals.mysql);
    })     
    .then(connection => {
        db = connection;
    })

    //получение id user_libraries
    .then(() => {
        return [
            'SELECT id FROM user_libraries',
            `WHERE id_user = ${db.escape(id)} AND id_platform = ${db.escape(idp)}`,
        ].join(' ');
    })    
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data:{error: 'User or platform not found'}};
        } else {
            return result.result[0].id;
        }
    })

    //подготовка sql
    .then(id_ul => {
        return [
            'DELETE FROM user_libraries_games',
            `WHERE id_user_library = ${db.escape(id_ul)} AND id_game = ${db.escape(idg)}`
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

module.exports = router;