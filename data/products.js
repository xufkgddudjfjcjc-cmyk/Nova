/* 初始产品和商家数据种子（用于首次加载） */
/* products have fields:
   id, title, category, price, desc, color, merchantId, featured(boolean),
   image (url), rating (0-5), sales (number), stock (number), createdAt
*/
(function(){
  const seedMerchants = [
    { id: 'm_platform', name: 'NOVA 官方集锦', contact: '', desc: '平台精选' },
    { id: 'm_star', name: '星愿手作', contact: '', desc: '手工创作小物' }
  ]

  const now = Date.now()
  const seedProducts = [
    { id:'p1', title:'星空手账本', category:'文具', price:59.00, desc:'轻薄便携，封面为渐变星空设计。', color:'#8b5cf6', merchantId:'m_star', featured:true, image:'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=手账本', rating:4.6, sales:128, stock:50, createdAt: new Date(now-1000*60*60*24*10).toISOString() },
    { id:'p2', title:'迷你便携咖啡杯', category:'生活', price:89.00, desc:'Tritan材质，便携防漏，通勤优选。', color:'#06b6d4', merchantId:'m_platform', featured:true, image:'https://via.placeholder.com/400x300/06b6d4/ffffff?text=咖啡杯', rating:4.8, sales:342, stock:120, createdAt: new Date(now-1000*60*60*24*30).toISOString() },
    { id:'p3', title:'创意音乐灯', category:'数码', price:129.00, desc:'触控调光，配合音乐节拍律动光效。', color:'#f97316', merchantId:'m_platform', featured:false, image:'https://via.placeholder.com/400x300/f97316/ffffff?text=音乐灯', rating:4.2, sales:210, stock:25, createdAt: new Date(now-1000*60*60*24*5).toISOString() },
    { id:'p4', title:'插画家手作挂件', category:'手工', price:39.00, desc:'原创小挂件，限量发售。', color:'#fb7185', merchantId:'m_star', featured:false, image:'https://via.placeholder.com/400x300/fb7185/ffffff?text=挂件', rating:4.7, sales:85, stock:10, createdAt: new Date(now-1000*60*60*24*2).toISOString() },
    { id:'p5', title:'植物瓶景套装', category:'生活', price:149.00, desc:'迷你生态瓶，桌面绿植，低维护。', color:'#34d399', merchantId:'m_platform', featured:true, image:'https://via.placeholder.com/400x300/34d399/ffffff?text=植物瓶景', rating:4.5, sales:190, stock:40, createdAt: new Date(now-1000*60*60*24*20).toISOString() },
    { id:'p6', title:'极简钱包', category:'配件', price:199.00, desc:'薄款卡包，多卡位设计。', color:'#60a5fa', merchantId:'m_star', featured:false, image:'https://via.placeholder.com/400x300/60a5fa/ffffff?text=钱包', rating:4.1, sales:73, stock:60, createdAt: new Date(now-1000*60*60*24*15).toISOString() },
    { id:'p7', title:'可折叠环保水杯', category:'生活', price:69.00, desc:'轻便折叠，户外旅行首选。', color:'#10b981', merchantId:'m_platform', featured:true, image:'https://via.placeholder.com/400x300/10b981/ffffff?text=水杯', rating:4.4, sales:58, stock:80, createdAt: new Date(now-1000*60*60*24*3).toISOString() },
    { id:'p8', title:'数码蓝牙耳机', category:'数码', price:259.00, desc:'降噪蓝牙耳机，续航强劲。', color:'#ef4444', merchantId:'m_platform', featured:false, image:'https://via.placeholder.com/400x300/ef4444/ffffff?text=耳机', rating:4.3, sales:420, stock:15, createdAt: new Date(now-1000*60*60*24*60).toISOString() }
  ]

  async function seedIfEmpty(){
    await NOVA_DB.init()
    const merchants = await NOVA_DB.getAll('merchants')
    if(!merchants || merchants.length===0){
      for(const m of seedMerchants) await NOVA_DB.put('merchants', m)
    }
    const prods = await NOVA_DB.getAll('products')
    if(!prods || prods.length===0){
      for(const p of seedProducts) await NOVA_DB.put('products', p)
    }
  }

  // expose seeding function and initial arrays (for debug/test)
  window.NOVA_SEED = { seedIfEmpty }
  // run seed async
  seedIfEmpty().catch(err=>console.error('seed error',err))
})();
