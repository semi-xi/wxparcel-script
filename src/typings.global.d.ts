/**
 * 所有值
 */
declare type ValueOf<T> = T[keyof T]

/**
 * 所有属性, 排除方法
 */
declare type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
declare type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>
