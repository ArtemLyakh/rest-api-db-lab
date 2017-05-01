const router = require('express').Router();
const {GetConnection, Query} = require('./functions');

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
    .then(() => {
        if (req.query.company) {
            filter.push({key: 'company', value: req.query.company});
        }
    })
    .then(() => {
        if (req.query.controller) {
            filter.push({key: 'controller', value: req.query.controller});
        }
    })
    .then(() => {
        if (req.query.store) {
            filter.push({key: 'store', value: req.query.store});
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
        return `SELECT * FROM ${db.escapeId('platforms')}` +

        (filter.length > 0
        ? (' WHERE' + filter.map(i => ` (${db.escapeId(i.key)} LIKE ${db.escape('%'+i.value+'%')})`))
        : '') +

        (sort
        ? ` ORDER BY ${db.escapeId(sort)} ${order}`
        : '') + 

        (limit
        ? ` LIMIT ${limit}`
        : '') +

        (skip
        ? ` OFFSET ${skip}`
        : '');
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        return result.result.map(i => ({
            _id: i.id,
            name: i.name,
            company: i.company,
            controller: i.controller,
            store: i.store
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

router.get('/:id', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.id} is invalid`}};
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
        return `SELECT * FROM ${db.escapeId('platforms')} 
                WHERE ${db.escapeId('id')} = ${db.escape(id)}`;
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.length === 0) {
            throw {code: 404, data: {error: "Platform not found"}};
        } else {
            let el = result.result[0];
            return {
                _id: el.id,
                name: el.name,
                company: el.company,
                controller: el.controller,
                store: el.store
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
        if (req.body.company) {
            if (typeof(req.body.company) !== "string") {
                throw {code: 400, data: {error: "Parameter company has to be a string"}};
            }

            obj.company = req.body.company;
        } else {
            obj.company = null;
        }
    })
    .then(() => {
        if (req.body.controller) {
            if (typeof(req.body.controller) !== "string") {
                throw {code: 400, data: {error: "Parameter controller has to be a string"}};
            }

            obj.controller = req.body.controller;
        } else {
            obj.controller = null;
        }
    })
    .then(() => {
        if (req.body.store) {
            if (typeof(req.body.store) !== "string") {
                throw {code: 400, data: {error: "Parameter store has to be a string"}};
            }

            obj.store = req.body.store;
        } else {
            obj.store = null;
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
        return `INSERT INTO ${db.escapeId('platforms')} 
                (${db.escapeId('name')}, ${db.escapeId('company')}, ${db.escapeId('controller')}, ${db.escapeId('store')})
                VALUES
                (${db.escape(obj.name)}, ${db.escape(obj.company)}, ${db.escape(obj.controller)}, ${db.escape(obj.store)})`;

    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Platform with name: ${req.body.name} already exists`}};
        } else {
            throw error;
        }
    })
    //выборка вставленной записи
    .then(result => {
        return result.result.insertId;
    })  
    .then(id => {
        return Query(db, `SELECT * FROM ${db.escapeId('platforms')} WHERE ${db.escapeId('id')} = ${db.escape(id)}`);
    })
    .then(result => {
        let el = result.result[0];
        return {
            _id: el.id,
            name: el.name,
            company: el.company,
            controller: el.controller,
            store: el.store
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

router.delete('/:id', (req, res) => {
    let db;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw {code: 400, data: {error: `Platform id: ${req.params.id} is invalid`}};
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
        return `DELETE FROM ${db.escapeId('platforms')} 
                WHERE ${db.escapeId('id')} = ${db.escape(id)}`;
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Platform not found"}};
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
            throw {code: 400, data: {error: `Platform id: ${req.params.id} is invalid`}};
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
        if (req.body.company) {
            if (typeof(req.body.company) !== "string") {
                throw {code: 400, data: {error: "Parameter company has to be a string"}};
            }

            obj.company = req.body.company;
        }
    })
    .then(() => {
        if (req.body.controller) {
            if (typeof(req.body.controller) !== "string") {
                throw {code: 400, data: {error: "Parameter controller has to be a string"}};
            }

            obj.controller = req.body.controller;
        }
    })
    .then(() => {
        if (req.body.store) {
            if (typeof(req.body.store) !== "string") {
                throw {code: 400, data: {error: "Parameter store has to be a string"}};
            }

            obj.store = req.body.store;
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
        return `UPDATE ${db.escapeId('platforms')} SET` +

        Object.keys(obj).map(i => ` ${db.escapeId(i)} = ${db.escape(obj[i])}`).join(',') +

        ` WHERE ${db.escapeId('id')} = ${db.escape(id)}`;
    })
    //запрос
    .then(query => {
        return Query(db, query);
    })
    //нарушение уникальности имени
    .catch(error => {
        if (error.code == "ER_DUP_ENTRY") {
            throw {code: 403, data: {error: `Platform with name: ${req.body.name} already exists`}};
        } else {
            throw error;
        }
    })
    //выборка вставленной записи
    .then(result => {
        if (result.result.affectedRows === 0) {
            throw {code: 404, data: {error: "Platform not found"}};
        } else {
            return Query(db, `SELECT * FROM ${db.escapeId('platforms')} WHERE ${db.escapeId('id')} = ${db.escape(id)}`);
        }
    })  
    .then(result => {
        let el = result.result[0];
        return {
            _id: el.id,
            name: el.name,
            company: el.company,
            controller: el.controller,
            store: el.store
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

module.exports = router;