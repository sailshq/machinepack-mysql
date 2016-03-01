module.exports = {


  friendlyName: 'Parse native query error',


  description: 'Attempt to identify and parse a raw error from sending a native query and normalize it to a standard error footprint.',


  cacheable: true,


  sync: true,


  inputs: {

    queryType: {
      description: 'The type of query operation this raw error came from.',
      extendedDescription: 'Either "select", "insert", "delete", or "update".  This determines how the provided raw error will be parsed/coerced.',
      required: true,
      example: 'select',// (select|insert|delete|update)
    },

    nativeQueryError: {
      description: 'The error sent back from the database as a result of a native query.',
      extendedDescription: 'This is referring to e.g. the output (`err`) returned through the `error` exit of `sendNativeQuery()` in this driver.',
      required: true,
      example: '==='
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The normalization is complete.  If the error cannot be normalized into any other more specific footprint, then the catchall footprint will be returned.',
      outputVariableName: 'report',
      outputDescription: 'The `footprint` property is the normalized "footprint" representing the provided raw error.  Conforms to one of a handful of standardized footprint types expected by the Waterline driver interface.   The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        footprint: {},
        meta: '==='
      }
    },

  },


  fn: function (inputs, exits) {
    var util = require('util');

    // Local variable (`err`) for convenience.
    var err = inputs.nativeQueryError;

    // `footprint` is what will be returned by this machine.
    var footprint = { identity: 'catchall' };

    // If the incoming native query error is not an object, or it is
    // missing a `code` property, then we'll go ahead and bail out w/
    // the "catchall" footprint to avoid continually doing these basic
    // checks in the more detailed error negotiation below.
    if ( !util.isObject(err) || !err.code) {
      return exits.success({
        footprint: footprint
      });
    }

    // Otherwise, continue inspecting the native query error in more detail:
    switch (inputs.queryType){
      case 'select':
        break;

      case 'insert':
      case 'update':
        // Negotiate `notUnique` error footprint.
        // (See also: https://github.com/balderdashy/sails-mysql/blob/2c414f1191c3595df2cea8e40259811eb3ca05f9/lib/adapter.js#L1223)
        // ====================================================================
        if (err.code === '23505') {
          footprint.identity = 'notUnique';
          // Now manually extract the relevant bits of the error message
          // to build our footprint's `columns` property:
          footprint.columns = [];
          if ( util.isString(err.detail) ) {
            var matches = err.detail.match(/Key \((.*)\)=\((.*)\) already exists\.$/);
            footprint.columns.push(matches[1]);
          }
        }
        break;

      case 'delete':
        break;

      default:
    }//</switch>

    return exits.success({
      footprint: footprint
    });
  }


};
