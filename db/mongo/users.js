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
                res.status(404).send({success: false});
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




// router.get('/:id/platforms', (req, res) => {
//     let db = req.app.locals.mongo;

//     if (!ObjectId.isValid(req.params.id)){
//         res.status(400).send({error: "Id is invalid"});
//         return;
//     }

//     let id = new ObjectId.ObjectID(req.params.id);

//     db.collection('games').findOne({_id: id})
//         .then(result => {
//             if (!result) {
//                 res.status(404).send({success: false});
//             } else {
//                 res.send(result.platforms);
//             }
//         })
//         .catch(error => {
//             res.status(500).send({error});
//         });
// });

// router.get('/:id/platforms/:idp', (req, res) => {
//     let db = req.app.locals.mongo;

//     if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.idp)) {
//         res.status(400).send({error: "Id is invalid"});
//         return;
//     }

//     let id = new ObjectId.ObjectID(req.params.id);
//     let idp = new ObjectId.ObjectID(req.params.idp);

//     db.collection('games').findOne({_id: id})
//         .then(result => {
//             if (!result) {
//                 res.status(404).send({error: "Game not found"});
//             } else {
//                 let platform = null;
//                 result.platforms.forEach((el, i, arr) => {
//                     if (el.platform && el.platform._id == req.params.idp) {
//                         platform = el;
//                     }
//                 });
//                 if (platform == null) {
//                     res.status(404).send({success: false});
//                 } else {
//                    res.send(platform);
//                 }               
//             }
//         })
//         .catch(error => {
//             res.status(500).send({error});
//         });
// });

// router.put('/:id/platforms', (req, res) => {
//     let db = req.app.locals.mongo;

//     if (!ObjectId.isValid(req.params.id)) {
//         res.status(400).send({error: "Id is invalid"});
//         return;
//     }

//     let id = new ObjectId.ObjectID(req.params.id);

//     let errors = [];
//     if (!req.body.platform) {
//         errors.push("Parametr #platform# is required");
//     }
//     if (ObjectId.isValid(req.body.platform && !req.body.platform)) {
//         errors.push(`Platform id: ${req.body.platform} is invalid`);
//     }
//     if (req.body.price && (typeof(req.body.price) != "number" || req.body.price < 0)) {
//         errors.push("Parametr #price# is invalid");
//     }
//     if (req.body.release && (typeof(req.body.release) != "number" || req.body.release < 0)) {
//         errors.push("Parametr #release# is invalid");
//     }

//     if (errors.length > 0) {
//         res.status(400).send({errors});
//         return;
//     }
    
//     let platformId = new ObjectId.ObjectID(req.body.platform);

//     db.collection('platforms').findOne({_id: platformId})
//         .then(result => {
//             if (!result) {
//                 res.status(404).send({error: "Platforms not found"});
//             } else {
//                 let obj = {
//                     platform: {
//                         _id: result._id,
//                         name: result.name
//                     }
//                 }
//                 if (req.body.price) obj.price = req.body.price;
//                 if (req.body.release) obj.release = req.body.release;

//                 db.collection('games').updateOne({_id: id}, {$addToSet: {platforms: obj}})
//                     .then(result => {
//                         if (result.matchedCount == 0) {
//                             res.status(404).send({error: "Game not found"});
//                         } else {
//                             res.send({success: true});
//                         }
//                     })
//                     .catch(error => {
//                         res.status(500).send({error});
//                     });
//             }
//         })
//         .catch(error => {
//             res.status(500).send({error});
//         });


// });

// router.delete('/:id/platforms/:idp', (req, res) => {
//     let db = req.app.locals.mongo;

//     if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.idp)) {
//         res.status(400).send({error: "Id is invalid"});
//         return;
//     }

//     let id = new ObjectId.ObjectID(req.params.id);
//     let idp = new ObjectId.ObjectID(req.params.idp);

//     db.collection('games').findOne({_id: id})
//         .then(result => {
//             if (!result) {
//                 res.status(404).send({error: "Game not found"});
//             } else {
//                 let platforms = [];
//                 result.platforms.forEach(el => {
//                     if (!el.platform || !el.platform._id.equals(idp)) {
//                         platforms.push(el);
//                     }
//                 });
//                 if (result.platforms.length === platforms.length) {
//                     res.status(404).send({error: "Platform not found"});
//                 } else {
//                     db.collection('games').updateOne({_id: id}, {platforms})
//                         .then(result => {
//                             res.send({success: true});
//                         })
//                         .catch(error => {
//                             res.status(500).send({error});
//                         });
//                 }
//             }
            
//         })
//         .catch(error => {
//             res.status(500).send({error});
//         });
// });

// router.patch('/:id/platforms/:idp', (req, res) => {
//     let db = req.app.locals.mongo;

//     if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.idp)) {
//         res.status(400).send({error: "Id is invalid"});
//         return;
//     }

//     let id = new ObjectId.ObjectID(req.params.id);
//     let idp = new ObjectId.ObjectID(req.params.idp);

//     let errors = [];
//     if (req.body.price && (typeof(req.body.price) != "number" || req.body.price < 0)) {
//         errors.push("Parametr #price# is invalid");
//     }
//     if (req.body.release && (typeof(req.body.release) != "number" || req.body.release < 0)) {
//         errors.push("Parametr #release# is invalid");
//     }

//     if (errors.length > 0) {
//         res.status(400).send({errors});
//         return;
//     }
    
//     db.collection('games').findOne({_id: id})
//         .then(result => {
//             if (!result) {
//                 res.status(404).send({error: "Game not found"});
//             } else {
//                 let platforms = [];
//                 let found = false;
//                 result.platforms.forEach(el => {
//                     if (el.platform && el.platform._id.equals(idp)) {
//                         if (req.body.price) el.price = req.body.price;
//                         if (req.body.release) el.release = req.body.release;
//                         platforms.push(el);
//                         found = true;
//                     } else {
//                         platforms.push(el);
//                     }
//                 });
//                 if (!found) {
//                     res.status(404).send({error: "Platform not found"});
//                 } else {
//                     db.collection('games').updateOne({_id: id}, {platforms})
//                         .then(result => {
//                             res.send({success: true});
//                         })
//                         .catch(error => {
//                             res.status(500).send({error});
//                         });
//                 }
//             }
            
//         })
//         .catch(error => {
//             res.status(500).send({error});
//         });


// });

module.exports = router;