import CleanerPlugin from '../plugins/clean-wxparcel-plugin'

export let JSRule = {
  test: /\.js$/,
  extname: '.js',
  loaders: [
    {
      use: require.resolve('../loaders/babel-wxparcel-loader')
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
    }
  ]
}

export let Rules = [JSRule, CSSRule]

export let Plugins = [
  new CleanerPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  })
]

export default {
  rules: Rules,
  plugins: Plugins
}
