module.exports = {


  friendlyName: 'Commit transaction',


  description: 'Commit the database transaction on the provided connection.',


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
    var util = require('util');
    var Pack = require('../');

    // Validate provided connection.
    if ( !util.isObject(inputs.connection) || !util.isFunction(inputs.connection.release) || !util.isObject(inputs.connection.client) ) {
      return exits.badConnection();
    }

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
      success: function success() {
        return exits.success();
      }
    });
  }


};
