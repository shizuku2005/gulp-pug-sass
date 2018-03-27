rm -rf dist

echo "node_modulesの再インストールをスキップしますか？ [yes/no]"
read Cacheclear
case $Cacheclear in
"" | "Y" | "y" | "yes" | "Yes" | "YES" );;
* )
rm -rf node_modules
npm install
esac

gulp styles javascript imagemin copy-other
gulp html
