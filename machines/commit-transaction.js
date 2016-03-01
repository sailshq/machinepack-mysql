module.exports = {


  friendlyName: 'Commit transaction',


  description: 'Commit the database transaction on the provided connection.',


  extendedDescription: 'The provided connection must already have a transaction begun on it.',


  moreInfoUrl: 'http://dev.mysql.com/doc/refman/5.7/en/commit.html',


  inputs: {

    connection:
      require('../constants/connection.input'),

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The transaction was successfully committed.',
      extendedDescription: 'Subsequent queries on this connection will no longer be transactional unless a new transaction is begun.',
      outputVariableName: 'report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        meta: '==='
      }
    },

    badConnection:
      require('../constants/badConnection.exit')

  },


  fn: function (inputs, exits) {
    var Pack = require('../');

    // Since we're using `sendNativeQuery()` to access the underlying connection,
    // we have confidence it will be validated before being used.
    Pack.sendNativeQuery({
      connection: inputs.connection,
      query: {
        query: 'COMMIT',
        bindings: []
      }
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      badConnection: function badConnection(report){
        return exits.badConnection(report);
      },
      success: function success() {
        return exits.success();
      }
    });
  }


};
