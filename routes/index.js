const router = require('koa-router')();

router.get('/*', async (ctx, next) => {
  await ctx.render('index', {
      basic: 'https://ylgood.github.io/',
      js: 'e9639486.js',
      css: '9372b12a.css',
  })
});


module.exports = router;
