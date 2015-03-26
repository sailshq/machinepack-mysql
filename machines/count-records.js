module.exports = {


  friendlyName: 'Count records',


  description: 'Count records in the MySQL table that match the specified criteria.',


  extendedDescription: '',


  inputs: {

    connectionUrl: {
      description: 'The MySql connection URL',
      defaultsTo: 'mysql://foo:bar@localhost:3306/machinepack_mysql',
      example: 'mysql://foo:bar@localhost:3306/machinepack_mysql',
      required: true
    },

    table: {
      description: 'The name of the table.',
      example: 'direwolves',
      required: true
    },

    query: {
      description: 'The selection criteria (like the WHERE clause)',
      extendedDescription: 'Standard query selectors from the MySql method.',
      typeclass: 'dictionary'
    }

  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'Unexpected error occurred.',
    },

    couldNotConnect: {
      description: 'Could not connect to Postgresql server at specified `connectionUrl`.',
      extendedDescription: 'Make sure the credentials are correct and that the server is running.'
    },

    invalidCollection: {
      description: 'Provided `table` input is not a valid name for a Postgresql table.',
    },

    success: {
      description: 'Returns the count of records matching criteria.',
      example: 123
    }

  },


  fn: function (inputs,exits) {

    // Dependencies
    var mysql = require('mysql');
    var wlSQL = require('waterline-sequel');

    // Rename inputs for clarity
    var table = inputs.table;
    var schema = inputs.schema;
    var query = {
      where: inputs.query || null
    };

    // WL SQL options
    var sqlOptions = {
      parameterized: false,
      caseSensitive: false,
      escapeCharacter: '`',
      casting: false,
      canReturnValues: false,
      escapeInserts: true
    };

    var normalizedSchema = {};
    normalizedSchema[table] = {
      tableName: table,
      identity: table,
      attributes: {}
    };

    // Build the SQL query based on the query inputs
    var sequel = new wlSQL(normalizedSchema, sqlOptions);
    var sql;

    // Build a query for the specific query strategy
    try {
      sql = sequel.count(table, query);
    } catch (e) {
      return exits.error(e);
    }

    var connection = mysql.createConnection(inputs.connectionUrl);
    connection.connect(function(err) {

      if(err) {
        return exits.error(err);
      }

      connection.query(sql.query[0], function(err, results) {

        // Close the connection
        connection.end();

        if(err) {
          return exits.error(err);
        }

        var count = results[0] && results[0]['COUNT(*)'];
        return exits.success(count);
      });
    });
  },



};
