/// <reference path="../src/typings.global.d.ts" />

import fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import ip from 'ip'
import portscanner from 'portscanner'
import BabelLoader from '../src/loaders/babel-wxparcel-loader'
import OptionManager from '../src/libs/OptionManager'

describe('配置管理器', () => {
  describe('初始化与销毁', () => {
    it('能初始化默认配置', async () => {
      const idlePort = await portscanner.findAPortNotInUse(3000, 8000)
      const optionManager = new OptionManager()
      expect(optionManager.rootDir).to.eq(process.cwd())
      expect(optionManager.execDir).to.eq(path.join(__dirname, '../'))

      optionManager.rootDir = path.join(__dirname, './source/miniprogram')
      await optionManager.resolve()

      expect(optionManager.srcDir).to.eq(path.join(optionManager.rootDir, 'src'))
      expect(optionManager.outDir).to.eq(path.join(optionManager.rootDir, 'app'))
      expect(optionManager.staticDir).to.eq(path.join(optionManager.rootDir, 'static'))
      expect(optionManager.tmplDir).to.eq(path.join(optionManager.rootDir, '.temporary'))
      expect(optionManager.pubPath).to.eq(`http://${ip.address()}:${idlePort}`)

      expect(optionManager.npmDir).to.eq('npm')
      expect(optionManager.env).to.eq('development')
      expect(optionManager.logType).to.deep.eq(['console'])

      expect(optionManager.plugins).to.be.an('array')
      expect(optionManager.plugins.length).to.eq(0)

      expect(optionManager.sourceMap).to.eq(false)
      expect(optionManager.watching).to.be.eq(false)
      expect(optionManager.bundle).to.be.eq(false)
      expect(optionManager.silence).to.be.eq(false)

      let projectConfigFile = path.join(optionManager.rootDir, 'project.config.json')
      let projectConfig = fs.readJsonSync(projectConfigFile)
      expect(optionManager.projectConfigFile).to.be.eq(projectConfigFile)
      expect(optionManager.projectConfig).to.be.deep.eq(projectConfig)
      expect(optionManager.miniprogramRoot).to.be.eq(path.join(optionManager.rootDir, './src/'))
      expect(optionManager.pluginRoot).to.be.eq('')

      let appConfigFile = path.join(optionManager.rootDir, 'src/app.json')
      let appConfig = fs.readJsonSync(appConfigFile)

      expect(optionManager.appConfigFile).to.be.eq(appConfigFile)
      expect(optionManager.appConfig).to.be.deep.eq(appConfig)
    })

    it('能被销毁', async () => {
      const optionManager = new OptionManager()
      optionManager.rootDir = path.join(__dirname, './source/miniprogram')

      await optionManager.resolve()
      optionManager.destory()

      expect(optionManager.rootDir).to.eq(undefined)
      expect(optionManager.execDir).to.eq(undefined)
      expect(optionManager.srcDir).to.eq(undefined)
      expect(optionManager.outDir).to.eq(undefined)
      expect(optionManager.staticDir).to.eq(undefined)
      expect(optionManager.tmplDir).to.eq(undefined)
      expect(optionManager.pubPath).to.eq(undefined)
      expect(optionManager.npmDir).to.eq(undefined)
      expect(optionManager.env).to.eq(undefined)
      expect(optionManager.logType).to.eq(undefined)
      expect(optionManager.plugins).to.eq(undefined)
      expect(optionManager.sourceMap).to.eq(undefined)
      expect(optionManager.watching).to.be.eq(undefined)
      expect(optionManager.bundle).to.be.eq(undefined)
      expect(optionManager.silence).to.be.eq(undefined)
      expect(optionManager.projectConfigFile).to.be.eq(undefined)
      expect(optionManager.projectConfig).to.be.eq(undefined)
      expect(optionManager.miniprogramRoot).to.be.eq(undefined)
      expect(optionManager.pluginRoot).to.be.eq(undefined)
      expect(optionManager.appConfigFile).to.be.eq(undefined)
      expect(optionManager.appConfig).to.be.eq(undefined)
    })
  })

  describe('调用', () => {
    it('能隐性赋值给对象', async () => {
      const optionManager = new OptionManager()
      optionManager.rootDir = path.join(__dirname, './source/miniprogram')

      await optionManager.resolve()

      let object = { name: 'object', value: { sub: 'name' } }
      let newObject = optionManager.connect(object)

      expect(newObject).to.deep.eq(object)
      expect(newObject).has.ownProperty('rootDir')
      expect(newObject).has.ownProperty('execDir')
      expect(newObject).has.ownProperty('srcDir')
      expect(newObject).has.ownProperty('outDir')
      expect(newObject).has.ownProperty('staticDir')
      expect(newObject).has.ownProperty('tmplDir')
      expect(newObject).has.ownProperty('npmDir')
      expect(newObject).has.ownProperty('pubPath')
      expect(newObject).has.ownProperty('logType')
      expect(newObject).has.ownProperty('env')
      expect(newObject).has.ownProperty('rules')
      expect(newObject).has.ownProperty('plugins')
      expect(newObject).has.ownProperty('sourceMap')
      expect(newObject).has.ownProperty('watching')
      expect(newObject).has.ownProperty('bundle')
      expect(newObject).has.ownProperty('silence')
      expect(newObject).has.ownProperty('projectConfig')
      expect(newObject).has.ownProperty('projectConfigFile')
      expect(newObject).has.ownProperty('miniprogramRoot')
      expect(newObject).has.ownProperty('pluginRoot')
      expect(newObject).has.ownProperty('appConfig')
      expect(newObject).has.ownProperty('appConfigFile')
    })

    it('能检测规则配置', async () => {
      const optionManager = new OptionManager()
      optionManager.rootDir = path.join(__dirname, './source/miniprogram')

      await optionManager.resolve()

      let empty = optionManager.checkRules([])
      // tslint:disable-next-line:no-unused-expression
      expect(empty).to.true

      let valid = optionManager.checkRules([
        {
          test: /\.js$/,
          extname: '.js',
          loaders: [
            {
              use: BabelLoader
            }
          ]
        }
      ])
      // tslint:disable-next-line:no-unused-expression
      expect(valid).to.true

      let invalid = optionManager.checkRules([
        {
          test: /\.js$/,
          extname: '.js',
          loaders: []
        }
      ])

      // tslint:disable-next-line:no-unused-expression
      expect(invalid).is.string
      expect(invalid.toString().search('Option loaders is not a array or empty')).to.not.eq(-1)
    })
  })
})
