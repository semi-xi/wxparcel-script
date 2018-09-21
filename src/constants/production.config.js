import Config from './common.config'

Config.setRule('js', (rule) => {
  rule.loaders.push({
    use: require.resolve('../loaders/envify-wxparcel-loader'),
    options: {
      env: {
        NODE_ENV: 'production'
      }
    }
  })

  rule.loaders.push({
    use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
    options: {}
  })
})

export default Config
