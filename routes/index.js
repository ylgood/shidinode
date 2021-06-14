const router = require('koa-router')();

router.get('/*', async (ctx, next) => {
  await ctx.render('index', {
      basic: 'https://ylgood.github.io/',
      js: 'ff690bdc.js',
      css: '9372b12a.css',
  })
});


module.exports = router;
