module.exports = {


  friendlyName: 'Send native query',


  description: 'Send a native query to the MySQL database.',


  inputs: {

    connection:
      require('../constants/connection.input'),

    nativeQuery: {
      description: 'A SQL statement as a string (or to use built-in escaping, this should be provided as a dictionary).',
      extendedDescription: 'If provided as a dictionary, this should contain `sql` (the SQL statement string; e.g. \'SELECT * FROM dogs WHERE name = ?\') as well as an array of `bindings` (e.g. [\'David\']).',
      moreInfoUrl: 'https://github.com/felixge/node-mysql#performing-queries',
      whereToGet: {
        description: 'This is oftentimes compiled from Waterline query syntax using "Compile statement", however it could also originate from userland code.',
      },
      example: '*',
      required: true
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The native query was executed successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the result data the database sent back.  The `meta` property is reserved for custom driver-specific extensions.',
      moreInfoUrl: 'https://github.com/felixge/node-mysql#getting-the-id-of-an-inserted-row',
      example: {
        result: '*',
        meta: '==='
      }
    },

    badConnection:
      require('../constants/badConnection.exit')

  },


  fn: function (inputs, exits) {
    var util = require('util');
    var validateConnection = require('../helpers/validate-connection');

    // Validate provided connection.
    if ( !validateConnection({ connection: inputs.connection }).execSync() ) {
      return exits.badConnection();
    }


    // Validate query
    // (supports raw SQL string or dictionary consisting of `sql` and `bindings` properties)
    var sql;
    var bindings;
    if ( util.isString(inputs.nativeQuery) ) {
      sql = inputs.nativeQuery;
      bindings = [];
    }
    else if ( util.isObject(inputs.nativeQuery) && util.isString(inputs.nativeQuery.sql) && util.isArray(inputs.nativeQuery.bindings) ) {
      sql = inputs.nativeQuery.sql;
      bindings = inputs.nativeQuery.bindings;
    }
    else {
      return exits.error(new Error('Provided `nativeQuery` is invalid.  Please specify either a string of raw SQL or a dictionary like `{sql: \'SELECT * FROM dogs WHERE name = $1\', bindings: [\'Rover\']}`.'));
    }


    // Send native query to the database using node-mysql.
    inputs.connection.query({
      sql: sql,
      values: bindings
    }, function () {
      // The exact format of the arguments for this callback are not part of
      // the officially documented behavior of node-mysql (at least not as
      // of March 2016 when this comment is being written).
      //
      // If you need to trace this down to the implementation, you might try
      // checking out the following links in order (from top to bottom):
      //  • https://github.com/felixge/node-mysql#performing-queries
      //  • https://github.com/felixge/node-mysql/blob/f5bd13d8c54ce524a6bff48bfceb15fdca3a938a/lib/protocol/ResultSet.js
      //  • https://github.com/felixge/node-mysql/blob/d4a5fd7b5e92a1e09bf3c85d24265eada8a84ad8/lib/protocol/sequences/Sequence.js#L96
      //  • https://github.com/felixge/node-mysql/blob/1720920f7afc660d37430c35c7128b20f77735e3/lib/protocol/sequences/Query.js#L94
      //  • https://github.com/felixge/node-mysql/blob/1720920f7afc660d37430c35c7128b20f77735e3/lib/protocol/sequences/Query.js#L144


      // If the first argument is truthy, then treat it as an error.
      // (i.e. bail via the `error` exit)
      if (arguments[0]) {
        return exits.error( arguments[0] );
      }


      // CREATE TABLE query:
      // { result:
      //  { rows:
      //     { fieldCount: 0,
      //       affectedRows: 0,
      //       insertId: 0,
      //       serverStatus: 2,
      //       warningCount: 0,
      //       message: '',
      //       protocol41: true,
      //       changedRows: 0 } },
      // meta: { rawArguments: { '0': null, '1': [Object], '2': undefined } } }


      // SELECT query:
      // { result: { rows: [], fields: [ [Object] ] },
      // meta: { rawArguments: { '0': null, '1': [], '2': [Object] } } }

      // Otherwise, we assume the query was successful and return.
      return exits.success({
        // Since the arguments passed to this callback and their data format
        // can vary across different types of queries, we do our best to normalize that
        // here.  However, in order to do so, we have to be somewhat opinionated;
        // d.g. even though these aren't always accurate labels, we send the second
        // argument through as the `rows` property, and the third argument as the
        // `fields` property.
        result: {
          rows: arguments[1],
          fields: arguments[2]
        },
        // For flexibility, an unadulterated reference to this callback's
        // arguments object is also exposed as `meta.rawArguments`.
        meta: {
          rawArguments: arguments
        }
      });
    });
  }


};
