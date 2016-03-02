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


// ========================================================================
// INTRODUCING MACHINEPACK-WATERLINE:



var Waterline = require('machinepack-waterline');



// Waterline.connect()
// Waterline.transaction()
// Waterline.query()

Waterline.connect({
  datastore: datastore,
  meta: {}
}).exec(/*...*/);

Waterline.connect({
  datastore: datastore,
  meta: {}
}).exec(/*...*/);

Waterline.transaction({
  datastore: datastore,
  meta: {}
}).exec(/*...*/);





MySQL.getNewConnection({
  connectionString: 'mysql://....',
  meta: {}
}).exec(/*...*/);

MySQL.getConnectionFromPool({
  pool: pool,
  meta: {}
}).exec(/*...*/);


MySQL.releaseConnection({
  connection: connection,
  meta: {}
}).exec(/*...*/);

MySQL.releaseConnectionToPool({
  connection: connection,
  pool
  meta: {}
}).exec(/*...*/);




MySQL.getConnectionFromCluster({
  cluster: cluster,
  meta: {}
}).exec(/*...*/);
MySQL.releaseConnectionFromCluster({
  cluster: cluster,
  meta: {}
}).exec(/*...*/);





MySQL.getNewPool({
  connectionString: 'mysql://....',
  meta: {}
}).exec(/*...*/);

MySQL.getNewPool({
  connectionString: 'mysql://....',
  meta: {}
}).exec(/*...*/);







// Have a session via a known (i.e. configured) db connection obtained implicitly from
// the Sails app instance.
sails.hooks.orm.connect({
  to: 'larrysProductionMySQL',
  whileConnected: function (waterlineDbSession, done){
    waterlineDbSession.models.user.create({
      password: Passwords.encrypt({ password: req.param('password') }).execSync()
    }).exec(function (err, createdUser) {
      if (err) { return done(err); }
      return done(null, createdUser);
    });
  }
}).exec(function afterwards(err, createdUser) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});





// ========================================================================
// NOW USING MACHINEPACKS:

