/* eslint-disable */
// Minimal Module Federation config for a VMS frontend plugin (release line 25.1).
// Everything that must stay in sync with the backend is marked with PLUGIN_NAME.
const path = require('path')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
const { VueLoaderPlugin } = require('vue-loader')
const CopyPlugin = require('copy-webpack-plugin')

// Must equal PluginExtension.PLUGIN_NAME on the backend. Valid JS identifier only.
const PLUGIN_NAME = 'sample_plugin'
// Port of the webpack dev server (`npm start`); the same value is in `dev_path` of public/settings.json.
const DEV_PORT = 8030


// Share Vue & friends and every @incoresoft/* package as singletons that the HOST provides
// (import: false → never bundled into the plugin, always taken from the host's share scope).
function getSharedPackages() {
  const deps = require('./package.json').dependencies
  const SINGLETONS = ['vue', 'vue-router', 'vue-i18n', 'pinia']
  const shared = {}
  for (const name of Object.keys(deps)) {
    if (name.startsWith('@incoresoft') || SINGLETONS.includes(name)) {
      shared[name] = { singleton: true, requiredVersion: false, import: false }
    }
  }
  return shared
}

// `mode` decides publicPath: in development the host loads the bundle from the dev server,
// in production from /resources/<PLUGIN_NAME>/ inside the plugin jar. It is taken from the
// `--mode` flag first, then NODE_ENV — so both `npm run build` and `webpack --mode production`
// produce a correct production bundle. Building in development mode by mistake bakes the
// dev-server address into the chunk URLs and the plugin then fails to load inside VMS.
module.exports = (env, argv = {}) => {
  const mode = argv.mode || process.env.NODE_ENV || 'development'
  return {
  mode,
  output: {
    // The backend serves the bundle from /resources/<PLUGIN_NAME>/ in production.
    publicPath: mode === 'development'
      ? `http://localhost:${DEV_PORT}/resources/${PLUGIN_NAME}/`
      : `/resources/${PLUGIN_NAME}/`,
    assetModuleFilename: 'images/[hash][ext][query]',
    clean: true,
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/') },
    extensions: ['.ts', '.vue', '.js', '.json'],
  },
  devServer: {
    port: DEV_PORT,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Private-Network': 'true',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      {
        test: /\.tsx?$/,
        use: ['babel-loader', { loader: 'ts-loader', options: { transpileOnly: true, appendTsSuffixTo: ['\\.vue$'] } }],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader',
          // sass-loader 13 still uses the legacy Sass JS API; silence the deprecation notice (sass >= 1.79).
          { loader: 'sass-loader', options: { sassOptions: { silenceDeprecations: ['legacy-js-api'] } } }],
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ModuleFederationPlugin({
      name: PLUGIN_NAME,
      filename: 'app.js', // the host loads <publicPath>/app.js
      remotes: {
        host: mode === 'development' ? 'host@http://localhost:8000/app.js' : 'host@/app.js',
        styleguide: mode === 'development' ? 'styleguide@http://localhost:8001/app.js' : 'styleguide@/app.js',
        core: mode === 'development' ? 'core@http://localhost:8002/app.js' : 'core@/app.js',
      },
      // Every key must be listed in public/component.json (without the leading './').
      exposes: {
        // Pages and their routes
        './ClientLayoutSamplePlugin': './src/layouts/ClientLayoutSamplePlugin.vue',
        './clientRoutes': './src/router/clientRoutes.ts',
        './AdminLayoutSamplePlugin': './src/layouts/AdminLayoutSamplePlugin.vue',
        './adminRoutes': './src/router/adminRoutes.ts',

        // Navigation and branding
        './VAdminSidebarMenuItem': './src/components/VAdminSidebarMenuItem.vue',
        './VClientHeaderPlusItem': './src/components/VClientHeaderPlusItem.vue',
        './VPluginIcon': './src/components/VPluginIcon.vue',

        // Alarms and notifications raised by our rule type
        './VEventsAndRulesOptionsBlock': './src/components/admin/VEventsAndRulesOptionsBlock.vue',
        './VEventsAndRulesWhereBlock': './src/components/admin/VEventsAndRulesWhereBlock.vue',
        './VAlarmsTypeColumn': './src/components/alarms/VAlarmsTypeColumn.vue',
        './VAlarmsMessageColumn': './src/components/alarms/VAlarmsMessageColumn.vue',
        './VAlarmsDetailsMessage': './src/components/alarms/VAlarmsDetailsMessage.vue',
        './VAlarmsDetailsPreview': './src/components/alarms/VAlarmsDetailsPreview.vue',
        './VSearchFilterBlock': './src/components/search/VSearchFilterBlock.vue',
        './VSearchCard': './src/components/search/VSearchCard.vue',
        './VSearchInfo': './src/components/search/VSearchInfo.vue',
        './VSearchAlarmInfo': './src/components/search/VSearchAlarmInfo.vue',
        './VNotificationItem': './src/components/notifications/VNotificationItem.vue',

        // Layout cell: the renderer, the modal that picks its content, and the side-effect
        // module that registers the sidebar entry (it exports nothing on purpose).
        './VClientLayoutCell': './src/components/cell/VClientLayoutCell.vue',
        './VSelectCategoryModal': './src/components/modals/VSelectCategoryModal.vue',
        './cellRegistration': './src/layout-cell/registration.ts',
      },
      shared: getSharedPackages(),
    }),
    new HtmlWebPackPlugin({ template: './src/index.html' }),
    new CopyPlugin({ patterns: [{ from: 'public' }] }),
  ],
}
}
