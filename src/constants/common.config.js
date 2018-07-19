import CleanerPlugin from '../plugins/clean-wxparcel-plugin'

export let JSRule = {
  test: /\.js$/,
  extname: '.js',
  loaders: [
    {
      use: require.resolve('../loaders/babel-wxparcel-loader')
    },
    {
      use: require.resolve('../loaders/file-wxparcel-loader'),
      options: {}
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
  })
]

export default {
  rules: Rules,
  plugins: Plugins
}
