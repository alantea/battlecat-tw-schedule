module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/battlecat-tw-schedule/'
    : '/',
  productionSourceMap: false,
  chainWebpack: config => {
    config
    .plugin('html')
    .tap(args => {
      args[0].title = 'Battle cat schedule generator'
      return args
    })
  }
}
