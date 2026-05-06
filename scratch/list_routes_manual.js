
const app = require('../index');

function printRoutes(stack, prefix = '') {
  stack.forEach(layer => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(`${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      const newPrefix = prefix + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^\\/', '').replace('\\/', '/') || '');
      printRoutes(layer.handle.stack, '/' + newPrefix.replace(/^\/+/, ''));
    }
  });
}

console.log("Registered Routes:");
printRoutes(app._router.stack);
process.exit(0);