Waterline.transaction({

  datastore: sails.datastore('larrysProductionMySQL'),

  during: function (T, done) {





// MOVING ON
// ========================================================================
// FIRST, a REFRESHER.  HERES HOW IT LOOKS NORMALLY (WITHOUT TRANSACTION):


// // First check that the location exists
// Location.findOne({id: locationId}).exec(function(err, location) {
//   if (err) {return res.negotiate(err);}

//   // If not, return a 404
//   if (!location) {return res.notFound();}

//   // Get all products at the location
//   ProductOffering.find({location: locationId})
//   .populate('productType')
//   .exec(function(err, productOfferings) {
//     if (err) {return res.negotiate(err);}

//     var mush = {};
//     return res.json(mush);
//   });
// });


// ========================================================================
// WITH TRANSACTION:

sails.datastore('larrysProductionMySQL')
.transaction(function duringTransaction(T, done){

  // First check that the location exists.
  T.models.Location.findOne({id: locationId}).exec(function(err, location) {
    if (err) {return done(err));}
    if (!location) {return done(new Error('Location not found.'));}

    // Get all products at the location
    T.models.ProductOffering.find({location: locationId})
    .populate('productType')
    .exec(function(err, productOfferings) {
      if (err) {return done(err);}
      var mush = _.indexBy(productOfferings, 'id');
      return done(undefined, mush);
    });
  });

}).exec(function (err, result){
  if (err) {return res.negotiate(err);}
  return res.json(result);
});


// ========================================================================
// AGAIN, DEMONSTRATING ALTERNATE USAGE (where connection is passed in):

sails.datastore('larrysProductionMySQL')
.transaction(function duringTransaction(T, done){

  // First check that the location exists.
  Location.findOne({id: locationId})
  .usingConnection(T.connection)
  .exec(function(err, location) {
    if (err) {return done(err));}
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

}).exec(/*...*/);


// ========================================================================
// AGAIN, TAKING ADVANTAGE OF EXITS/SWITCHBACK:

sails.datastore('larrysProductionMySQL')
.transaction(function duringTransaction(T, done){

  // First check that the location exists.
  T.models.Location.findOne({id: locationId}).exec(function(err, location) {
    if (err) {return done(err));}
    if (!location) {return done.notFound();}

    // Get all products at the location
    T.models.ProductOffering.find({location: locationId})
    .populate('productType')
    .exec(function(err, productOfferings) {
      if (err) {return done(err);}
      var mush = _.indexBy(productOfferings, 'id');
      return done(undefined, mush);
    });
  });

}).exec({
  error: function (err){
    return res.negotiate(err);
  },
  notFound: function (){
    return res.notFound();
  },
  success: function (result){
    return res.json(result);
  }
});








// ========================================================================
// SAME THING BUT showing how to use mp-waterline to perform the transaction:

var larrysDbCluster = sails.datastore('larrysProductionMySQL');


Waterline.transaction({

  datastore: larrysDbCluster,

  during: function (T, done) {

    // First check that the location exists.
    T.models.Location.findOne({id: locationId}).exec(function (err, location) {
      if (err) {return done(err);}
      if (!location) {return done.notFound();}

      // Get all products at the location
      T.models.ProductOffering.find({location: locationId})
      .populate('productType')
      .exec(function(err, productOfferings) {
        if (err) {return done(err);}
        var mush = _.indexBy(productOfferings, 'id');
        return done(undefined, mush);
      });
    });
  }

}).exec({
  error: function (err){
    return res.negotiate(err);
  },
  notFound: function (){
    return res.notFound();
  },
  success: function (result){
    return res.json(result);
  }
});





// ========================================================================
// ANOTHER WAY TO DO IT WHERE THE CONNECTION IS PASSED IN:


//...
Waterline.transaction({

  datastore: larrysDbCluster,

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






// ========================================================================
// QUICK ASIDE SHOWING HOW TO OPEN (i.e. initialize) A DATASTORE

// This will always be async b/c it builds connections and pools and
// clusters and stuff.

WLDatastores.openDatastore({
  driver: require('machinepack-mysql'),
  meta: { /* ... */ }
}).exec(/*...*/);


// OR ALTERNATIVELY YOU CAN GRAB THE DRIVER FROM A MODEL:
WLDatastores.openDatastore({
  driver: User.driver,
  // ...
}).exec(/*...*/);

// OR FROM WATERLINE:
WLDatastores.openDatastore({
  driver: sails.hooks.orm.waterline.drivers[0],
  // ...
}).exec(/*...*/);






// ========================================================================
// QUICK ASIDE SHOWING HOW TO CLOSE (i.e. teardown) A DATASTORE

// This will always be async b/c it sometimes needs to gracefully close
// connections and pools and clusters and stuff.

WLDatastores.closeDatastore({
  datastore: sails.datastore('larrysProductionMySQL'),
  // ...
}).exec(/*...*/);










// ========================================================================
// EXPANDING FURTHER TO SHOW HOW TO DO THE INDIVIDUAL QUERIES:

Waterline.transaction({

  datastore: sails.datastore('larrysProductionMySQL'),

  during: function (T, done) {

    // First check that the location exists.
    Waterline.adapt({
      statement: {
        where: { id: locationId }
      },
      model: T.models.Location,
      connection: T.connection,
      datastores: T.datastores,
      adapters: T.adapters,

    }).exec()

    T.models.Location.findOne({id: locationId}).exec(function (err, location) {
      if (err) {return done(err);}
      if (!location) {return done.notFound();}

      // Get all products at the location
      T.models.ProductOffering.find({location: locationId})
      .populate('productType')
      .exec(function(err, productOfferings) {
        if (err) {return done(err);}
        var mush = _.indexBy(productOfferings, 'id');
        return done(undefined, mush);
      });
    });
  }

}).exec({
  error: function (err){
    return res.negotiate(err);
  },
  notFound: function (){
    return res.notFound();
  },
  success: function (result){
    return res.json(result);
  }
});










// User.dbc('readOnly').connect()
// User.dbc('readOnly').transaction()
// User.dbc('readOnly').query({

// });


// User.as('readOnly').query({

// })







// ====================================================================================================

// Have a session with an anonymous datastore (i.e. not configured) via a db connection obtained
// implicitly from the Sails app instance.
sails.hooks.orm.connect({
  datastore: 'larrysProductionMySQL',
  whileConnected: function (waterlineDbSession, done){
    waterlineDbSession.models.user.create({
      password: Passwords.encrypt({ password: req.param('password') }).execSync()
    }).exec(function (err, createdUser) {
      if (err) { return done(err); }
      return done(null, createdUser);
    });
  }
}).exec(function afterwards(err, createdUser) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});





sails.hooks.orm.datastore('larrysProductionMySQL')
.connect(function whileConnected(waterlineDbSession, done){
  waterlineDbSession.models.user.create({
    password: Passwords.encrypt({ password: req.param('password') }).execSync()
  }).exec(function (err, createdUser) {
    if (err) { return done(err); }
    return done(null, createdUser);
  });
}, function afterwards(err, createdUser) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});






// Or maybe:

// Use db connection for particular model



// Get db connection (raw)
sails.hooks.orm.getConnection({
  connectionString: ''
});



// Get connection
sails.hooks.orm.getConnection({
  connectionString: ''
});




User.create({
  password: Passwords.encrypt({ password: req.param('password') }).execSync()
}).connection().meta({
  connection: '==?',
  foo: 'bar',
  useTheCrazyAdapterSauceThisTime: true,
})
.exec(function (err) {
  if (err) { return res.negotiate(err); }
});






Waterline.openDatastore({
  driver: require('machinepack-mysql'),
  // ...
}).exec(/*...*/)

Waterline.closeDatastore({
  datastore: datastore
}).exec(/*...*/);




// ====================================================================================================
var Memory = require('machinepack-memory');

Memory.set({
  key: 'larrysProductionMySQL'
  value: value,
}).exec(/*...*/);

Memory.get({
  key: 'larrysProductionMySQL'
}).exec(/*...*/);

Memory.rm({
  key: 'larrysProductionMySQL'
}).exec(/*...*/);


// ====================================================================================================





Waterline.getPool({
  driver: require('machinepack-mysql'),
  identity: 'larrysProductionMySQL',

  meta: {/* ... */}
}).exec(function (err, db){
  //...
});







// Via machinepack:
// • Lease a db connection
// • Lease a transaction
// • Run a query
.leaseConnection({});
User.leaseConnection({});

// Lease a db connection obtained implicitly from a particular model
User.leaseConnection({
  to: 'mysql://foo:bar@foobar.com:3306/my_db',
  meta: { /* ... */ },
  whileConnected: function (dbSession, done){
    // ... use connection here ...
    return done();
  }
}).exec(function afterwards(err, createdUser) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});

// Have a transaction via a db connection obtained implicitly from a particular model
User.driver.transaction({
  to: 'mysql://foo:bar@foobar.com:3306/my_db',
  meta: { /* ... */ },
  whileConnected: function (dbSession, done){
    waterlineDbSession.models.user.create({
      password: Passwords.encrypt({ password: req.param('password') }).execSync()
    }).exec(function (err, createdUser) {
      if (err) { return done(err); }
      return done(null, createdUser);
    });
  }
}).exec(function afterwards(err, createdUser) {
  if (err) { return res.negotiate(err); }
  return res.ok();
});
