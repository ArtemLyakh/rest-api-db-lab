const router = require('express').Router();
const ObjectId = require('mongodb').ObjectId;

router.get('/', (req, res) => {
    let db = req.app.locals.mongo;

    let filter = {};
    let sort = {};
    let limit = 10, skip = 0;

    Promise.resolve()
    //фильтрация
    .then(() => {
        if (req.query.name) {
            filter.name = new RegExp(req.query.name, 'i');
        }
    })
    .then(() => {
        if (req.query.company) {
            filter.company = new RegExp(req.query.company, 'i');
        }
    })
    .then(() => {
        if (req.query.controller) {
            filter.controller = new RegExp(req.query.controller, 'i');
        }
    })
    .then(() => {
        if (req.query.store) {
            filter.store = new RegExp(req.query.store, 'i');
        }
    })

    //сортировка
    .then(() => {
        if (req.query.sort) {
            if (["name", "company", "controller", "store"].indexOf(req.query.sort) === -1) {
                throw {code: 400, data: {error: "Parameter #sort# is invalid"}};
            } else {
                if (!req.query.order || req.query.order === "asc") {
                    sort[req.query.sort] = 1;
                } else if (req.query.order === "desc") {
                    sort[req.query.sort] = -1;
                } else {
                    throw {code: 400, data: {error: "Parameter #order# is invalid"}};
                }
            }
        }
    })

    //пагинация
    .then(() => {
        if (req.query.limit) {
            limit = parseInt(req.query.limit);
            if (isNaN(limit) || limit > 100 || limit <= 0) {
                throw {code: 400, data: {error: "Parameter #limit# is invalid"}};
            }
        }
    })
    .then(() => {
        if (req.query.skip) {
            skip = parseInt(req.query.skip);
            if (isNaN(skip) || skip < 0) {
                throw {code: 400, data: {error: "Parameter #skip# is invalid"}};
            }
        }
    })

    //запрос
    .then(() => {
        return db.collection('platforms').find(filter).sort(sort).skip(skip).limit(limit).toArray();
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
    let db = req.app.locals.mongo;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Platform id: #${req.params.id}# is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('platforms').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Platform not found"}};
        } else {
            res.send(result);
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

router.put('/', (req, res) => {
    let db = req.app.locals.mongo;
    let obj = {};

    Promise.resolve()
    //валидация параметров
    .then(() => {
        if (!req.body.name) {
            throw {code: 400, data: {error: "Parameter #name# is required"}};
        }
        if (typeof(req.body.name) !== "string") {
            throw {code: 400, data: {error: "Parameter #name# has to be a string"}};
        }

        obj.name = req.body.name;
    })
    .then(() => {
        if (req.body.company) {
            if (typeof(req.body.company) !== "string") {
                throw {code: 400, data: {error: "Parameter #company# has to be a string"}};
            }

            obj.company = req.body.company;
        } else {
            obj.company = null;
        }
    })
    .then(() => {
        if (req.body.controller) {
            if (typeof(req.body.controller) !== "string") {
                throw {code: 400, data: {error: "Parameter #controller# has to be a string"}};
            }

            obj.controller = req.body.controller;
        } else {
            obj.controller = null;
        }
    })
    .then(() => {
        if (req.body.store) {
            if (typeof(req.body.store) !== "string") {
                throw {code: 400, data: {error: "Parameter #store# has to be a string"}};
            }

            obj.store = req.body.store;
        } else {
            obj.store = null;
        }
    })

    //запрос
    .then(() => {
        return db.collection('platforms').insert(obj);
    })
    .then(result => {
        res.send(result.ops);
    })

    //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(400).send({error: `Platform with name: ${req.body.name} already exists`});
        } else {
            throw error;
        }
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

router.delete('/:id', (req, res) => {
    let db = req.app.locals.mongo;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Platform id: #${req.params.id}# is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('platforms').deleteOne({_id: id});
    })
    .then(result => {
        if (result.deletedCount === 0) {
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
    let db = req.app.locals.mongo;
    let id;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `Platform id: #${req.params.id}# is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //валидация параметров
    .then(() => {
        if (req.body.name) {
            if (typeof(req.body.name) !== "string") {
                throw {code: 400, data: {error: "Parameter #name# has to be a string"}};
            }

            obj.name = req.body.name;
        }
    })
    .then(() => {
        if (req.body.company) {
            if (typeof(req.body.company) !== "string") {
                throw {code: 400, data: {error: "Parameter #company# has to be a string"}};
            }

            obj.company = req.body.company;
        }
    })
    .then(() => {
        if (req.body.controller) {
            if (typeof(req.body.controller) !== "string") {
                throw {code: 400, data: {error: "Parameter #controller# has to be a string"}};
            }

            obj.controller = req.body.controller;
        }
    })
    .then(() => {
        if (req.body.store) {
            if (typeof(req.body.store) !== "string") {
                throw {code: 400, data: {error: "Parameter #store# has to be a string"}};
            }

            obj.store = req.body.store;
        }
    })

    //запрос
    .then(() => {
        return db.collection('platforms').updateOne({_id: id}, {$set: obj});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "Platform not found"}}
        } else {
            return db.collection('platforms').findOne({_id: id});
        }  
    })
    .then(result => {
        res.send(result);
    })

    //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(400).send({error: `Platform with name: ${req.body.name} already exists`});
        } else {
            throw error;
        }
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

module.exports = router;