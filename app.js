const Koa = require('koa');
const app = new Koa();
const views = require('koa-views');
const bodyparser = require('koa-bodyparser');
const koaBody = require('koa-body');
const index = require('./routes/index');
const shidi = require('./routes/shidi');

app.use(koaBody({multipart: true}));

// middlewares
app.use(bodyparser({
    enableTypes: ['json', 'text'],
}));
// app.use(json());
app.use(require('koa-static')(__dirname + '/public'));

app.use(views(__dirname + '/views', {
  extension: 'ejs'
}));

// routes
app.use(shidi.routes(), shidi.allowedMethods());
app.use(index.routes(), index.allowedMethods());


module.exports = app;
