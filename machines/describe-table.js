module.exports = {


  friendlyName: 'Describe table',


  description: 'List all the columns that are found in a MySql table.',


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

    invalidTable: {
      description: 'Provided `table` input is not a valid name for a MySql table in the database.',
    },

    success: {
      description: 'Returns an array of columns.',
      example: [{
        fieldName: 'birthday',
        type: 'string', // number, string, boolean, dictionary, or array
        dbType: 'timezone with timestamp',
        indexed: true,
        unique: true,
        primaryKey: false,
        autoIncrement: false
      }]
    }

  },


  fn: function (inputs,exits) {

    // Dependencies
    var mysql = require('mysql');
    var async = require('async');

    var tableName = mysql.escapeId(inputs.table);
    var connection = mysql.createConnection(inputs.connectionUrl);

    async.auto({

      createConnection: function(next) {
        connection.connect(next);
      },

      // Run the describe table query
      describeTable: ['createConnection', function(next) {
        var query = 'DESCRIBE ' + tableName;
        connection.query(query, function (err, results) {
          if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
              return next('noTable');
            }
            return next(err);
          }

          // Loop through results and normalize some of the attributes
          results.forEach(function(attr) {

            // Set Unique Attribute
            if(attr.Key === 'UNI') {
              attr.unique = true;
            } else {
              attr.unique = false;
            }

            // Set Primary Key Attribute
            if(attr.Key === 'PRI') {
              attr.primaryKey = true;
              attr.unique = false;

              // If also an integer set auto increment attribute
              if(attr.Type === 'int(11)') {
                attr.autoIncrement = true;
              }
            } else {
              attr.primaryKey = false;
              attr.autoIncrement = false;
            }

            // Default to not indexed
            attr.indexed = false;

          });

          return next(null, results);
        });
      }],

      // Run the get indicies query
      getIndicies: ['describeTable', function(next, results) {

        var describe = results.describeTable;
        var query = 'SHOW INDEX FROM ' + tableName;

        connection.query(query, function (err, results) {
          if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
              return next('noTable');
            }
            return next(err);
          }

          // Loop Through Indexes and Add Properties
          results.forEach(function(result) {
            describe.forEach(function(attr) {
              if(attr.Field !== result.Column_name) return;
              attr.indexed = true;
            });
          });

          return next(null, describe);
        });
      }],

      // Normalize the query results into an array of columns
      normalizeResults: ['getIndicies', function(next, results) {

        var schema = results.getIndicies;
        var data = [];

        schema.forEach(function(field) {

          // Marshal mysql DESCRIBE
          var attrName = field.Field;
          var type = field.Type;

          // Remove (n) column-size indicators
          type = type.replace(/\([0-9]+\)$/,'');

          var obj = {
            fieldName: attrName,
            dbType: type,
            defaultsTo: field.Default,
            autoIncrement: field.Extra === 'auto_increment',
            primaryKey: field.primaryKey,
            unique: field.unique,
            indexed: field.indexed
          };

          // Set Type
          switch (type) {

            // Number types
            case 'bit':
            case 'tinyint':
            case 'smallint':
            case 'mediumint':
            case 'int':
            case 'integer':
            case 'bigint':
            case 'decimal':
            case 'float':
            case 'double':
            case 'double precision':
              obj.type = 'number';
              break;

            // String types
            case 'character':
            case 'char':
            case 'varchar':
            case 'text':
              obj.type = 'string';
              break;

            // Date types
            case 'date':
            case 'datetime':
            case 'timestamp':
            case 'time':
            case 'year':
              obj.type = 'string';
              break;

            // Boolean type
            case 'boolean':
            case 'bool':
              obj.type = 'boolean';
              break;

            // Everything else make a string
            default:
              obj.type = 'string';
              break;
          };

          data.push(obj);
        });

        return setImmediate(function() {
          next(null, data);
        });
      }]

    },

    function(err, results) {

      // Close the connection
      connection.end();

      if(err) {
        if(err === 'noTable') return exits.invalidTable();
        return exits.error(err);
      }

      return exits.success(results.normalizeResults);
    });

  }

};
