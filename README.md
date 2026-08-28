# NOVA 前端（最终版） — 移动优先电商 Demo

说明
- 本项目为 NOVA 电商前端最终版（演示、Demo），数据全部保存在浏览器本地（IndexedDB + localStorage）。
- 适合部署到 GitHub Pages（静态站点），不依赖后端或外部 API，不接真实支付。
- UI 面向移动端优先，支持商家入驻与商家后台（本地模拟）、用户注册/登录（本地模拟）。

主要文件
- index.html — 首页（推荐 / 搜索 / 分类 / 商品列表 / 商品详情 modal / 购物车）
- checkout.html — 结算页（模拟下单）
- user.html — 用户中心（登录/注册、收藏、订单）
- merchant.html — 创作者/商家入驻申请（本地模拟）
- admin.html — 商家后台（登录为商家账户后可管理商品、查看订单）
- styles.css — 样式
- db.js — IndexedDB 简易封装
- data/products.js — 初始数据种子（首次加载会写入 IndexedDB）
- app.js — 主前端逻辑
- README.md — 本文件

部署（GitHub Pages）
1. 将仓库设置为 public（你已完成）。
2. 把所有文件放在仓库根目录（或 gh-pages 分支）。在仓库 Settings -> Pages 指向 `main` 分支并保存。
3. 访问 `https://<your-user>.github.io/<repo>/`（首页 index.html）。

本地测试
- 直接在浏览器中打开 `index.html`（双击文件）即可使用（全部运行在浏览器环境）。
- 推荐使用 Chrome/Edge/Firefox（现代浏览器）。

数据说明
- IndexedDB stores: products, users, merchants, orders
- localStorage 用于 session（KEY: `nova_session_v1`）、cart（`nova_cart_{userId}`）和 favorites（`nova_fav_{userId}`）
- 初始数据会在首次加载时写入 IndexedDB（data/products.js）

注意
- 演示环境不做真实支付；结算仅生成本地订单记录。
- 商家后台仅在你以商家身份登录后可用（在注册用户时可手动设置 isMerchant＝true，或在代码里调整）。
- 如需将本地 demo 迁移为后端服务，请将 db.js 的调用替换为 API 请求。

如需我把上述文件打包成一个 ZIP 或生成 git patch（.patch），告诉我你要哪种格式；或者你可以直接把这些文件粘贴到仓库并推送，我会在你完成后再次提供测试与修复建议。
