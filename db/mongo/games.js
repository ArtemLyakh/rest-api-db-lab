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
        if (req.query.genre) {
            filter.genre = new RegExp(req.query.genre, 'i');
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
                    filter.rating = {$gte: low, $lte: top};
                } else if (ratingArr[0]) {
                    if (isNaN(low)) {
                        throw {code: 400, data: {error: "Parameter rating is invalid"}};
                    }
                    filter.rating = {$gte: low};
                } else if (ratingArr[1]) {
                    if (isNaN(top)) {
                        throw {code: 400, data: {error: "Parameter rating is invalid"}};
                    }
                    filter.rating = {$lte: top};                  
                } else {
                    throw {code: 400, data: {error: "Parameter rating is invalid"}};
                }
            } else {
                let rating = parseInt(req.query.rating);
                if (isNaN(rating)) {
                    throw {code: 400, data: {error: "Parameter rating is invalid"}};
                }
                filter.rating = rating;
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
                    sort[req.query.sort] = 1;
                } else if (req.query.order === "desc") {
                    sort[req.query.sort] = -1;
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

    //запрос
    .then(() => {
        return db.collection('games').find(filter).sort(sort).skip(skip).limit(limit).toArray();
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
    .then(() => {
        obj.releases = [];
    })

    //запрос
    .then(() => {
        return db.collection('games').insert(obj);
    })
    .then(result => {
        res.send(result.ops);
    })

    //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(403).send({error: `Game with name: ${req.body.name} already exists`});
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
            throw {code: 400, data: {error: `Game id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('games').deleteOne({_id: id});
    })
    .then(result => {
        if (result.deletedCount === 0) {
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
    let db = req.app.locals.mongo;
    let id;
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

    //запрос
    .then(() => {
        return db.collection('games').updateOne({_id: id}, {$set: obj});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "Game not found"}}
        } else {
            return db.collection('games').findOne({_id: id});
        }  
    })
    .then(result => {
        res.send(result);
    })

     //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(403).send({error: `Game with name: ${req.body.name} already exists`});
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