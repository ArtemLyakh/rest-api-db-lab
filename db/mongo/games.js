const models = require('./games_model');


module.exports.get = (req, res) => {
    let db = req.app.locals.mongo;
    let limit = 10, skip = 0;
    let errors = [];

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
    }
        

    db.collection('games').find({}).skip(skip).limit(limit).toArray()
        .then(data => {
            res.send(data);
        })
        .catch(error => {
            res.status(500).send({error});
        });
};

module.exports.put = (req, res) => {
    let db = req.app.locals.mongo;
    let game = models;
    let obj = {};
    let errors = [];

    for (var key in game) {
        let required = game[key].required;
        let type = game[key].type;

        if (required && !req.body[key]){
            errors.push(`Field ${key} is required`);
        }

        if (typeof(req.body[key]) != type){
            errors.push(`Field ${key} have to be a ${type}`);
        }

        obj[key] = req.body[key];
    }

    if (errors.length > 0) {
        res.status(400).send({errors});
    }

    db.collection('games').insert(obj, (error, result) => {
        if (error) {
            res.status(500).send({error});
        }
        res.send(result);
    });
}