import { SourceMapConsumer, SourceNode } from 'source-map'

/**
 * 将不是 SourceMapConsumer 对象也强制转化成 SourceMapConsumer 对象
 *
 * @param {SourceMapConsumer|String|Object} map
 * @return {SourceMapConsumer}
 */
export const getConsumer = async (sourceMap) => {
  if (sourceMap instanceof SourceMapConsumer) {
    return sourceMap
  }

  sourceMap = typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap
  if (!sourceMap) {
    return null
  }

  let consumer = await new SourceMapConsumer(sourceMap)
  return consumer
}

export const getSourceNode = async (content, map) => {
  let consumer = await getConsumer(map)
  return consumer && SourceNode.fromStringWithSourceMap(content, consumer)
}
