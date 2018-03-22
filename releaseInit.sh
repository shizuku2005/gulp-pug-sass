echo "本番環境用 Buildを実行中..."
rm -rf dist/

echo "キャッシュをクリアをスキップしますか？ [yes/no]"
read Cacheclear
case $Cacheclear in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" );;
  * )
  rm -rf node_modules
  npm install
esac

echo "CSSとJSはインライン化させますか？ [yes/no]"
read Inlining

case $Inlining in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" );;
  * )
    sed -i -e 's/inlining = true/inlining = false/g' ./src/pug/config.pug
    sed -i -e 's/$inlining: true/$inlining: false/g' ./src/scss/config.scss
esac

sed -i -e 's/release = false/release = true/g' ./src/pug/config.pug
sed -i -e 's/$release: false/$release: true/g' ./src/scss/config.scss

gulp styles javascript imagemin copy-other --env=production
gulp html --env=production

sed -i -e 's/release = true/release = false/g' ./src/pug/config.pug
sed -i -e 's/$release: true/$release: false/g' ./src/scss/config.scss

case $Inlining in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" )
    rm -rf dist/css dist/js;;
  * )
    sed -i -e 's/inlining = false/inlining = true/g' ./src/pug/config.pug
    sed -i -e 's/$inlining: false/$inlining: true/g' ./src/scss/config.scss
esac

rm ./src/pug/config.pug-e ./src/scss/config.scss-e

echo "\n\tSuccess!\n"
