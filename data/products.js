/* 初始产品和商家数据种子（用于首次加载） */
/* products have fields:
   id, title, category, price, desc, color, merchantId, featured(boolean)
*/
(function(){
  const seedMerchants = [
    { id: 'm_platform', name: 'NOVA 官方集锦', contact: '', desc: '平台精选' },
    { id: 'm_star', name: '星愿手作', contact: '', desc: '手工创作小物' }
  ]

  const seedProducts = [
    { id:'p1', title:'星空手账本', category:'文具', price:59.00, desc:'轻薄便携，封面为渐变星空设计。', color:'#8b5cf6', merchantId:'m_star', featured:true },
    { id:'p2', title:'迷你便携咖啡杯', category:'生活', price:89.00, desc:'Tritan材质，便携防漏，通勤优选。', color:'#06b6d4', merchantId:'m_platform', featured:true },
    { id:'p3', title:'创意音乐灯', category:'数码', price:129.00, desc:'触控调光，配合音乐节拍律动光效。', color:'#f97316', merchantId:'m_platform', featured:false },
    { id:'p4', title:'插画家手作挂件', category:'手工', price:39.00, desc:'原创小挂件，限量发售。', color:'#fb7185', merchantId:'m_star', featured:false },
    { id:'p5', title:'植物瓶景套装', category:'生活', price:149.00, desc:'迷你生态瓶，桌面绿植，低维护。', color:'#34d399', merchantId:'m_platform', featured:true },
    { id:'p6', title:'极简钱包', category:'配件', price:199.00, desc:'薄款卡包，多卡位设计。', color:'#60a5fa', merchantId:'m_star', featured:false }
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
