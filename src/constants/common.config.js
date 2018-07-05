// import CleanerPlugin from '../plugins/cleaner'
// import SpritesmithPlugin from '../plugins/spritesmith'

export let JSRule = {
  test: /\.js$/,
  extname: '.js',
  // loaders: [
  //   {
  //     use: require.resolve('../loaders/babel'),
  //     options: {}
  //   },
  //   {
  //     use: require.resolve('../loaders/envify'),
  //     options: {
  //       env: {
  //         NODE_ENV: 'production'
  //       }
  //     }
  //   },
  //   {
  //     use: require.resolve('../loaders/linkage'),
  //     options: {}
  //   },
  //   {
  //     use: require.resolve('../loaders/file'),
  //     options: {}
  //   }
  // ]
}

export let CSSRule = {
  test: /\.scss$/,
  extname: '.wxss',
  // loaders: [
  //   {
  //     use: require.resolve('../loaders/sass'),
  //     options: {}
  //   },
  //   {
  //     use: require.resolve('../loaders/file'),
  //     options: {}
  //   }
  // ]
}

export let HTMLRule = {
  test: /\.wxml$/,
  // loaders: [
  //   {
  //     use: require.resolve('../loaders/file'),
  //     options: {}
  //   }
  // ]
}

export let WXSRule = {
  test: /\.wxs$/,
  // loaders: [
  //   {
  //     use: require.resolve('../loaders/file'),
  //     options: {}
  //   }
  // ]
}

export let Rules = [JSRule, CSSRule, HTMLRule, WXSRule]

export let Plugins = [
  new CleanerPlugin(),
  new SpritesmithPlugin()
]

export default {
  rules: Rules,
  plugins: Plugins
}
