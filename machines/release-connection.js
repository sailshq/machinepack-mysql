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
    var validateConnection = require('../helpers/validate-connection');

    // Validate provided connection.
    if ( !validateConnection({ connection: inputs.connection }).execSync() ) {
      return exits.badConnection();
    }


    // Release connection.
    try {
      inputs.connection.release();
    }
    catch (_releaseErr) {
      // If the connection cannot be released back to the pool gracefully,
      // try to force it to disconnect.
      try {
        inputs.connection.destroy();
      }
      // If even THAT fails, exit via `error`.
      catch (_destroyErr) {
        return exits.error(new Error('Could not release MySQL connection gracefully, and attempting to forcibly destroy the connection threw an error.  Details:\n=== === ===\n'+_destroyErr.stack+'\n\nAnd error details from the original graceful attempt:\n=== === ===\n'+_releaseErr.stack));
      }

      // Otherwise, forcing a disconnect worked:
      console.warn('Could not release MySQL connection gracefully, but connection was forcibly destroyed.  Details:\n=== === ===\n'+_releaseErr.stack);
      return exits.success();
    }

    // If we made it here, releasing the connection gracefully must have worked.
    return exits.success();

  }


};
