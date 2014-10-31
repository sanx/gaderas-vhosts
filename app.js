var compose = require('koa-compose');
var koa = require('koa');
var app = module.exports = koa();
var util = require('util');
var nconf = require('nconf');
var _ = require('lodash');

var NODE_ENV = process.env.NODE_ENV;

var approot = __dirname;
nconf.argv().env();

app.keys = nconf.get("cookies:user:secrets").split(',');
// virtual host apps

//var wwwSubdomain = composer(require('./apps/koa'));
//var wwwSubdomain = composer(require('/Users/germoad/crowdictionary/server/build/js/app.js'));
//var wwwSubdomain = composer(testApp);
//var barSubdomain = composer(require('./apps/array'));
//console.log("wwwSubdomain: " + wwwSubdomain);
var wwwMexionario;
var wwwCandidatosMx;

if ('production' === NODE_ENV) {
    wwwMexionario = composer(require("/home/ubuntu/crowdictionary/server/build/js/app.js"));
    wwwCandidatosMx = composer(require("/home/ubuntu/candidatos-mx"));
} else if ('development' === NODE_ENV) {
    wwwMexionario = composer(require("/Users/germoad/crowdictionary/server/build/js/app.js"));
}

// compose koa apps and middleware arrays
// to be used later in our host switch generator

function composer(app) {
  console.log("compose: " + compose);
  console.log("orig app: " + util.inspect(app));
  //var middleware = app instanceof koa ? app.middleware : app;
  var middleware = 'object' === typeof app ? app.middleware : app;
  console.log("pre compose middleware: " + util.inspect(middleware));
  return compose(middleware);
};

redirectToSubdomain = function *(next, subdo) {
  this.redirect(this.protocol + "://" + subdo + '.' + this.host + this.url);
};

// look ma, global response logging for all our apps!

app.use(function *(next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  if ('test' != process.env.NODE_ENV) {
    console.log('%s %s %s %s "%s" %s %s - %sms', this.ip, this.host, this.method, this.url, this.header['user-agent'], this.status, this.length, ms);
  }
});

// switch between appropriate hosts calling their
// composed middleware with the appropriate context.

app.use(function *(next) {
    if ('production' === NODE_ENV) {
      switch (this.hostname.toLowerCase()) { // needed because some user agents don't lowercase urls
        case 'gerardomoad.com':
        case 'slangs.co':
        case 'candidatos.mx':
          return yield redirectToSubdomain.call(this, next, 'www');
        case 'www.candidatos.mx':
          return yield wwwCandidatosMx.call(this, next);
        case 'www.slangs.co':
        case 'www.mexionario.com':
          console.log("on default");
          return yield wwwMexionario.call(this, next);
      }
    } else if ('development' === NODE_ENV) {
      switch (this.hostname.toLowerCase()) { // needed because some user agents don't lowercase urls
        case 'www.candidatos.mx':
          return yield wwwCandidatosMx.call(this, next);
        case 'niet.slangs.co':
          return yield redirectToSubdomain.call(this, next, 'www');
        case 'dev.slangs.co':
        case '127.0.0.1':
          console.log("on default");
          return yield wwwMexionario.call(this, next);
      }
    }

  // everything else, eg: 127.0.0.1:3000
  // will propagate to 404 Not Found
  return yield next;
});

if (!module.parent) app.listen(3000);
