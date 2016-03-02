// # SYNTAX NOTES

////////////////////////////////////////////////////////////////////////////////////////////////




// Normal usage.
User.create({
  password: Passwords.encrypt({ password: req.param('password') }).execSync()
}).exec(function (err) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});


// Get db connection from machinepack
require('machinepack-mysql').getConnection({
  connectionString: 'mysql://foo:bar@foobar.com:3306/my_db'
}).exec(function (err, report) {
 if (err) {  }
  //...report.connection
});



// Custom metadata from userland to the adapter
User.create({
  password: Passwords.encrypt({ password: req.param('password') }).execSync()
}).meta({
  useTheCrazyAdapterSauceThisTime: true,
}).exec(function (err) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});



// Get raw access to driver from a particular model
// (in this example, we then use that to obtain a db connection, run a native query, and release the db connection)
User.driver.getConnection({
  connectionString: 'mysql://foo:bar@foobar.com:3306/my_db',
  meta: {
    encoding: '...asdadsg'
  }
}).exec(function (err, report) {
  if (err) { return res.serverError(err); }
  User.driver.sendNativeQuery({
    connection: report.connection,
    query: 'SELECT * FROM foo;'
  }).exec(function (_err, _report) {
    User.driver.releaseConnection({
      connection: report.connection
    }).exec(function (__err, __report) {
      if (__err) { return res.serverError(__err); }
      if (_err) { return res.serverError(_err); }
      return res.ok();
    });
  });
});


//


// ====================================================================================================






////////////////////////////////////////////////////////////////////////////////////////
// NEW MYSQL STUFF
// (a driver-level concept of "manager" would allow us to avoid dealing with various
//  different pooling implementations across different dbs)


// This is unchanged.  Note that there is currently no standardized way to force a
// connection to be destroyed rather than released. Individual drivers may implement
// this if they so choose using the `meta` input. For example, to forcibly kill a particular
// pool or PoolCluster, call `destroyManager()`.   For further customizability, fork this driver.
MySQL.releaseConnection({
  connection: connection,
  meta: {}
}).exec(/*...*/);



// This is new:  A manager is like a “spawner” for database connections.
//
// It is necessary because state needs to be managed outside of the context of
// one particular connection (e.g. pool or cluster pool, or custom cluster/sharding setup)
MySQL.createManager({
  connectionString: 'mysql://...',
  meta: {
    // << this is where all sorts of stuff relating to
    // connection configuration might be passed in (user/pass/host).
    // There could be >1 connection strings if this is a cluster deployment
    // with replicas and such-- that's up to the driver to implement.
  }
}).exec(/*...*/);


// `getConnection()` changes:
// The use case is the same:  like before, this machine is designed to be called
// when the waterline ORM or application code needs a db connection.
// But now instead of `connectionString`, `getConnection()` expects a `manager`.
MySQL.getConnection({
  manager: manager,
  meta: {} // << not expected to contain database host/port/etc— that’s what `createManager()` is for (see below)
}).exec(/*...*/);

// Note that there is currently no standardized way to force a new connection
// to be opened.  Individual drivers may implement this if they so choose using
// the `meta` input to `createManager()` (if no pool already exists) or maybe even
// `getConnection()` (if the new connection is expected to come from the datastore
// configured in an existing manager)  To build additional pools, you can create more
// managers by calling `createManager()`.  For further customizability, fork this driver.


// `destroyManager()` is also new.  This exists because some packages (looking at you `mysql`)
// need to have special logic called in order to make the process exit gracefully.
// This is for use in the adapter's teardown method.
MySQL.destroyManager({
  manager: manager,
  meta: {}
}).exec(/*...*/);







// ========================================================================
// INTRODUCING MACHINEPACK-WATERLINE:

// Remember, to get a manager instance:
// MySQL.createManager(...).exec(...) => manager



var Waterline = require('machinepack-waterline');
var MySQL = require('machinepack-mysql');


// Waterline.connect()
Waterline.connect({

  during: function (db, done) {
    // db.connection;
    // db.meta;

    // Connection can be passed in to ORM methods via
    // the chainable `.usingConnection()` method.
    // See below for examples.
    //
    // (Note that this effectively allows model definitions
    //  to be used with different databases on the fly at
    //  runtime-- a nice, albeit unexpected benefit.  However,
    //  it wouldn't work until we figured out the right way to
    //  strip the state out of the current WL adapters.)
    return done();
  },

  // `meta` is passed through as the `meta` input to `getConnection()`
  // and to `releaseConnection()`.
  meta: {},


  // `manager` is optional (sometimes). When this is called from WL core,
  // `manager` is passed in if you provide `.usingManager(...)` when building
  // your query as a deferred object.
  //
  // If `manager` is omitted, a new manager will be created
  // using `createManager()` and destroyed with `destroyManager()`
  // when this operation completes (whether it is successful or not).
  manager: someManager,
  //
  // (note that if `manager` is not provided, then both `createManager` AND
  // `destroyManager()` below are required.  And if either of those functions
  //  is not provided, then `manager` is required.)

  // Either the identity of the datastore to use
  datastore: 'larrysDbCluster',
  //-AND/OR-
  //
  // Any of these things:
  // (if `datastore` is provided, these are optional. If any of
  //  them are ALSO provided, then they are used as overrides)
  createManager: MySQL.createManager,
  getConnection: MySQL.getConnection,
  releaseConnection: MySQL.releaseConnection,
  destroyManager: MySQL.destroyManager

}).exec(/*...*/);




