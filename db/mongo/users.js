const router = require('express').Router();
const ObjectId = require('mongodb').ObjectId;
const md5 = require('md5');



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

    //сортировка
    .then(() => {
        if (req.query.sort) {
            if (["name"].indexOf(req.query.sort) === -1) {
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
        return db.collection('users').find(filter).sort(sort).skip(skip).limit(limit).toArray();
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
    let db = req.app.locals.mongo;
    let id;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
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
        if (!req.body.password) {
            throw {code: 400, data: {error: "Parameter password is required"}};
        }
        if (typeof(req.body.password) !== "string") {
            throw {code: 400, data: {error: "Parameter password has to be a string"}};
        }

        obj.password = md5(req.body.password + req.app.get('salt'));
    })
    .then(() => {
        obj.libraries = [];
    })

    //запрос
    .then(() => {
        return db.collection('users').insert(obj);
    })
    .then(result => {
        res.send(result.ops[0]);
    })

    //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(403).send({error: `User with name: ${req.body.name} already exists`});
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
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })

    //запрос
    .then(() => {
        return db.collection('users').deleteOne({_id: id});
    })
    .then(result => {
        if (result.deletedCount === 0) {
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
    let db = req.app.locals.mongo;
    let id;
    let obj = {};

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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

    //запрос
    .then(() => {
        return db.collection('users').updateOne({_id: id}, {$set: obj});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "User not found"}}
        } else {
            return db.collection('users').findOne({_id: id});
        }  
    })
    .then(result => {
        res.send(result);
    })

     //ошибки
    .catch(error => {
        if (error.code == 11000) {
            res.status(403).send({error: `User with name: ${req.body.name} already exists`});
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










router.get('/:id/libraries', (req, res) => {
    let db = req.app.locals.mongo;
    let id;

     Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
        } else {
            id = ObjectId.ObjectID(req.params.id);
        }
    })   

    //запрос
    .then(() => {
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries;
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

router.get('/:id/libraries/:idp', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries;
        }
    })

    //поиск библиотеки
    .then(libraries => {
        return libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        if (!library) {
            throw {code: 404, data: {error: "Library not found"}};
        } else {
            res.send(library);
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

router.put('/:id/libraries', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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

    //проверка существования библиотеки для данной платформы
    .then(() => {
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries.find(i => i.platform._id.equals(idp));
        }
    })
    .then(platform => {
        if (platform) {
            throw {code: 403, data: {error: `Library with platform ${idp.toString()} is already exists`}};
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
        let obj = {
            platform: {
                _id: platform._id,
                name: platform.name
            },
            games: []
        };
        return obj;
    })

    //добавление объекта
    .then(obj => {
        return db.collection('users').updateOne({_id: id}, {$addToSet: {libraries: obj}});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return db.collection('users').findOne({_id: id});
        }
    })
    .then(user => {
        return user.libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        res.send(library);
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
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
        return db.collection('users').updateOne({_id: id}, {$pull: {libraries: {"platform._id": idp}}});
    })
    .then(result => {
        if (result.matchedCount === 0) {
            throw {code: 404, data: {error: "User not found"}};
        }
        if (result.modifiedCount === 0) {
            throw {code: 404, data: {error: "Library not found"}};
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










router.get('/:id/libraries/:idp/games', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries;
        }
    })

    //поиск библиотеки
    .then(libraries => {
        return libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        if (!library) {
            throw {code: 404, data: {error: "Library not found"}};
        } else {
            return library.games;
        }
    })
    .then(games => {
        res.send(games);
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
    let db = req.app.locals.mongo;
    let id, idp, idg;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
    .then(() => {
        if (!ObjectId.isValid(req.params.idg)) {
            throw {code: 400, data: {error: `Game id: ${req.params.idg} is invalid`}};
        } else {
            idg = ObjectId.ObjectID(req.params.idg);
        }
    })

    //запрос
    .then(() => {
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries;
        }
    })

    //поиск библиотеки
    .then(libraries => {
        return libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        if (!library) {
            throw {code: 404, data: {error: "Library not found"}};
        } else {
            return library.games;
        }
    })

    //поиск игры
    .then(games => {
        return games.find(i => i._id.equals(idg));
    })
    .then(game => {
        res.send(game);
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

router.put('/:id/libraries/:idp/games', (req, res) => {
    let db = req.app.locals.mongo;
    let id, idp, idg;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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

    //валидация параметров
    .then(() => {
        if (!req.body.game) {
            throw {code: 400, data: {error:"Parameter game is required"}};
        }
        if (!ObjectId.isValid(req.body.game)) {
            throw {code: 400, data: {error: `Game id: ${req.body.game} is invalid`}};
        }
        idg = ObjectId.ObjectID(req.body.game);
    })

    //проверка существования библиотеки для данной платформы
    .then(() => {
        return db.collection('users').findOne({_id: id});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "User not found"}};
        } else {
            return result.libraries;
        }
    })
    .then(libraries => {
        return libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        if (!library) {
            throw {code: 404, data: {error: "Library not found"}};
        } else {
            return library.games;
        }
    })
    .then(games => {
        return games.find(i => i._id.equals(idg));
    })
    .then(game => {
        if (game) {
            throw {code: 403, data: {error: `Game ${idg.toString()} is already exists`}};
        }
    })

    //запрос игры
    .then(() => {
        return db.collection('games').findOne({_id: idg});
    })
    .then(result => {
        if (!result) {
            throw {code: 404, data: {error: "Game not found"}};
        } else {
            return result;
        }
    })

    //проверка наличия релиза игры для данной платформы
    .then(game => {
        if (game.releases.find(i => i.platform._id.equals(idp))) {
            return game;
        } else {
            throw {code: 403, data:{error: `Game ${idg.toString()} hasn't released on platform ${idp.toString()} yet`}};
        }
    })

    //создание объекта
    .then(game => {
        let obj = {
            _id: game._id,
            name: game.name
        };
        return obj;
    })

    //добавление объекта
    .then(obj => {
        return db.collection('users').updateOne({_id: id, "libraries.platform._id": idp}, {$addToSet: {"libraries.$.games": obj}});
    })
    .then(result => {
        if (result.matchedCount == 0) {
            throw {code: 404, data: {error: "User or library not found"}};
        } else {
            return db.collection('users').findOne({_id: id});
        }
    })
    .then(user => {
        return user.libraries.find(i => i.platform._id.equals(idp));
    })
    .then(library => {
        return library.games.find(i => i._id.equals(idg));
    })  
    .then(game => {
        res.send(game);
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
    let db = req.app.locals.mongo;
    let id, idp, idg;

    Promise.resolve()
    //валидация id
    .then(() => {
        if (!ObjectId.isValid(req.params.id)) {
            throw {code: 400, data: {error: `User id: ${req.params.id} is invalid`}};
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
    .then(() => {
        if (!ObjectId.isValid(req.params.idg)) {
            throw {code: 400, data: {error: `Game id: ${req.params.idg} is invalid`}};
        } else {
            idg = ObjectId.ObjectID(req.params.idg);
        }
    })

    //запрос
    .then(() => {
        return db.collection('users').updateOne({_id: id, "libraries.platform._id": idp}, {$pull: {"libraries.$.games": {"_id": idg}}});
    })
    .then(result => {
        if (result.matchedCount === 0) {
            throw {code: 404, data: {error: "User or platform not found"}};
        }
        if (result.modifiedCount === 0) {
            throw {code: 404, data: {error: "Game not found"}};
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

module.exports = router;