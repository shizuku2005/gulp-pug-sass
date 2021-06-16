/* -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- *//*
「記述の中で使われているGulpの処理の解説」

・task（'タスク名'）
処理の内容をまとめて定義しておく為の、タスクを定義しておきます。

・require('プラグイン名')
使用するプラグインを読み込みます

・src('取得するファイル')
タスクの対象となるファイルを取得します。複数のファイルも指定できます

・pipe(処理内容)
一つ一つの処理をつなげます。例えば、src()で取得したSassファイルをコンパイルし、それをdest()で書き出します。pipe()メソッドはいくらでもつなげることができるので、連続した複数の処理を実装できます

・dest('保存先フォルダー')
処理を行ったファイルを指定の場所に保存します

・series（処理, 処理）
直列処理をすることができるメソッドです。

・parallel（処理, 処理）
直列処理をすることができるメソッドです。

/* -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

// gulpプラグインの読み込み
const { src, dest, lastRun, series, parallel, watch } = require('gulp'),
      // pugのコンパイル
      pug = require('gulp-pug'),
      // sassのコンパイル
      sass = require('gulp-sass'),
      sassGlob = require('gulp-sass-glob'),
      // sassのコンパイル速度を向上させる為のもの
      fibers = require('fibers'),
      // autoprefixerを使う為に必要
      postcss = require('gulp-postcss'),
      // ベンダープレフィックスの自動付与。css gridなどの自動最適化
      autoprefixer = require('autoprefixer'),
      // sassのソースマップ（コンパイルや圧縮が行われたファイルの、元の位置を確認できるようにする仕組み）を出力
      sourcemaps = require('gulp-sourcemaps'),
      // 環境ごとの変数の値を変える
      sassVariables = require('gulp-sass-variables'),
      // cssの圧縮
      cleanCSS = require('gulp-clean-css'),

      // javascriptの圧縮
      uglify = require('gulp-uglify'),
      // 複数のJSファイルを一つにまとめる
      concat = require('gulp-concat'),
      // ES5にJSを変換
      babel = require('gulp-babel'),

      // 画像の圧縮
      imagemin = require('gulp-imagemin'),
      // pngの圧縮
      pngquant = require('imagemin-pngquant'),
      // jpegの圧縮
      mozjpeg = require('imagemin-mozjpeg'),

      // gulp実行時にブラウザを立ち上げる。
      browserSync = require('browser-sync').create(),
      // エラーでgulpが止まるのを防ぐ
      plumber = require('gulp-plumber'),
      // エラーのリアルタイム通知
      notify = require('gulp-notify'),
      // gulpのキャッシュ
      cache = require('gulp-cached'),
      // こちらもキャッシュ機能。cachedとの違いは前者がストリームをメモリにキャッシュして、後者はファイル比較をしているということだと思われる。
      changed = require('gulp-changed'),
      // if文を使えるようにする。
      gulpif = require('gulp-if'),
      // ファイルをインライン呼び出しすることができるプラグインです。今回はCSSやJSのインライン呼び出しを実現している。
      // 他にも色々な使い方ができるみたいなので、興味ある人は調べて見ること
      // https://www.npmjs.com/package/gulp-file-include
      fileinclude = require('gulp-file-include'),
      // コマンドにオプションを指定する。
      yargs = require('yargs').argv
      // ファイル変更や、追加をgulpで検知する
      // watch = require('gulp-watch')


// 開発用ディレクトリの指定
const srcPath = {
  // 出力対象は`_`で始まっていない`.pug`ファイル。
  'html': ['./src/pug/pages/**/*.pug'], //, '!' + './src/pug/**/_*.pug'],
  'styles': ['./src/sass/style.+(sass|scss)'],
  'images': ['./src/**/*.+(jpg|jpeg|png|gif|svg|ico)'],
  'js': './src/js/**/*.js',
  'other': './src/other/**/*'
}

// 出力ディレクトリの指定
const destPath = {
  'root': './dist/'
}

const isProduction = (yargs.env === 'production') ? true : false,
      environment = (yargs.env === 'production') ? 'production' : 'development',
      inlining = (yargs.inline === 'true') ? true : false


// pugのコンパイルなど
const html = () => {
  // pugファイルの読み込み
  return src(srcPath.html, { since: lastRun('html') })

    // pugファイルが増えてきて、コンパイル速度が落ちてきたら、以下の行のコメントアウトを外すべし。ただし、注意書き（このファイルの上部に記載）を読んで注意すること。
    // .pipe(cache('html'))

    // 別途 Watchタスク（一番下の方）からこのタスクを呼んだ時に、ビルドエラーで Watch タスクを終了させないようにしている。
    .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))

    // pugのコンパイル
    .pipe(pug({

      // Pugファイルのルートディレクトリを指定。
      // `/_includes/_layout`のようにルート相対パスで指定することができる。
      basedir: 'src/pug/pages',
      locals: {
        environment: environment,
        inlining: inlining
      },

      // Pugファイルの整形。圧縮する場合はfalse
      pretty: !isProduction
    }))

    .pipe(fileinclude({
      prefix: '@@',
      basepath: dest.root
    }))

    // ディレクトリへの出力
    .pipe(dest(destPath.root))

    // ブラウザの更新
    .pipe(browserSync.reload({stream: true}))
}



