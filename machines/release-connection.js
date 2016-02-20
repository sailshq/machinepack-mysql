module.exports = {


  friendlyName: 'Release connection',


  description: 'Release an active MySQL database connection back to the pool.',


  inputs: {

    connection:
      require('../constants/connection.input'),

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The connection was released and is no longer active.',
      extendedDescription: 'The provided connection may no longer be used for any subsequent queries.',
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

    // Validate provided connection.
    if ( !util.isObject(inputs.connection) || !util.isFunction(inputs.connection.release) || !util.isObject(inputs.connection.client) ) {
      return exits.badConnection();
    }

    // Release connection.
    try {
      inputs.connection.release();
    }
    catch (e) {
      return exits.error(e);
    }

    return exits.success();
  }


};
