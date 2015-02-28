module.exports = {


  friendlyName: 'List tables',


  description: 'List the names of the tables in the specified MySql database.',


  extendedDescription: '',


  inputs: {

    connectionUrl: {
      description: 'The MySql connection URL',
      defaultsTo: 'mysql://foo:bar@localhost:3306/machinepack_mysql',
      example: 'mysql://foo:bar@localhost:3306/machinepack_mysql',
      required: true
    }

  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'Unexpected error occurred.',
    },

    couldNotConnect: {
      description: 'Could not connect to MySql server at specified `connectionUrl`.',
      extendedDescription: 'Make sure the credentials are correct and that the server is running.'
    },

    success: {
      description: 'Returns an array of table names.',
      example: [
        'direwolves'
      ]
    }

  },


  fn: function (inputs,exits) {

    // Dependencies
    var mysql = require('mysql');

    var connection = mysql.createConnection(inputs.connectionUrl);

    // Run query to get table names
    connection.query('show tables;', function(err, rows, fields) {

      connection.end();

      if(err) {
        return exits.error(err);
      }

      // Build an array of tablenames
      rows = rows || [];

      var names = rows.map(function(row) {
        return Object.keys(row).map(function(key){return row[key]})[0];
      });

      return exits.success(names);
    });

  }

};
