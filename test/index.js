var path = require('path');
var request = require('supertest');
var webserver = require('../src');
var File = require('gulp-util').File;

// Some configuration to enable https testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('gulp-server-livereload', function() {

  var stream;
  var proxyStream;

  var rootDir = new File({
    path: path.join(__dirname, 'fixtures')
  });

  var directoryIndexMissingDir = new File({
    path: path.join(__dirname, 'fixtures/directoryIndexMissing')
  });

  var directoryProxiedDir = new File({
    path: __dirname + '/fixtures/directoryProxied'
  });

  afterEach(function() {
    stream.emit('kill');
    if (proxyStream) {
      proxyStream.emit('kill');
      proxyStream = undefined;
    }
  });


  it('should work with default options', function(done) {
    stream = webserver();

    stream.write(rootDir, function(err) {
      if (err) return done(err);

      request('http://localhost:8000')
        .get('/')
        .expect(200, /Hello World/)
        .end(done);
    });
  });


  it('should work with custom port', function(done) {
    stream = webserver({
      port: 1111
    });

    stream.write(rootDir);

    request('http://localhost:1111')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) return done(err);
        done(err);
      });
  });


  it('should work with custom host', function(done) {
    stream = webserver({
      host: '0.0.0.0'
    });

    stream.write(rootDir);

    request('http://0.0.0.0:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) return done(err);
        done(err);
      });
  });


  it('should work with https', function(done) {
    stream = webserver({
      https: true
    });

    stream.write(rootDir);

    request('https://localhost:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) return done(err);
        done(err);
      });
  });


  it('should work with https and a custom certificate', function(done) {
    stream = webserver({
      https: {
        key: __dirname + '/../ssl/dev-key.pem',
        cert: __dirname + '/../ssl/dev-cert.pem'
      }
    });

    stream.write(rootDir);

    request('https://localhost:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) return done(err);
        done(err);
      });
  });

  it('should also load livereload script over https', function(done) {
    stream = webserver({
      https: true,
      livereload: true
    });

    stream.write(rootDir);

    request('https://localhost:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        request('https://localhost:35729')
          .get('/socket.io.js')
          .expect(200,/socket\.io/)
          .end(done);
      });
  });


  it('should show default.html', function(done) {
    stream = webserver({
      defaultFile: 'default.html'
    });

    stream.write(rootDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200, /Default/)
      .end(done);
  });


  it('should show a directory listing when the shorthand setting is enabled', function(done) {
    stream = webserver({
      directoryListing: true
    });

    stream.write(directoryIndexMissingDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200,/listing directory/)
      .end(done);
  });


  it('should not show a directory listing when the shorthand setting is disabled', function(done) {
    stream = webserver({
      directoryListing: false
    });

    stream.write(directoryIndexMissingDir);

    request('http://localhost:8000')
      .get('/')
      .expect(404,/Cannot GET/)
      .end(done);
  });


  it('should start the livereload server when the shorthand setting is enabled', function(done) {
    stream = webserver({
      livereload: true
    });

    stream.write(rootDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200,/Hello World/)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        request('http://localhost:35729')
          .get('/socket.io.js')
          .expect(200,/socket\.io/)
          .end(done);
      });
  });


  it('should not start the livereload server when the shorthand setting is disabled', function(done) {
    stream = webserver({
      livereload: false
    });

    stream.write(rootDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200,/Hello World/)
      .end(function(err) {
        if (err) return done(err);
      });
    request('http://localhost:35729')
      .get('/socket.io.js')
      .end(function(err) {
        if(err && err.code === "ECONNREFUSED") {
          done();
        } else {
          if (err) {
            return done(err);
          } else {
            done(new Error('livereload should not be started when shorthand middleware setting is set to false'));
          }
        }

      });
  });


  it('should proxy requests to localhost:8001', function(done) {

    stream = webserver({
      proxies: [{
        source: '/proxied',
        target: 'http://localhost:8001'
      }]
    });

    stream.write(rootDir);

    proxyStream = webserver({
      port: 8001
    });

    proxyStream.write(directoryProxiedDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        request('http://localhost:8000')
          .get('/proxied')
          .expect(200, /I am Ron Burgandy?/)
          .end(done);
      });
  });

  it('should configure proxy with options', function(done) {

    stream = webserver({
      proxies: [{
        source: '/proxied',
        target: 'http://localhost:8001',
        options: {
          headers: {
            'X-forwarded-host': 'localhost:8000'
          }
        }
      }]
    });

    stream.write(rootDir);

    proxyStream = webserver({
      port: 8001
    });

    proxyStream.write(directoryProxiedDir);

    request('http://localhost:8000')
      .get('/')
      .expect(200, /Hello World/)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        request('http://localhost:8000')
          .get('/proxied')
          .expect(200, /I am Ron Burgandy?/)
          .end(done);
      });
  });

  this.timeout(20);
  it('should accept `true` as an open option', function(done){
    stream = webserver({
      open: true
    });
    stream.write(rootDir);
    setTimeout(done, 15);
  });


});
