let md5 = require('md5');

module.exports.resetDB = (req, res) => {
    let db = req.app.locals.mongo;
    let platforms, games, users;
    let pc, ps4;
    let gta, lastofus, bioshock;
    let user1, user2;

    db.dropDatabase()
        //создание коллекции платформ
        .then(result => {
            return db.createCollection("platforms");
        })
        .then(collection => {
            platforms = collection;
            return collection.createIndex("name", {unique: true});
        })
        //добавление PC
        .then(indexName => {
            return platforms.insertOne({
                name: "PC",
                controller: "Mouse + keyboard"
            });
        })
        .then(result => {
            pc = result.insertedId;
            return;
        })
        //добавление PS4
        .then(() => {
            return platforms.insertOne({
                name: "PlayStation 4",
                company: "Sony",
                controller: "DualShock4",
                store: "PS Store"
            });
        })
        .then(result => {
            ps4 = result.insertedId;
            return;
        })

        //создание коллекции игр
        .then(() => {
            return db.createCollection("games");
        })
        .then(collection => {
            games = collection;
            return collection.createIndex("name", {unique: true});
        })
        //добавление GTA
        .then(indexName => {
            return games.insertOne({
                name: "Grand Theft Auto V",
                genre: "Action",
                rating: 97,
                platforms: [
                    {
                        platform: {
                            _id: pc,
                            name: "PC"
                        },
                        price: 2000,
                        release: 1493319189
                    },
                    {
                        platform: {
                            _id: ps4,
                            name: "PlayStation 4"
                        },
                        price: 2500,
                        release: 1493319189
                    }
                ]
            });
        })
        .then(result => {
            gta = result.insertedId;
            return;
        })
        //добавление Bioshock
        .then(indexName => {
            return games.insertOne({
                name: "BioShock Infinite",
                genre: "Shooter",
                rating: 95,
                platforms: [
                    {
                        platform: {
                            _id: pc,
                            name: "PC"
                        },
                        price: 1500
                    },
                    {
                        platform: {
                            _id: ps4,
                            name: "PlayStation 4"
                        },
                        price: 2000,
                        release: 1493319189
                    }
                ]
            });
        })
        .then(result => {
            bioshock = result.insertedId;
            return;
        })
        //добавление Last of us
        .then(indexName => {
            return games.insertOne({
                name: "The Last of Us",
                genre: "Action",
                rating: 97,
                platforms: [
                    {
                        platform: {
                            _id: ps4,
                            name: "PlayStation 4"
                        },
                        price: 2500,
                        release: 1493319189
                    }
                ]
            });
        })
        .then(result => {
            lastofus = result.insertedId;
            return;
        })


        //создание коллекции пользователей
        .then(() => {
            return db.createCollection("users");
        })
        .then(collection => {
            users = collection;
            return collection.createIndex("name", {unique: true});
        })
        //добавление user1
        .then(indexName => {
            return users.insertOne({
                name: "user1",
                password: md5("123321" + req.app.get('salt')),
                libraries: [
                    {
                        platform: {
                            _id: pc,
                            name: "PC"
                        },
                        games: [
                            {
                                _id: gta,
                                name: "Grand Theft Auto V"
                            },
                            {
                                _id: bioshock,
                                name: "BioShock Infinite"
                            }
                        ]
                    }
                ]
            });
        })
        .then(result => {
            user1 = result.insertedId;
            return;
        })
        //добавление user2
        .then(indexName => {
            return users.insertOne({
                name: "user2",
                password: md5("qwerty" + req.app.get('salt')),
                libraries: [
                    {
                        platform: {
                            _id: pc,
                            name: "PC"
                        },
                        games: [
                            {
                                _id: bioshock,
                                name: "BioShock Infinite"
                            }
                        ]
                    },
                    {
                        platform: {
                            _id: ps4,
                            name: "PlayStation 4"
                        },
                        games: [
                            {
                                _id: lastofus,
                                name: "The Last of Us"
                            }
                        ]
                    }
                ]
            });
        })
        .then(result => {
            user2 = result.insertedId;
            return;
        })




        .then(() => {
            res.send({success: true});
        })
        .catch(error => {
            res.status(500).send({error});
        });



};