import { SourceMapConsumer, SourceNode } from 'source-map'

/**
 * 将不是 SourceMapConsumer 对象也强制转化成 SourceMapConsumer 对象
 * @param map
 */
export const getConsumer = async (sourceMap: SourceMapConsumer | string | object): Promise<SourceMapConsumer | null> => {
  if (sourceMap instanceof SourceMapConsumer) {
    return sourceMap
  }

  sourceMap = typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap
  if (!sourceMap) {
    return null
  }

  let consumer = await new SourceMapConsumer(sourceMap as any)
  return consumer
}

export const getSourceNode = async (content: string, map: string | object): Promise<SourceNode | null> => {
  let consumer = await getConsumer(map)
  return consumer ? SourceNode.fromStringWithSourceMap(content, consumer) : null
}
