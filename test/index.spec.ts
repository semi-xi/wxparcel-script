/// <reference path="../src/typings.global.d.ts" />

import * as Parcel from '../src'
import { expect } from 'chai'

describe('工作流', () => {
  describe('工作流各种模块', () => {
    it('导出加载器', () => {
      expect(Parcel).has.ownProperty('BabelLoader')
      expect(Parcel).has.ownProperty('EnvifyLoader')
      expect(Parcel).has.ownProperty('SassLoader')
      expect(Parcel).has.ownProperty('UglifyJSLoader')
    })

    it('导出插件', () => {
      expect(Parcel).has.ownProperty('CleanPlugin')
      expect(Parcel).has.ownProperty('DevServerPlugin')
      expect(Parcel).has.ownProperty('SpritesmithPlugin')
    })

    it('导出解析器', () => {
      expect(Parcel).has.ownProperty('JSResolver')
      expect(Parcel).has.ownProperty('JSONResolver')
      expect(Parcel).has.ownProperty('WXMLResolver')
      expect(Parcel).has.ownProperty('WXSResolver')
      expect(Parcel).has.ownProperty('WXSSResolver')
    })

    it('导出打包器', () => {
      expect(Parcel).has.ownProperty('JSBundler')
    })

    it('导出基础类', () => {
      expect(Parcel).has.ownProperty('Assets')
      expect(Parcel).has.ownProperty('Chunk')
      expect(Parcel).has.ownProperty('OptionManager')
      expect(Parcel).has.ownProperty('Parser')
      expect(Parcel).has.ownProperty('Resolver')
      expect(Parcel).has.ownProperty('Bundler')
      expect(Parcel).has.ownProperty('Parcel')
    })

    it('导出常量', () => {
      expect(Parcel).has.ownProperty('chunkTypes')
    })

    it('导出全局常驻服务', () => {
      expect(Parcel).has.ownProperty('Runtime')
    })

    it('导出帮助函数', () => {
      expect(Parcel).has.ownProperty('utils')
      expect(Parcel).has.ownProperty('module')
      expect(Parcel).has.ownProperty('pm')
      expect(Parcel).has.ownProperty('process')
      expect(Parcel).has.ownProperty('sourceMap')
    })

    it('导出类型', () => {
      expect(Parcel).has.ownProperty('Typings')
    })
  })
})
