var assert = require('assert');
var _ = require('lodash');
var Pack = require('../../');

describe('Queryable ::', function() {
  describe('Send Native Query', function() {
    var manager;
    var connection;

    // Create a manager and connection
    before(function(done) {
      // Needed to dynamically get the host using the docker container
      var host = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';

      Pack.createManager({
        connectionString: 'mysql://mp:mp@' + host + ':3306/mppg'
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        // Store the manager
        manager = report.manager;

        Pack.getConnection({
          manager: manager
        })
        .exec(function(err, report) {
          if (err) {
            return done(err);
          }

          // Store the connection
          connection = report.connection;
          return done();
        });
      });
    });

    // Afterwards release the connection
    after(function(done) {
      Pack.releaseConnection({
        connection: connection
      }).exec(done);
    });

    it('should run a native query and return the reports', function(done) {
      Pack.sendNativeQuery({
        connection: connection,
        nativeQuery: 'SHOW GRANTS FOR \'mp\';'
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        assert(_.isArray(report.result.rows));
        assert(report.result.rows.length);

        return done();
      });
    });
  });
});
