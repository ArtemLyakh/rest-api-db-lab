const {GetConnection, Query} = require('./functions');
const md5 = require('md5');
const dbName = require('../../config').mysql.name;

module.exports.resetDB = (req, res) => {
    let db;
    let pc, ps4;
    let gta, lastofus, bioshock;
    let user1, user2;
    let user1_pc, user2_pc, user2_ps4;

    GetConnection(req.app.locals.mysql)
    .then(connection => {
        db = connection;
    })

    //сброс или создание таблиц
    //platforms
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "platforms")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `platforms` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`name` VARCHAR(50) NOT NULL , ' +
                        '`company` VARCHAR(50) NULL DEFAULT NULL , ' +
                        '`controller` VARCHAR(50) NULL DEFAULT NULL , ' +
                        '`store` VARCHAR(50) NULL DEFAULT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`name`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `platforms`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `platforms` AUTO_INCREMENT = 1');
            });
        }
    })

    //games
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "games")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `games` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`name` VARCHAR(50) NOT NULL , ' +
                        '`genre` VARCHAR(50) NULL DEFAULT NULL , ' +
                        '`rating` INT(5) NULL DEFAULT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`name`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `games`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `games` AUTO_INCREMENT = 1');
            });
        }
    })

    //users
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "users")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `users` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`name` VARCHAR(50) NOT NULL , ' +
                        '`password` VARCHAR(50) NOT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`name`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `users`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `users` AUTO_INCREMENT = 1');
            });
        }
    })

    //games_releases
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "games_releases")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `games_releases` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`id_game` INT(10) NOT NULL , ' +
                        '`id_platform` INT(10) NOT NULL , ' +
                        '`price` INT(10) NULL DEFAULT NULL , ' +
                        '`date` INT(10) NULL DEFAULT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`id_game`, `id_platform`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `games_releases` ' +
                    'ADD FOREIGN KEY (`id_game`) ' +
                    'REFERENCES `games`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `games_releases` ' +
                    'ADD FOREIGN KEY (`id_platform`) ' +
                    'REFERENCES `platforms`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `games_releases`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `games_releases` AUTO_INCREMENT = 1');
            });
        }
    })

    //user_libraries
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "user_libraries")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `user_libraries` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`id_user` INT(10) NOT NULL , ' +
                        '`id_platform` INT(10) NOT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`id_user`, `id_platform`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `user_libraries` ' +
                    'ADD FOREIGN KEY (`id_user`) ' +
                    'REFERENCES `users`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `user_libraries` ' +
                    'ADD FOREIGN KEY (`id_platform`) ' +
                    'REFERENCES `platforms`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `user_libraries`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `user_libraries` AUTO_INCREMENT = 1');
            });
        }
    })

    //user_libraries_games
    .then(() => {
        return Query(
            db, 
            'SELECT count(*) as count ' +
            'FROM `information_schema`.`TABLES` ' +
            'WHERE (`TABLE_SCHEMA` = ?) AND (`TABLE_NAME` = "user_libraries_games")',
            [dbName]
        );
    })
    .then(result => {
        if (result.result[0].count === 0) {
            return Promise.resolve()
            .then(() => {
                Query(
                    db,
                    'CREATE TABLE `user_libraries_games` ' +
                    '( ' +
                        '`id` INT(10) NOT NULL AUTO_INCREMENT , ' +
                        '`id_user_library` INT(10) NOT NULL , ' +
                        '`id_game` INT(10) NOT NULL , ' +
                        'PRIMARY KEY (`id`), ' +
                        'UNIQUE (`id_user_library`, `id_game`)) ' +
                    'ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci;',
                    [dbName]
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `user_libraries_games` ' +
                    'ADD FOREIGN KEY (`id_user_library`) ' +
                    'REFERENCES `user_libraries`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            })
            .then(() => {
                Query(
                    db,
                    'ALTER TABLE `user_libraries_games` ' +
                    'ADD FOREIGN KEY (`id_game`) ' +
                    'REFERENCES `games`(`id`) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;'
                );
            });
        } else {
            return Promise.resolve()
            .then(() => {
                Query(db, 'DELETE FROM `user_libraries_games`');
            })
            .then(() => {
                Query(db, 'ALTER TABLE `user_libraries_games` AUTO_INCREMENT = 1');
            });
        }
    })


    //заполнение данными
    //platforms
    //pc
    .then(() => {
        return Query(
            db,
            'INSERT INTO `platforms` (`id`, `name`, `company`, `controller`, `store`) VALUES (NULL, "PC", NULL, "Mouse + keyboard", NULL)'
        );
    })
    .then(result => {
        pc = result.result.insertId;
    })
    //ps4
    .then(() => {
        return Query(
            db,
            'INSERT INTO `platforms` (`id`, `name`, `company`, `controller`, `store`) VALUES (NULL, "PlayStation 4", "Sony", "DualShock4", "PS Store")'
        );
    })
    .then(result => {
        ps4 = result.result.insertId;
    })

    //games
    //gta
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games` (`id`, `name`, `genre`, `rating`) VALUES (NULL, "Grand Theft Auto V", "Action", "97")'
        );
    })
    .then(result => {
        gta = result.result.insertId;
    })
    //bioshock
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games` (`id`, `name`, `genre`, `rating`) VALUES (NULL, "BioShock Infinite", "Shooter", "95")'
        );
    })
    .then(result => {
        bioshock = result.result.insertId;
    })
    //lastofus
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games` (`id`, `name`, `genre`, `rating`) VALUES (NULL, "The Last of Us", "Action", "97")'
        );
    })
    .then(result => {
        lastofus = result.result.insertId;
    })

    //users
    //user1
    .then(() => {
        return Query(
            db,
            'INSERT INTO `users` (`id`, `name`, `password`) VALUES (NULL, "user1", ?)',
            [md5("123321" + req.app.get('salt'))]
        );
    })
    .then(result => {
        user1 = result.result.insertId;
    })    
    //user2
    .then(() => {
        return Query(
            db,
            'INSERT INTO `users` (`id`, `name`, `password`) VALUES (NULL, "user2", ?)',
            [md5("qwerty" + req.app.get('salt'))]
        );
    })
    .then(result => {
        user2 = result.result.insertId;
    })   

    //games_releases
    //gta - pc
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games_releases` (`id`, `id_game`, `id_platform`, `price`, `date`) ' +
            'VALUES (NULL, ?, ?, "2000", "1493319189")',
            [gta, pc]
        );
    })
    //gta - ps4
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games_releases` (`id`, `id_game`, `id_platform`, `price`, `date`) ' +
            'VALUES (NULL, ?, ?, "2500", "1493319189")',
            [gta, ps4]
        );
    })
    //bioshock - pc
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games_releases` (`id`, `id_game`, `id_platform`, `price`, `date`) ' +
            'VALUES (NULL, ?, ?, "1500", NULL)',
            [bioshock, pc]
        );
    })
    //bioshock - ps4
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games_releases` (`id`, `id_game`, `id_platform`, `price`, `date`) ' +
            'VALUES (NULL, ?, ?, "2000", "1493319189")',
            [bioshock, ps4]
        );
    })
    //lastofus - ps4
    .then(() => {
        return Query(
            db,
            'INSERT INTO `games_releases` (`id`, `id_game`, `id_platform`, `price`, `date`) ' +
            'VALUES (NULL, ?, ?, "2500", "1493319189")',
            [lastofus, ps4]
        );
    })

    //user_libraries
    //user1 - pc
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries` (`id`, `id_user`, `id_platform`) ' +
            'VALUES (NULL, ?, ?)',
            [user1, pc]
        );
    })
    .then(result => {
        user1_pc = result.result.insertId;
    })
    //user2 - pc
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries` (`id`, `id_user`, `id_platform`) ' +
            'VALUES (NULL, ?, ?)',
            [user2, pc]
        );
    })
    .then(result => {
        user2_pc = result.result.insertId;
    })
    //user2 - ps4
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries` (`id`, `id_user`, `id_platform`) ' +
            'VALUES (NULL, ?, ?)',
            [user2, ps4]
        );
    })
    .then(result => {
        user2_ps4 = result.result.insertId;
    })

    //user_libraries_games
    //user1_pc - gta
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries_games` (`id`, `id_user_library`, `id_game`) ' +
            'VALUES (NULL, ?, ?);',
            [user1_pc, gta]
        );
    })
    //user1_pc - bioshock
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries_games` (`id`, `id_user_library`, `id_game`) ' +
            'VALUES (NULL, ?, ?);',
            [user1_pc, bioshock]
        );
    })
    //user2_pc - bioshock
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries_games` (`id`, `id_user_library`, `id_game`) ' +
            'VALUES (NULL, ?, ?);',
            [user2_pc, bioshock]
        );
    })
    //user2_ps4 - lastofus
    .then(() => {
        return Query(
            db,
            'INSERT INTO `user_libraries_games` (`id`, `id_user_library`, `id_game`) ' +
            'VALUES (NULL, ?, ?);',
            [user2_ps4, lastofus]
        );
    })

    .then(() => {
        res.send({success: true});
    })
    .catch(error => {
        res.status(500).send({error});
    });
};