module.exports = {
    development: {
      client: 'sqlite3',
      connection: {
        filename: './data/jobboard.db'
      },
      useNullAsDefault: true // 👈 this line is important!
    }
  };
  