const router = require('express').Router();
const model = require('./users_model');
const ObjectId = require('mongodb').ObjectId;
const md5 = require('md5');

router.get('/', (req, res) => {
    let db = req.app.locals.mongo;
    let limit = 10, skip = 0;
    let sort = {};
    let errors = [];

    if (req.query.sort) {
        if (typeof(model[req.query.sort]) == "undefined" || model[req.query.sort].sortable === false) {
            errors.push('Parameter #sort# is invalid');
        } else {
            sortKey = req.query.sort;
            if (req.query.direction === "desc") {
                sort[sortKey] = -1;
            } else if (!req.query.direction || req.query.direction === "asc") {
                sort[sortKey] = 1;
            } else {
                errors.push('Parameter #direction# is invalid');
            }
        }
    }

    if (req.query.limit) {
        limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit > 100 || limit < 0)
            errors.push('Parameter #limit# is invalid');
    } 
    if (req.query.skip) {
        skip = parseInt(req.query.skip);
        if (isNaN(skip) || skip < 0)
            errors.push('Parameter #skip# is invalid');
    }
    if (errors.length > 0){
        res.status(400).send({errors});
        return;
    }
        
    let filter = {};
    for (let key in model) {
        if (model[key].type == "array") continue;
        let filterable = model[key].filterable;
        if (!filterable) continue;

        if (req.query[key]){
            filter[key] = new RegExp('.*' + req.query[key] + '.*', 'i');
        }
    }

    db.collection('users').find(filter).sort(sort).skip(skip).limit(limit).toArray()
        .then(data => {
            res.send(data);
        })
        .catch(error => {
            res.status(500).send({error});
        });
});

router.get('/:id', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id)){
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    db.collection('users').findOne({_id: id})
        .then(result => {
            if (!result) {
                res.status(404).send({error: "User not found"});
            } else {
                res.send(result);
            }
        })
        .catch(error => {
            res.status(500).send({error});
        });
});

router.put('/', (req, res) => {
    let db = req.app.locals.mongo;
    let obj = {};
    let errors = [];

    for (let key in model) {
        let type = model[key].type;

        if (type == "array") {
            obj[key] = [];
            continue;
        }

        let required = model[key].required;

        if (required && !req.body[key]){
            errors.push(`Field ${key} is required`);
        }
        if (req.body[key] && typeof(req.body[key]) != type){
            errors.push(`Field ${key} have to be a ${type}`);
        }

        if (key == 'password') {
            obj[key] = md5(req.body[key] + req.app.get('salt'));
        } else {
            if (req.body[key]) obj[key] = req.body[key];
        }
    }

    if (errors.length > 0) {
        res.status(400).send({errors});
        return;
    }

    db.collection('users').insert(obj)
        .then(result => {
            res.send(result.ops);
        })
        .catch(error => {
            if (error.code == 11000) {
                res.status(400).send({error: "Duplicates are forbidden"});
            } else {
                res.status(500).send({error});
            }
        });
});

router.delete('/:id', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id)){
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    db.collection('users').deleteOne({_id: id})
        .then(result => {
            if (result.deletedCount === 0) {
                res.status(404).send({error: "User not found"});
            } else {
                res.send({success: true});
            }
        })
        .catch(error => {
            res.status(500).send({error});
        });

});

router.patch('/:id', (req, res) => {
    let db = req.app.locals.mongo;
    let obj = {};
    let errors = [];

    if (!ObjectId.isValid(req.params.id)){
        res.status(400).send({error: "Id is invalid"});
        return;
    }
    let id = new ObjectId.ObjectID(req.params.id);

    for (var key in model) {
        let type = model[key].type;
        if (type == "array") continue;

        if (req.body[key] && typeof(req.body[key]) != type){
            errors.push(`Field ${key} have to be a ${type}`);
        }

        if (key == 'password') {
            if (req.body[key]) obj[key] = md5(req.body[key] + req.app.get('salt'));
        } else {
            if (req.body[key]) obj[key] = req.body[key];
        }
    }

    if (errors.length > 0) {
        res.status(400).send({errors});
        return;
    }
    
    db.collection('users').updateOne({_id: id}, {$set: obj})
        .then(result => {
            if (result.matchedCount == 0) {
                res.status(404).send({error: "User not found"});
            } else {
                res.send({success: true});
            }          
        })
        .catch(error => {
            if (error.code == 11000) {
                res.status(400).send({error: "Duplicates are forbidden"});
            } else {
                res.status(500).send({error});
            }
        });

});