// Waterline.transaction()
Waterline.transaction({
  during: function (T, done) {
    // T.connection;
    // T.meta;

    // Connection can be passed in to ORM methods via
    // the chainable `.usingConnection()` method.
    // See below for examples.
    //
    // (Note that this effectively allows model definitions
    //  to be used with different databases on the fly at
    //  runtime-- a nice, albeit unexpected benefit.  However,
    //  it wouldn't work until we figured out the right way to
    //  strip the state out of the current WL adapters.)
    return done();
  },

  // `meta` is passed through as the `meta` argin to each of
  // the custom functions below.
  // (e.g. `getConnection()`, `releaseConnection()`, etc.)
  meta: {},

  // `connection` is optional-- e.g. in WL core, it is passed in if
  // you provide `.usingConnection(...)` when building your query
  // as a deferred object.
  //
  // If `connection` is omitted, a new connection will be acquired
  // from the manager using `getConnection()`.
  connection: someConnection,
  //
  // (note that `getConnection` and `releaseConnection` below are always
  // required, even if `connection` is provided.  This is just for predictability.)

  // (note that if `connection` is not provided, then both `getConnection` AND
  // `releaseConnection()` below are required.  And if either of those functions
  //  is not provided, then `connection` is required.)


  // `manager` is optional (sometimes). When this is called from n WL core,
  // `manager` is passed in if you provide `.usingManager(...)` when building
  // your query as a deferred object. If `connection` was explicitly provided,
  // then `manager` is completely ignored.
  //
  // If `manager` is omitted, a new manager will be created
  // using `createManager()` and destroyed with `destroyManager()`
  // when this operation completes (whether it is successful or not).
  manager: someManager,
  //
  // (note that if `connection` is provided, then `manager` and the two related
  //  functions are completely ignored.  On the other hand, if connection is NOT
  //  provided, then `manager`, `createManager` and/or `destroyManager` are used.
  //
  //  If `manager` is not provided, then both `createManager` AND
  // `destroyManager()` below are required.  And if either of those functions
  //  is not provided, then `manager` is required.)


  // Either the identity of the datastore to use
  datastore: 'larrysDbCluster',
  //-AND/OR-
  //
  // Any of these things:
  // (if `datastore` is provided, these are optional. If any of
  //  them are ALSO provided, then they are used as overrides)
  createManager: MySQL.createManager,
  getConnection: MySQL.getConnection,
  beginTransaction: MySQL.beginTransaction,
  rollbackTransaction: MySQL.rollbackTransaction,
  commitTransaction: MySQL.commitTransaction,
  releaseConnection: MySQL.releaseConnection,
  destroyManager: MySQL.destroyManager

}).exec(/*...*/);





// Waterline.query()
Waterline.query({

  // This is a radar query statement to run
  statement: {
    select: ['*'],
    from: 'dogfood_brands'
  },

  // `meta` is passed through as the `meta` argin to each of
  // the six custom driver functions:
  // (`getConnection()`, `sendNativeQuery()`, etc.)
  meta: {},

  // `connection` is optional-- e.g. in WL core, it is passed in if
  // you provide `.usingConnection(...)` when building your query
  // as a deferred object.
  //
  // If `connection` is omitted, a new connection will be acquired
  // from the manager using `getConnection()`.
  connection: someConnection,
  //
  // (note that `getConnection` and `releaseConnection` below are always
  // required, even if `connection` is provided.  This is just for predictability.)

  // (note that if `connection` is not provided, then both `getConnection` AND
  // `releaseConnection()` below are required.  And if either of those functions
  //  is not provided, then `connection` is required.)


  // `manager` is optional (sometimes). When this is called from n WL core,
  // `manager` is passed in if you provide `.usingManager(...)` when building
  // your query as a deferred object. If `connection` was explicitly provided,
  // then `manager` is completely ignored.
  //
  // If `manager` is omitted, a new manager will be created
  // using `createManager()` and destroyed with `destroyManager()`
  // when this operation completes (whether it is successful or not).
  manager: someManager,
  //
  // (note that if `connection` is provided, then `manager` and the two related
  //  functions are completely ignored.  On the other hand, if connection is NOT
  //  provided, then `manager`, `createManager` and/or `destroyManager` are used.
  //
  //  If `manager` is not provided, then both `createManager` AND
  // `destroyManager()` below are required.  And if either of those functions
  //  is not provided, then `manager` is required.)


  // Either the identity of the datastore to use
  datastore: 'larrysDbCluster',
  //-AND/OR-
  //
  // Any of these things:
  // (if `datastore` is provided, these are optional. If any of
  //  them are ALSO provided, then they are used as overrides)
  createManager: MySQL.createManager,
  getConnection: MySQL.getConnection,
  compileStatement: MySQL.compileStatement,
  sendNativeQuery: MySQL.sendNativeQuery,
  parseNativeQueryError: MySQL.parseNativeQueryError,
  parseNativeQueryResult: MySQL.parseNativeQueryResult,
  releaseConnection: MySQL.releaseConnection,
  destroyManager: MySQL.destroyManager,

}).exec(/*...*/);









