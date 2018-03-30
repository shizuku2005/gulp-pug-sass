echo "本番環境用 Buildを実行中..."
rm -rf dist

echo "キャッシュクリアをスキップしますか？ [yes/no]"
read Cacheclear
case $Cacheclear in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" );;
  * )
  rm -rf node_modules
  npm install
esac

echo "CSSとJSはインライン化させますか？ [yes/no]"
read Inlining

gulp styles javascript imagemin copy-other --env=production

case $Inlining in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" )
  gulp html --env=production --inline=true;;
  * )
  gulp html --env=production
esac

case $Inlining in
  "" | "Y" | "y" | "yes" | "Yes" | "YES" )
    rm -rf dist/css dist/js;;
  * )
esac

echo "\n\tSuccess!\n"
