module.exports = {


  friendlyName: 'Begin transaction',


  description: 'Begin a new database transaction on the provided connection.',


  moreInfoUrl: 'http://dev.mysql.com/doc/refman/5.7/en/commit.html',


  inputs: {

    connection:
      require('../constants/connection.input'),

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The transaction was successfully started.',
      extendedDescription: 'Until it is committed, rolled back, or times out, subsequent queries run on this connection will be transactional.  They will not have any true effect on the database until the transaction is committed, and will not affect queries made on other connections.',
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
      query: 'START TRANSACTION'
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
