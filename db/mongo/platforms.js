const router = require('express').Router();
const model = require('./platforms_model');
const ObjectId = require('mongodb').ObjectId;

router.get('/', (req, res) => {
    let db = req.app.locals.mongo;
    let limit = 10, skip = 0;
    let sort = {};
    let errors = [];

    if (req.query.sort) {
        if (typeof(model[req.query.sort]) == "undefined") {
            errors.push('Parametr #sort# is invalid');
        } else {
            sortKey = req.query.sort;
            if (req.query.direction === "desc") {
                sort[sortKey] = -1;
            } else if (!req.query.direction || req.query.direction === "asc") {
                sort[sortKey] = 1;
            } else {
                errors.push('Parametr #direction# is invalid');
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
    for (var key in model) {
        let filterable = model[key].filterable;
        if (!filterable) continue;

        if (req.query[key]){
            filter[key] = new RegExp('.*' + req.query[key] + '.*', 'i');
        }
    }

    db.collection('platforms').find(filter).sort(sort).skip(skip).limit(limit).toArray()
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
        res.status(400).send("Id is invalid");
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    db.collection('platforms').findOne({_id: id})
        .then(result => {
            if (!result) {
                res.status(404).send({success: false});
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

    for (var key in model) {
        let type = model[key].type;
        let required = model[key].required;

        if (type == "object" || type == "array") continue;

        if (required && !req.body[key]){
            errors.push(`Field ${key} is required`);
        }
        if (req.body[key] && typeof(req.body[key]) != type){
            errors.push(`Field ${key} have to be a ${type}`);
        }

        if (req.body[key]) obj[key] = req.body[key];
    }

    if (errors.length > 0) {
        res.status(400).send({errors});
        return;
    }

    db.collection('platforms').insert(obj)
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
        res.status(400).send("Id is invalid");
        return;
    }

    let id = new ObjectId.ObjectID(req.params.id);

    db.collection('platforms').deleteOne({_id: id})
        .then(result => {
            if (result.deletedCount === 0) {
                res.status(404).send({success: false});
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
        res.status(400).send("Id is invalid");
        return;
    }
    let id = new ObjectId.ObjectID(req.params.id);

    for (var key in model) {
        let type = model[key].type;
        if (type == "object" || type == "array") continue;

        if (req.body[key] && typeof(req.body[key]) != type){
            errors.push(`Field ${key} have to be a ${type}`);
        }

        if (req.body[key]) obj[key] = req.body[key];
    }

    if (errors.length > 0) {
        res.status(400).send({errors});
        return;
    }
    
    db.collection('platforms').updateOne({_id: id}, {$set: obj})
        .then(result => {
            res.send({success: true});
        })
        .catch(error => {
            if (error.code == 11000) {
                res.status(400).send({error: "Duplicates are forbidden"});
            } else {
                res.status(500).send({error});
            }
        });

});

module.exports = router;