router.get('/:id/libraries', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id)){
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    db.collection('users').findOne({_id: id})
        .then(result => {
            if (!result) {
                res.status(404).send({error: "User not found"});
            } else {
                res.send(result.libraries);
            }
        })
        .catch(error => {
            res.status(500).send({error});
        });
});

router.get('/:id/libraries/:idp', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.idp)) {
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);
    let idp = new ObjectId.ObjectID(req.params.idp);

    db.collection('users').findOne({_id: id})
        .then(result => {
            if (!result) {
                res.status(404).send({error: "User not found"});
            } else {
                let library = null;
                result.libraries.forEach((el, i, arr) => {
                    if (el.platform && el.platform._id == req.params.idp) {
                        library = el;
                    }
                });
                if (library == null) {
                    res.status(404).send({error: "Library not found"});
                } else {
                   res.send(library);
                }               
            }
        })
        .catch(error => {
            res.status(500).send({error});
        });
});

router.put('/:id/libraries', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id)) {
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    if (!req.body.platform) {
        res.status(400).send({error: "Parameter #platform# is required"});
        return;
    }
    if (!ObjectId.isValid(req.body.platform)) {
        res.status(400).send({error: `Platform id: ${req.body.platform} is invalid`});
        return;
    }
    
    let platformId = new ObjectId.ObjectID(req.body.platform);

    db.collection('users').findOne({_id: id})
        .then(result => {
            if (!result) {
                throw {code: 404, data: {error: "User not found"}};
            } else {
                let exist = false;
                result.libraries.forEach(el => {
                    if (el.platform && el.platform._id == req.body.platform) {
                        exist = true;
                    }
                });

                if (exist) {
                    throw {code: 400, data: {error: "Platform already exists"}};
                } else {
                    return db.collection('platforms').findOne({_id: platformId});
                }
            }
        })
        .then(result => {
            if (result == null) {
                throw {code: 404, data: {error: "Platform not found"}};
            } else {
                let obj = {
                    platform: {
                        _id: req.body.platform,
                        name: result.name
                    },
                    games: []
                };
                return db.collection('users').updateOne({_id: id}, {$addToSet: {libraries: obj}});
            }
        })
        .then(result => {
            res.send({success: true});
        })
        .catch(error => {
            if (error.code) {
                res.status(error.code).send(error.data);
            } else {
                res.status(500).send({error});
            }            
        });

});

router.delete('/:id/libraries/:idp', (req, res) => {
    let db = req.app.locals.mongo;

    if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.idp)) {
        res.status(400).send({error: "Id is invalid"});
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);
    let idp = new ObjectId.ObjectID(req.params.idp);

    db.collection('users').findOne({_id: id})
        .then(result => {
            if (!result) {
                throw {code: 404, data: {error: "User not found"}};
            } else {
                let libraries = [];
                result.libraries.forEach(el => {
                    if (!el.platform || !el.platform._id == req.params.idp) {
                        libraries.push(el);
                    }
                });
                if (result.libraries.length === libraries.length) {
                    throw {code: 404, data: {error: "Platform not found"}};
                } else {
                    return db.collection('users').updateOne({_id: id}, {libraries});
                }
            }
        })
        .then(result => {
            res.send({success: true});
        })
        .catch(error => {
            if (error.code) {
                res.status(error.code).send(error.data);
            } else {
                res.status(500).send({error});
            } 
        });
});




module.exports = router;