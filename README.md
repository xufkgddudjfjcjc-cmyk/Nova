# NOVA - 前端 MVP

这是 NOVA 电商平台的前端第一版（MVP），面向移动端优先。所有功能均为本地模拟（localStorage），不接真实支付或数据库。

主要文件
- index.html — 首页（商品展示、搜索、分类、商品弹窗、收藏、加入购物车）
- checkout.html — 模拟结算页面（修改数量、删除、填写地址、下单模拟）
- user.html — 个人中心（查看收藏、模拟订单）
- merchant.html — 创作者/商家入驻申请（本地存储）
- styles.css — 全站样式（暗色风格，移动优先）
- data/products.js — 集中式商品数据（便于今后接 API）
- app.js — 所有页面通用的交互逻辑（localStorage 存储、渲染等）

如何测试
1. 将所有文件放在同一目录（例如 `nova-mvp/`）。
2. 直接在浏览器中打开 `index.html`（双击或右键在浏览器中打开）。
   - 注意：直接打开本地文件无需后端；所有数据来自 data/products.js 和 localStorage。
3. 在首页搜索商品、切换分类、点击商品卡片查看详情、加入购物车、收藏等操作。
4. 点击右上角购物车打开抽屉；点击“去结算”进入 `checkout.html`，填写收货信息并点击“确认下单（模拟）”后，会在 localStorage 里生成一个模拟订单，且购物车清空。
5. 在 `user.html` 可查看收藏和模拟订单记录。
6. 在 `merchant.html` 可提交入驻申请（模拟存储）。

说明
- 所有操作均在浏览器本地运行并保存在 localStorage（不会上传或调用外部 API）。
- 商品数据集中放在 `data/products.js`，方便将来替换为真正的后端接口。
