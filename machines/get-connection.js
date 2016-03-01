module.exports = {


  friendlyName: 'Get connection',


  description: 'Get an active connection to a MySQL database from the pool.',


  inputs: {

    connectionString: {
      description: 'A connection string to use to connect to a MySQL database.',
      extendedDescription: 'Be sure to include credentials and the name of an existing database on your MySQL server.',
      moreInfoUrl: 'https://gist.github.com/mikermcneil/46d10fd816c980cd3d9f',
      whereToGet: {
        url: 'https://gist.github.com/mikermcneil/46d10fd816c980cd3d9f'
      },
      example: 'mysql://mikermcneil:p4ssw042D@localhost:3306/some_db',
      required: true
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional MySQL-specific options to use when connecting.',
      extendedDescription: 'If specified, should be a dictionary. If there is a conflict between something provided in the connection string, and something in `meta`, the connection string takes priority.',
      moreInfoUrl: 'https://gist.github.com/mikermcneil/46d10fd816c980cd3d9f',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'A connection was successfully acquired.',
      extendedDescription: 'This connection should be eventually released.  Otherwise, it may time out.  It is not a good idea to rely on database connections timing out-- be sure to release this connection when finished with it!',
      outputVariableName: 'report',
      outputDescription: 'The `connection` property is an active connection to the database.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        connection: '===',
        meta: '==='
      }
    },

    malformed: {
      description: 'The provided connection string is malformed.',
      extendedDescription: 'The provided connection string is not valid for MySQL.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that (and preferably "why") the provided connection string is invalid.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    },

    failedToConnect: {
      description: 'Could not acquire a connection to the database using the specified connection string.',
      extendedDescription: 'This might mean any of the following:\n'+
      ' + the credentials encoded in the connection string are incorrect\n'+
      ' + there is no database server running at the provided host (i.e. even if it is just that the database process needs to be started)\n'+
      ' + there is no software "database" with the specified name running on the server\n'+
      ' + the provided connection string does not have necessary access rights for the specified software "database"\n'+
      ' + this Node.js process could not connect to the database, perhaps because of firewall/proxy settings\n'+
      ' + any other miscellaneous connection error',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that a connection could not be made.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    var util = require('util');
    var Url = require('url');
    var felix = require('mysql');


    // Build a local variable (`_mysqlClientConfig`) to house a dictionary
    // of additional MySQL connection options that will be passed into `.connect()`.
    // (this is pulled from the `connectionString` and `meta` inputs, and used for
    //  configuring stuff like `host` and `password`)
    //
    // For a complete list of available options, see:
    //  • https://github.com/felixge/node-mysql#connection-options
    //
    // However, note that these options are whitelisted below.
    var _mysqlClientConfig = {};



    // Validate and parse `meta` (if specified).
    if ( inputs.meta ) {
      if ( !util.isObject(inputs.meta) ) {
        return exits.error('If provided, `meta` must be a dictionary.');
      }

      // Use properties of `meta` directly as MySQL client config.
      // (note that we're very careful to only stick a property on the client config if it was not undefined)
      [
        // Basic:
        'host', 'port', 'database', 'user', 'password',
        'charset', 'timezone', 'ssl',

        // Advanced:
        'connectTimeout', 'stringifyObjects', 'insecureAuth', 'typeCast',
        'queryFormat', 'supportBigNumbers', 'bigNumberStrings', 'dateStrings',
        'debug', 'trace', 'multipleStatements', 'flags',
      ].forEach(function (mysqlClientConfKeyName){
        if ( !util.isUndefined(inputs.meta[mysqlClientConfKeyName]) ) {
          _mysqlClientConfig[mysqlClientConfKeyName] = inputs.meta[mysqlClientConfKeyName];
        }
      });
    }


    // Validate & parse connection string, pulling out MySQL client config
    // (call `malformed` if invalid).
    //
    // Remember: connection string takes priority over `meta` in the event of a conflict.
    try {
      var parsedConnectionStr = Url.parse(inputs.connectionString);

      // Validate that a protocol was found before other pieces
      // (otherwise other parsed info will be very weird and wrong)
      if ( !parsedConnectionStr.protocol ) {
        throw new Error('Protocol (i.e. `mysql://`) is required in connection string.');
      }

      // Parse port & host
      var DEFAULT_HOST = 'localhost';
      var DEFAULT_PORT = 3306;
      if (parsedConnectionStr.port) { _mysqlClientConfig.port = +parsedConnectionStr.port; }
      else { _mysqlClientConfig.port = DEFAULT_PORT; }
      if (parsedConnectionStr.hostname) { _mysqlClientConfig.host = parsedConnectionStr.hostname; }
      else { _mysqlClientConfig.host = DEFAULT_HOST; }

      // Parse user & password
      if ( parsedConnectionStr.auth && util.isString(parsedConnectionStr.auth) ) {
        var authPieces = parsedConnectionStr.auth.split(/:/);
        if (authPieces[0]) {
          _mysqlClientConfig.user = authPieces[0];
        }
        if (authPieces[1]) {
          _mysqlClientConfig.password = authPieces[1];
        }
      }

      // Parse database name
      if (util.isString(parsedConnectionStr.pathname) ) {
        var _databaseName = parsedConnectionStr.pathname;
        // Trim leading and trailing slashes
        _databaseName = _databaseName.replace(/^\/+/, '');
        _databaseName = _databaseName.replace(/\/+$/, '');
        // If anything is left, use it as the database name.
        if ( _databaseName ) {
          _mysqlClientConfig.database = _databaseName;
        }
      }
    }
    catch (_e) {
      _e.message = util.format('Provided value (`%s`) is not a valid MySQL connection string.',inputs.connectionString) + ' Error details: '+ _e.message;
      return exits.malformed({
        error: _e
      });
    }


    var _connection = felix.createConnection(_mysqlClientConfig);
    _connection.connect(function afterConnected(_err) {
      if (_err) {
        return exits.failedToConnect({
          error: _err
        });
      }

      // Now pass back the connection so it can be provided
      // to other methods in this driver.
      return exits.success({
        connection: _connection
      });
    });//</_connection.connect()>
  }


};
