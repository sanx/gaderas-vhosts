var compose = require('koa-compose');
var koa = require('koa');
var app = module.exports = koa();
var util = require('util');
var nconf = require('nconf');
var _ = require('lodash');

var NODE_ENV = process.env.NODE_ENV;

var approot = __dirname;
nconf.argv().env().file({file: approot + '/config/' + NODE_ENV + '.config.json'});

app.keys = nconf.get("cookies:user:secrets").split(',');
// virtual host apps

//var wwwSubdomain = composer(require('./apps/koa'));
//var wwwSubdomain = composer(require('/Users/germoad/crowdictionary/server/build/js/app.js'));
//var wwwSubdomain = composer(testApp);
//var barSubdomain = composer(require('./apps/array'));
//console.log("wwwSubdomain: " + wwwSubdomain);
var sites = nconf.get("sites");
_.forEach(sites, function (settings, hostname) {
    return settings.middleware = composer(require(settings.path));
});

// compose koa apps and middleware arrays
// to be used later in our host switch generator

function composer(app) {
  console.log("compose: " + compose);
  console.log("orig app: " + util.inspect(app));
  //var middleware = app instanceof koa ? app.middleware : app;
  var middleware = 'object' === typeof app ? app.middleware : app;
  console.log("pre compose middleware: " + util.inspect(middleware));
  return compose(middleware);
}

// look ma, global response logging for all our apps!

app.use(function *(next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  if ('test' != process.env.NODE_ENV) {
    console.log('%s %s %s - %sms', this.host, this.method, this.url, ms);
  }
});

// switch between appropriate hosts calling their
// composed middleware with the appropriate context.

_.forEach(sites, function (settings, hostname) {
     app.use(function *(next) {
        if (hostname === this.hostname) {
            return yield settings.middleware.call(this, next);
        }
     })
});
app.use(function *(next) {
  /*switch (this.hostname) {
    case 'example.com':
    case 'www.example.com':
      // displays `Hello from main app`
      // and sets a `X-Custom` response header
      return yield wwwSubdomain.call(this, next);
    case 'bar.example.com':
      // displays `Howzit? From bar middleware bundle`
      // and sets a `X-Response-Time` response header
      return yield barSubdomain.call(this, next);
    default:
      console.log("on default");
      return yield wwwSubdomain.call(this, next);
  }*/

  // everything else, eg: 127.0.0.1:3000
  // will propagate to 404 Not Found
  return yield next;
});

if (!module.parent) app.listen(3000);
