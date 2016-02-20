module.exports = {


  friendlyName: 'Compile statement',


  description: 'Compile a Waterline statement to a native query for MySQL.',


  cacheable: true,


  sync: true,


  inputs: {

    statement: {
      description: 'A Waterline statement.',
      extendedDescription: 'See documentation for more information.  Note that `opts` may be used for expressing driver-specific customizations as a sibling to `from`, `where`, `select`, etc.  In other words, recursively deep within a Waterline query statement.  This is distinct from `meta`, which contains driver-specific customizations about the statement as a whole.',
      moreInfoUrl: 'https://github.com/particlebanana/waterline-query-builder/blob/master/docs/syntax.md',
      example: {},
      required: true
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The provided Waterline statement was compiled successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `nativeQuery` property is the compiled native query for the database.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        nativeQuery: '*',
        meta: '==='
      }
    },

    malformed: {
      description: 'The provided Waterline statement could not be compiled due to malformed syntax.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript error instance explaining that (or preferably even _why_) the Waterline syntax is not valid.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    },

    notSupported: {
      description: 'The provided Waterline statement could not be compiled because it is not supported by this MySQL driver.',
      extendedDescription: 'If even one clause of the Waterline statement is not supported by the MySQL driver, the compilation of the entire statement _always fails_.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript error instance explaining that (or preferably even _why_) the Waterline statement is not supported.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    var SQLBuilder = require('machinepack-sql-builder');

    SQLBuilder.generateSql({
      dialect: 'mysql',
      query: inputs.statement
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      malformed: function malformed(err) {
        return exits.malformed({
          error: err
        });
      },
      notSupported: function notSupported(err){
        return exits.notSupported({
          error: err
        });
      },
      success: function success(compiledNativeQuery) {
        return exits.success({
          nativeQuery: compiledNativeQuery
        });
      }
    });//</generateQuery>
  }


};
