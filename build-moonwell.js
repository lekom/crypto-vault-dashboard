/**
 * Build script for Moonwell plugin
 * Bundles the Moonwell SDK with the plugin code
 */

const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['js/plugins/moonwell.source.js'],
    bundle: true,
    format: 'iife',
    globalName: 'MoonwellPlugin',
    outfile: 'js/plugins/moonwell.bundle.js',
    platform: 'browser',
    target: 'es2020',
    minify: false,
    sourcemap: true,
    // Inject node globals for browser
    inject: ['./node-shims.js'],
    define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'window'
    }
}).then(() => {
    console.log('✅ Moonwell plugin bundled successfully!');
}).catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