////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE:
// LOW-LEVEL USAGE OF TRANSACTIONS IN USERLAND CODE VIA MACHINEPACK


var MySQL = require('machinepack-mysql');
var Waterline = require('machinepack-waterline');

MySQL.createManager({
  connectionString: 'mysql://...',
  meta: {
    // ...
  }
}).exec(function (err, report){
  if (err) { /* ... */ }

  var larrysDbClusterMgr = report.manager;


  Waterline.transaction({

    manager: larrysDbClusterMgr,
    getConnection: MySQL.getConnection,
    beginTransaction: MySQL.beginTransaction,
    rollbackTransaction: MySQL.rollbackTransaction,
    commitTransaction: MySQL.commitTransaction,
    releaseConnection: MySQL.releaseConnection,

    during: function (T, done) {

      // First check that the location exists.
      Location.findOne({id: locationId})
      .usingConnection(T.connection)
      .exec(function (err, location) {
        if (err) {return done(err);}
        if (!location) {return done.notFound();}

        // Get all products at the location
        ProductOffering.find({location: locationId})
        .populate('productType')
        .usingConnection(T.connection)
        .exec(function(err, productOfferings) {
          if (err) {return done(err);}
          var mush = _.indexBy(productOfferings, 'id');
          return done(undefined, mush);
        });
      });
    }

  }).exec(/* ... */);
});








////////////////////////////////////////////////////////////////////////////////////////
// NOW MORE OR LESS THE SAME THING, BUT IN A SAILS APP:


// Fetches a preconfigured deferred object hooked up to the sails-mysql adapter
// (and consequently the appropriate driver)
sails.datastore('larrysDbCluster')
// Provided custom metadata is sent through (as a direct reference; i.e. no cloning)
// to ALL driver methods called as a result of the built-in transaction logic.
.meta({})
// If `overrides` is specified, the functions and/or manager will be used instead
// of the built-in implementation (e.g. `rollbackTransaction: function (inputs, exits) { /* ... */ }`)
.overrides({})
// This function will be run when the transaction begins.  If it breaks,
// the transaction will be rolled back automatically.
.transaction(function during (T, done) {

  // First check that the location exists.
  Location.findOne({id: locationId})
  .usingConnection(T.connection)
  .exec(function (err, location) {
    if (err) {return done(err);}
    if (!location) {return done.notFound();}

    // Get all products at the location
    ProductOffering.find({location: locationId})
    .populate('productType')
    .usingConnection(T.connection)
    .exec(function(err, productOfferings) {
      if (err) {return done(err);}
      var mush = _.indexBy(productOfferings, 'id');
      return done(undefined, mush);
    });
  });
})
// Note that I could have also used `.usingConnection()` and `.usingManager()`
// here if I needed to:
// .getManager(manager)
// .getConnection(someExistingConnection)

// Finally, when finished setting up, we call `.exec()`
.exec(function afterwards(err, mush) {
  if (err) {
    // Transaction failed to start, or failed and had to be rolled back.
    // ...
    return res.serverError(err);
  }

  // Otherwise, transaction was successfully committed!
  // (note that whatever was sent in as the 2nd argument from `during`
  //  is passed straight through as the 2nd arg here-- no cloning.)
  return res.json(mush);
});











////////////////////////////////////////////////////////////////////////////////////////
// NOW ONCE MORE, BUT BACK TO PURE MACHINE USAGE
// (taking advantage of the cleanest, simplest usage)

var Waterline = require('machinepack-waterline');
Waterline.transaction({
  datastore: 'larrysDbCluster',
  during: function (T, done) {

    // First check that the location exists.
    Location.findOne({id: locationId})
    .usingConnection(T.connection)
    .exec(function (err, location) {
      if (err) {return done(err);}
      if (!location) {return done.notFound();}

      // Get all products at the location
      ProductOffering.find({location: locationId})
      .populate('productType')
      .usingConnection(T.connection)
      .exec(function(err, productOfferings) {
        if (err) {return done(err);}
        var mush = _.indexBy(productOfferings, 'id');
        return done(undefined, mush);
      });
    });
  }

}).exec(/*...*/);




////////////////////////////////////////////////////////////////////////////////////////////////
// Note that for the above to work, process-global memory would need to be used.
// This is ok as long as we are very careful, and we namespace not just under pkg name,
// but also under version string.  For example, the global might be a dictionary of
// all available datastores; using identities like `larrysDbCluster` as keys, and
// storing the datastore config (i.e. the "connection" config of yore), as well
// as the adapter and/or driver definitions, as values.
//
// Alternately, this dictionary could be passed in (by reference) as another input.
// (effectively what happens in Sails/Waterline core as well).
//
// We should go with one approach or the other; definitely not both.
////////////////////////////////////////////////////////////////////////////////////////////////


