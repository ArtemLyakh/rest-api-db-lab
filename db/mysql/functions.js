module.exports.GetConnection = pool => {
    return new Promise((resolve, reject) => {
        pool.getConnection((error, connection) => {
            if (error) reject(error);
            else resolve(connection);
        });
    });
};

module.exports.Query = (connection, sql, options) => {
    return new Promise((resolve, reject) => {
        if (typeof(options) === 'undefined') {
            connection.query(sql, (error, result, fields) => {
                if (error) reject(error);
                else resolve({result, fields});
            });           
        } else {
            connection.query(sql, options, (error, result, fields) => {
                if (error) reject(error);
                else resolve({result, fields});
            });
        }
    })
};