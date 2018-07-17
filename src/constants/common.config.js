import CleanerPlugin from '../plugins/clean-wxparcel-plugin'
import SpritesmithPlugin from '../plugins/spritesmith-wxparcel-plugin'

export let JSRule = {
  test: /\.js$/,
  extname: '.js',
  loaders: [
    {
      use: require.resolve('../loaders/babel-wxparcel-loader'),
      options: {}
    },
    {
      use: require.resolve('../loaders/file-wxparcel-loader'),
      options: {}
    },
    {
      use: require.resolve('../loaders/envify-wxparcel-loader'),
      options: {
        env: {
          NODE_ENV: 'production'
        }
      }
    }
  ]
}

export let CSSRule = {
  test: /\.scss$/,
  extname: '.wxss',
  loaders: [
    {
      use: require.resolve('../loaders/sass-wxparcel-loader'),
      options: {}
    },
    {
      use: require.resolve('../loaders/file-wxparcel-loader'),
      options: {}
    }
  ]
}

export let HTMLRule = {
  test: /\.wxml$/,
  loaders: [
    {
      use: require.resolve('../loaders/file-wxparcel-loader'),
      options: {}
    }
  ]
}

export let WXSRule = {
  test: /\.wxs$/,
  loaders: [
    {
      use: require.resolve('../loaders/file-wxparcel-loader'),
      options: {}
    }
  ]
}

export let Rules = [JSRule, CSSRule, HTMLRule, WXSRule]

export let Plugins = [
  new CleanerPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  }),
  new SpritesmithPlugin()
]

export default {
  rules: Rules,
  plugins: Plugins
}
