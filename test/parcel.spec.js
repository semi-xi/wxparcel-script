/* eslint max-nested-callbacks: off */
/* eslint no-unused-expressions: off */
/* eslint-env mocha */

import Parcel from '../src/parcel'

describe('Parcel 模块', function () {
  describe('测试编译流程', function () {
    it('能寻找所有入口', function () {
      new Parcel()
    })
  })
})
