const router = require('express').Router();
const bodyParser = require('body-parser');
const functions = require('./functions');
const game = require('./games');
const platformsRouter = require('./platforms');

router.use(bodyParser.json());

router.get('/', (req, res) => {
    res.render('mongodoc');
});

router.post('/reset', functions.resetDB);

router.route('/games')
    .get(game.get)
    .put(game.put);

router.use('/platforms', platformsRouter);


module.exports = router;