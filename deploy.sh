

# 如果是发布到自定义域名
# echo 'www.example.com' > CNAME

git init
git add .
git commit -m ':tada:first'

# 如果发布到 https://<USERNAME>.github.io  USERNAME=你的用户名
git push -f git@github.com:ylgood/shidinode master

# 如果发布到 https://<USERNAME>.github.io/<REPO>  REPO=github上的项目
# git push -f git@github.com:<USERNAME>/<REPO>.git master:gh-pages

cd -
