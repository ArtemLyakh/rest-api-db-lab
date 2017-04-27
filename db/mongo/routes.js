const router = require('express').Router();
const bodyParser = require('body-parser');
const functions = require('./functions');
const gamesRouter = require('./games');
const platformsRouter = require('./platforms');
const usersRouter = require('./users');

router.use(bodyParser.json());

router.get('/', (req, res) => {
    res.render('mongodoc');
});

router.post('/reset', functions.resetDB);


router.use('/platforms', platformsRouter);
router.use('/games', gamesRouter);
router.use('/users', usersRouter);


module.exports = router;