const router = require('express').Router();
const bodyParser = require('body-parser');
const reset = require('./reset');
const gamesRouter = require('./games');
const platformsRouter = require('./platforms');
const usersRouter = require('./users');

router.use(bodyParser.json());

router.post('/reset', reset.resetDB);

router.use('/platforms', platformsRouter);
router.use('/games', gamesRouter);
router.use('/users', usersRouter);

module.exports = router;