// sassのコンパイルなど
sass.compiler = require('sass')
const styles = () => {
  return src(srcPath.styles)
    // sassのキャッシュ。ファイルが多くなってきて、コンパイル速度が落ちてきたら、ON
    // .pipe(cache('styles'))

    .pipe(sassGlob())
    .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))

    // ソースマップを書き出す準備
    .pipe(gulpif(!isProduction, sourcemaps.init()))

    // .pipe(sassVariables({ $env: environment }))
    // sassのコンパイル
    .pipe(sass(
      { outputStyle: 'expanded' },
      { fibers: fibers }
    ))

    // 以下２行を追加しないとautoprefixerプラグインと一緒に使用した場合、ソースマップが上手く出力しない。
    .pipe(gulpif(!isProduction, sourcemaps.write({includeContent: false})))
    .pipe(gulpif(!isProduction, sourcemaps.init({loadMaps: true})))

    .pipe(postcss([
      // ベンダープレフィックスの自動付与と各ブラウザ固有の書き方の追記
      autoprefixer({
        // css gridに対応
        grid: true,
        // 不要な整形をしない
        cascade: false
      })
    ]))
    // cssの圧縮を(trueで)有効化
    .pipe(gulpif(isProduction, cleanCSS()))

    // ソースマップの書き出し
    .pipe(gulpif(!isProduction, sourcemaps.write()))
    .pipe(dest(destPath.root+'css/'))
    .pipe(browserSync.reload({stream: true}))
}



// javascriptの圧縮
const javascript = () => {
  return src(srcPath.js)
    .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))

    .pipe(babel())
    // JSの圧縮
    .pipe(gulpif(isProduction, uglify()))
    // 全てのJSファイルをscriptファイル一つにまとめる。
    .pipe(concat('script.js'))
    .pipe(dest(destPath.root +'js/'))
    .pipe(browserSync.reload({stream: true}))
}



// 画像の圧縮
const imageminTask = () => {
  return src(srcPath.images)

  // 変更・追加されたファイルだけを圧縮&出力
    .pipe(changed(destPath.root))
    .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
    .pipe(imagemin(
      [
        // pngの圧縮
        pngquant({

          // 圧縮率の指定
          quality: [.65, .8],

          // 圧縮スピードの指定。1が一番遅いが、圧縮率が高い。
          speed: 1,

          // ディザ処理をOFF。画像の圧縮方式。
          floyd: 0
        }),

        // pngquantでpng画像が暗くなってしまうバグを防ぐ
        imagemin.optipng(),

        // jpgの圧縮
        mozjpeg({
          quality:85,

          // プログレッシブjpegの設定。画像圧縮方式JPEG形式の拡張仕様の1種。
          progressive: true
        }),

        // svgの圧縮
        imagemin.svgo(),

        // gifの圧縮
        imagemin.gifsicle()
      ]
    ))
    .pipe(dest(destPath.root))
    .pipe(browserSync.reload({stream: true}))
}



// その他ファイルのコピータスク
const copyOther = () => {
  return src(srcPath.other)
    .pipe(dest(destPath.root))
    .pipe(browserSync.reload({stream: true}))
}


// gulp実行時にサーバーを立ち上げ、デフォルトブラウザの新しいタブでWebページを表示する
const browserSyncTask = done => {
  browserSync.init({
    server: {
      baseDir: 'dist/',
      index: 'index.html'
    }
  })
  done()
}

// コンテンツ更新の際はブラウザをリロードする
const taskWatch = done => {
  watch(['./src/**/*.pug'], html)
  watch(['./src/sass/**/*.+(scss|sass)'], styles)
  watch(['./src/js/**/*.js'], javascript)
  watch(['./src/img/**/*.+(jpg|jpeg|png|gif|svg|ico)'], imageminTask)
  watch(['./src/other/**/*'], copyOther)
  done()
}

// 個別のタスクを呼び出せるように定義（gulp html など）
exports.html = html
exports.styles = styles
exports.javascript = javascript
exports.imageminTask = imageminTask
exports.copyOther = copyOther

// ビルドタスクの設定。gulp buildを実行した時。サーバーは立ち上げたくないけど、ビルドだけしたい時に使う
exports.build = parallel(html, styles, javascript, imageminTask, copyOther)

// gulp 実行時に発火させるデフォルトタスク
exports.default = series(parallel(html, styles, javascript, imageminTask, copyOther), parallel(taskWatch, browserSyncTask))
