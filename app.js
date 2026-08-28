/* app.js
   主前端逻辑：渲染、搜索、分类、cart/fav、本地用户 auth、商家后台管理、订单处理等
*/
(function(){
  // Utilities
  const qs = (s,root=document)=> root.querySelector(s)
  const qsa = (s,root=document)=> Array.from(root.querySelectorAll(s))
  const money = n => Number(n||0).toFixed(2)
  const uid = ()=> 'x'+Math.random().toString(36).slice(2,9)

  // storage keys
  const KEY_SESSION = 'nova_session_v1' // stores {userId}
  const KEY_CART_PREFIX = 'nova_cart_' // + userId or guest
  const KEY_FAV_PREFIX = 'nova_fav_'

  // state
  let PRODUCTS = []
  let CATEGORIES = []

  // --- IndexedDB helpers (uses NOVA_DB) ---
  async function dbInit(){
    await window.NOVA_DB.init()
    PRODUCTS = await NOVA_DB.getAll('products') || []
    CATEGORIES = Array.from(new Set(PRODUCTS.map(p=>p.category))).sort()
  }
  async function refreshProducts(){
    PRODUCTS = await NOVA_DB.getAll('products') || []
    CATEGORIES = Array.from(new Set(PRODUCTS.map(p=>p.category))).sort()
  }

  // --- session & auth ---
  function getSession(){ try{return JSON.parse(localStorage.getItem(KEY_SESSION)||'null')}catch(e){return null} }
  function setSession(s){ localStorage.setItem(KEY_SESSION, JSON.stringify(s)) }
  function clearSession(){ localStorage.removeItem(KEY_SESSION) }
  async function getCurrentUser(){
    const s = getSession()
    if(!s || !s.userId) return null
    // 如果是 guest session，直接返回轻量对象，避免去 IndexedDB 查找
    if(String(s.userId).startsWith('g_')) return { id: s.userId, guest: true }
    return await NOVA_DB.get('users', s.userId)
  }

  // simple SHA-256 password hash with subtle crypto
  async function hashPassword(pwd){
    const enc = new TextEncoder().encode(pwd)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
    return hex
  }

  async function registerUser(name, password, isMerchant=false){
    // check existing
    const all = await NOVA_DB.getAll('users') || []
    if(all.find(u=>u.name===name)) throw new Error('用户名已被使用')
    const id = 'u'+Date.now()
    const passHash = await hashPassword(password)
    const user = { id, name, passHash, isMerchant, created: new Date().toISOString() }
    await NOVA_DB.put('users', user)
    return user
  }

  async function loginUser(name, password){
    const all = await NOVA_DB.getAll('users') || []
    const passHash = await hashPassword(password)
    const user = all.find(u=> (u.name===name) && (u.passHash===passHash) )
    if(!user) throw new Error('用户名或密码错误')
    setSession({ userId: user.id })
    return user
  }

  async function ensureGuestSession(){
    let s = getSession()
    if(!s){
      const guestId = 'g_' + uid()
      setSession({ userId: guestId, guest:true })
    }
  }

  // cart & fav per user
  function cartKeyFor(userId){ return KEY_CART_PREFIX + (userId||'guest') }
  function favKeyFor(userId){ return KEY_FAV_PREFIX + (userId||'guest') }

  function getCart(userId){
    try{ return JSON.parse(localStorage.getItem(cartKeyFor(userId))||'[]') }catch(e){return []}
  }
  function setCart(userId, cart){ localStorage.setItem(cartKeyFor(userId), JSON.stringify(cart)) }
  function getFav(userId){
    try{ return JSON.parse(localStorage.getItem(favKeyFor(userId))||'[]') }catch(e){return []}
  }
  function setFav(userId, fav){ localStorage.setItem(favKeyFor(userId), JSON.stringify(fav)) }

  // --- UI Renders common ---
  function renderCounts(){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const cartCount = getCart(uidv).reduce((a,b)=>a+b.qty,0)
    const favCount = getFav(uidv).length
    qs('#cartCount') && (qs('#cartCount').textContent = cartCount)
    qs('#favCount') && (qs('#favCount').textContent = favCount)
  }

  // product card
  function createProductCard(p){
    const el = document.createElement('article')
    el.className = 'card product'
    el.innerHTML = `
      <div class="thumb" style="background:${p.color}">${(p.title||'N')[0]}</div>
      <div style="flex:1">
        <h4>${p.title}</h4>
        <p class="muted">${p.desc}</p>
        <div class="meta">
          <div>¥ ${money(p.price)}</div>
          <div>
            <button class="small-btn favBtn">${isFav(p.id) ? '❤' : '♡'}</button>
            <button class="small-btn addBtn">加入购物车</button>
          </div>
        </div>
      </div>
    `
    el.querySelector('.addBtn').addEventListener('click', (e)=>{
      e.stopPropagation()
      addToCart(p.id, 1)
      animate(el)
    })
    el.querySelector('.favBtn').addEventListener('click', (e)=>{
      e.stopPropagation()
      toggleFav(p.id)
      el.querySelector('.favBtn').textContent = isFav(p.id) ? '❤' : '♡'
      renderCounts()
    })
    el.addEventListener('click', ()=> openProductModal(p.id))
    return el
  }

  function animate(el){
    el.style.transform = 'translateY(-6px)'
    setTimeout(()=> el.style.transform = '', 220)
  }

  // favorites helper
  function isFav(pid){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    return getFav(uidv).includes(pid)
  }
  function toggleFav(pid){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const fav = getFav(uidv)
    const idx = fav.indexOf(pid)
    if(idx>=0) fav.splice(idx,1)
    else fav.push(pid)
    setFav(uidv, fav)
  }

  // cart helpers
  function addToCart(pid, qty=1){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const cart = getCart(uidv)
    const item = cart.find(i=>i.id===pid)
    if(item) item.qty += qty
    else cart.push({ id: pid, qty })
    setCart(uidv, cart)
    renderCounts()
  }
  function setCartQty(pid, qty){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    let cart = getCart(uidv)
    cart = cart.map(i=> i.id===pid ? {...i, qty: Math.max(0, qty)} : i).filter(i=>i.qty>0)
    setCart(uidv, cart)
    renderCounts()
  }
  function removeFromCart(pid){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const cart = getCart(uidv).filter(i=>i.id!==pid)
    setCart(uidv, cart)
    renderCounts()
  }

  // product modal
  async function openProductModal(pid){
    const p = await NOVA_DB.get('products', pid)
    if(!p) return
    const modal = qs('#productModal')
    const body = qs('#modalContent')
    body.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="width:160px;height:160px;border-radius:12px;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:36px">${(p.title||'N')[0]}</div>
        <div style="flex:1">
          <h3>${p.title}</h3>
          <p class="muted">${p.desc}</p>
          <div style="margin-top:10px;font-size:18px">¥ ${money(p.price)}</div>
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button id="modalFavBtn" class="btn">${isFav(p.id)?'已收藏':'收藏'}</button>
            <button id="modalAddBtn" class="btn primary">加入购物车</button>
          </div>
        </div>
      </div>
    `
    qs('#modalClose').onclick = ()=> modal.classList.add('hidden')
    qs('#modalFavBtn').onclick = ()=>{
      toggleFav(p.id)
      qs('#modalFavBtn').textContent = isFav(p.id)?'已收藏':'收藏'
      renderCounts()
    }
    qs('#modalAddBtn').onclick = ()=>{
      addToCart(p.id,1)
      modal.classList.add('hidden')
      renderCounts()
    }
    modal.classList.remove('hidden')
  }

  // render home / products
  async function renderHome(){
    await refreshProducts()
    const rec = PRODUCTS.filter(p=>p.featured).slice(0,4)
    const recWrap = qs('#recommendList')
    if(recWrap){
      recWrap.innerHTML = ''
      rec.forEach(p=>{
        const card = document.createElement('div')
        card.className = 'card'
        card.innerHTML = `<div style="height:140px;border-radius:10px;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:24px">${p.title[0]}</div><h4 style="ma[...]`
        card.addEventListener('click', ()=> openProductModal(p.id))
        recWrap.appendChild(card)
      })
    }

    // categories
    const catWrap = qs('#categories')
    if(catWrap){
      catWrap.innerHTML = ''
      const allBtn = document.createElement('button'); allBtn.className='chip active'; allBtn.textContent='全部'; allBtn.dataset.cat='全部'
      catWrap.appendChild(allBtn)
      allBtn.addEventListener('click', ()=> { setActiveCategory('全部'); renderProducts() })
      CATEGORIES.forEach(c=>{
        const b = document.createElement('button'); b.className='chip'; b.textContent=c; b.dataset.cat=c
        b.addEventListener('click', ()=> { setActiveCategory(c); renderProducts() })
        catWrap.appendChild(b)
      })
    }

    // product grid: default show all
    renderProducts()
  }

  // product filters state
  let activeCategory = '全部'
  let query = ''
  let sortMode = 'relevance'

  function setActiveCategory(c){ activeCategory = c
    qsa('.chip').forEach(btn=> btn.classList.toggle('active', btn.dataset.cat===c || (c==='全部' && btn.dataset.cat===undefined && btn.textContent==='全部')))
  }

  async function renderProducts(){
    await refreshProducts()
    let list = PRODUCTS.slice()

    // filter category
    if(activeCategory && activeCategory!=='全部') list = list.filter(p=>p.category===activeCategory)
    // search
    if(query && query.trim().length>0){
      const q = query.toLowerCase()
      list = list.filter(p=> (p.title + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q) )
    }
    // sort
    if(sortMode === 'price_asc') list.sort((a,b)=>a.price-b.price)
    if(sortMode === 'price_desc') list.sort((a,b)=>b.price-a.price)
    // recommendation: if relevance (default) bring featured first
    if(sortMode === 'relevance') list.sort((a,b)=> (b.featured?1:0) - (a.featured?1:0))

    const grid = qs('#productGrid')
    if(!grid) return
    grid.innerHTML = ''
    if(list.length===0){ qs('#emptyState')?.classList.remove('hidden'); return } else qs('#emptyState')?.classList.add('hidden')
    list.forEach(p=> grid.appendChild(createProductCard(p)))
  }

  // search binding
  function bindSearch(){
    const input = qs('#searchInput')
    const clear = qs('#searchClear')
    const sortSel = qs('#sortSelect')
    if(input){
      input.addEventListener('input', (e)=>{ query = e.target.value; renderProducts() })
      qs('#exploreBtn')?.addEventListener('click', ()=> { input.focus(); input.value=''; query=''; renderProducts() })
    }
    if(clear) clear.addEventListener('click', ()=>{ if(input) input.value=''; query=''; renderProducts() })
    if(sortSel) sortSel.addEventListener('change', (e)=>{ sortMode = e.target.value; renderProducts() })
  }

  // cart drawer rendering
  async function renderCartDrawer(){
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const cartItems = getCart(uidv)
    const wrap = qs('#cartItems')
    let total = 0
    if(!wrap) return
    wrap.innerHTML = ''
    for(const ci of cartItems){
      const p = await NOVA_DB.get('products', ci.id)
      if(!p) continue
      total += p.price * ci.qty
      const el = document.createElement('div'); el.className = 'checkout-item'; el.innerHTML = `
        <div style="width:64px;height:64px;border-radius:8px;background:${p.color};display:flex;align-items:center;justify-content:center">${p.title[0]}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between"><strong>${p.title}</strong><div>¥ ${money(p.price)}</div></div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <button class="small-btn dec">-</button><span class="qty">${ci.qty}</span><button class="small-btn inc">+</button>
            <button class="small-btn remove">删除</button>
          </div>
        </div>
      `
      el.querySelector('.inc').addEventListener('click', ()=> { setCartQty(p.id, ci.qty+1); renderCartDrawer(); renderCounts() })
      el.querySelector('.dec').addEventListener('click', ()=> { setCartQty(p.id, ci.qty-1); renderCartDrawer(); renderCounts() })
      el.querySelector('.remove').addEventListener('click', ()=> { removeFromCart(p.id); renderCartDrawer(); renderCounts() })
      wrap.appendChild(el)
    }
    qs('#cartTotal') && (qs('#cartTotal').textContent = money(total))
  }

  // checkout flow
  async function renderCheckoutPage(){
    const wrap = qs('#checkoutList')
    const s = getSession()
    const uidv = s?.userId || 'guest'
    if(!wrap) return
    const cart = getCart(uidv)
    if(cart.length===0){ wrap.innerHTML = '<div class="empty">购物车为空</div>'; qs('#checkoutTotal').textContent='0.00'; return }
    wrap.innerHTML = ''
    let total=0
    for(const ci of cart){
      const p = await NOVA_DB.get('products', ci.id)
      if(!p) continue
      total += p.price * ci.qty
      const el = document.createElement('div'); el.className='checkout-item'; el.innerHTML = `
        <div style="width:72px;height:72px;border-radius:8px;background:${p.color};display:flex;align-items:center;justify-content:center">${p.title[0]}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between"><strong>${p.title}</strong><div>¥ ${money(p.price)}</div></div>
          <div style="margin-top:8px">数量： <button class="small-btn dec">-</button> <span class="qty">${ci.qty}</span> <button class="small-btn inc">+</button> <button class="small-btn remove">删除</button></div>
        </div>
      `
      el.querySelector('.inc').addEventListener('click', ()=> { setCartQty(p.id, ci.qty+1); renderCheckoutPage(); renderCounts() })
      el.querySelector('.dec').addEventListener('click', ()=> { setCartQty(p.id, ci.qty-1); renderCheckoutPage(); renderCounts() })
      el.querySelector('.remove').addEventListener('click', ()=> { removeFromCart(p.id); renderCheckoutPage(); renderCounts() })
      wrap.appendChild(el)
    }
    qs('#checkoutTotal') && (qs('#checkoutTotal').textContent = money(total))
    qs('#checkoutCommission') && (qs('#checkoutCommission').textContent = money(total*0.05))
    // place order: bind safely to avoid duplicate handlers on re-render
    const placeBtn = qs('#placeOrderBtn')
    if(placeBtn){
      // replace node to remove previously attached anonymous listeners, then attach a single handler
      const newBtn = placeBtn.cloneNode(true)
      placeBtn.parentNode.replaceChild(newBtn, placeBtn)
      newBtn.addEventListener('click', async ()=>{
        const name = qs('#inputName')?.value?.trim()
        const phone = qs('#inputPhone')?.value?.trim()
        const addr = qs('#inputAddress')?.value?.trim()
        if(!name || !phone || !addr){ alert('请填写收货信息'); return }
        const cartNow = getCart(uidv)
        if(cartNow.length===0){ alert('购物车为空'); return }
        // build order with items and merchantId per item
        const items = []
        let total = 0
        for(const ci of cartNow){
          const p = await NOVA_DB.get('products', ci.id)
          if(!p) continue
          items.push({ id: p.id, title: p.title, price: p.price, qty: ci.qty, merchantId: p.merchantId })
          total += p.price * ci.qty
        }
        const orderId = 'o' + Date.now()
        const order = { id: orderId, created: new Date().toISOString(), customer:{name,phone,addr,userId: s?.userId||null}, items, total, status:'paid' }
        await NOVA_DB.put('orders', order)
        // clear cart
        setCart(uidv, [])
        renderCheckoutPage(); renderCartDrawer(); renderCounts()
        qs('#orderResult').classList.remove('hidden'); qs('#orderResult').textContent = '下单成功（模拟），订单号：' + orderId
      })
    }
  }

  // user page functions
  async function bindAuth(){
    const authForm = qs('#authForm')
    const switchBtn = qs('#switchToRegister')
    const authTitle = qs('#authTitle')
    let registerMode = false
    if(switchBtn) switchBtn.addEventListener('click', ()=> {
      registerMode = !registerMode
      authTitle.textContent = registerMode ? '注册新用户' : '登录'
      qs('#authSubmit').textContent = registerMode ? '注册并登录' : '登录'
      switchBtn.textContent = registerMode ? '切换到登录' : '注册新用户'
    })
    if(authForm) authForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const name = qs('#authName').value.trim()
      const pass = qs('#authPassword').value.trim()
      if(!name || !pass || pass.length < 4) { alert('请输入有效用户名与密码（至少4位）'); return }
      try{
        if(registerMode){
          const user = await registerUser(name, pass, false)
          setSession({ userId: user.id })
        } else {
          await loginUser(name, pass)
        }
        setupUserUI()
      }catch(err){
        alert(err.message || '操作失败')
      }
    })
    qs('#logoutBtn')?.addEventListener('click', ()=> { clearSession(); setupUserUI() })
    qs('#logoutBtn2')?.addEventListener('click', ()=> { clearSession(); setupUserUI() })
  }

  async function setupUserUI(){
    const profileArea = qs('#profileArea')
    const authArea = qs('#authArea')
    const user = await getCurrentUser()
    if(user && !user.id.startsWith('g_')){ // logged in
      authArea && (authArea.classList.add('hidden'))
      profileArea && (profileArea.classList.remove('hidden'))
      qs('#profileName').textContent = user.name
      renderFavoritesList()
      renderOrdersList()
    } else {
      profileArea && (profileArea.classList.add('hidden'))
      authArea && (authArea.classList.remove('hidden'))
    }
  }

  async function renderFavoritesList(){
    const wrap = qs('#favoritesList')
    if(!wrap) return
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const fav = getFav(uidv)
    if(fav.length===0){ wrap.innerHTML = '<div class="empty">你还没有收藏任何商品</div>'; return }
    wrap.innerHTML = ''
    for(const id of fav){
      const p = await NOVA_DB.get('products', id)
      if(!p) continue
      const el = createProductCard(p)
      el.querySelector('.favBtn')?.addEventListener('click', ()=> { toggleFav(p.id); renderFavoritesList(); renderCounts() })
      wrap.appendChild(el)
    }
  }

  async function renderOrdersList(){
    const wrap = qs('#ordersList')
    if(!wrap) return
    const s = getSession()
    const uidv = s?.userId || 'guest'
    const allOrders = await NOVA_DB.getAll('orders') || []
    const myOrders = allOrders.filter(o=> o.customer?.userId === uidv )
    if(myOrders.length===0){ wrap.innerHTML = '<div class="empty">暂无订单</div>'; return }
    wrap.innerHTML = ''
    myOrders.forEach(o=>{
      const el = document.createElement('div'); el.className='profile-block'
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>订单 ${o.id}</strong><span>${(new Date(o.created)).toLocaleString()}</span></div>
        <div>总计：¥ ${money(o.total)}</div>
        <details style="margin-top:8px"><summary>查看商品</summary><ul>${o.items.map(i=>`<li>${i.title} × ${i.qty}（¥${money(i.price)}）</li>`).join('')}</ul></details>`
      wrap.appendChild(el)
    })
  }

  // merchant apply
  async function bindMerchantApply(){
    const form = qs('#merchantApply')
    if(!form) return
    form.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const name = qs('#mName').value.trim()
      const contact = qs('#mContact').value.trim()
      const info = qs('#mContactInfo').value.trim()
      const desc = qs('#mDesc').value.trim()
      if(!name || !contact) { alert('请填写店铺名和联系人'); return }
      const id = 'm' + Date.now()
      await NOVA_DB.put('merchants', { id, name, contact, info, desc, created: new Date().toISOString(), status:'approved' })
      qs('#applyResult').classList.remove('hidden')
      qs('#applyResult').textContent = '入驻申请已提交（模拟）并通过，店铺 ID：' + id
      form.reset()
    })
  }

  // admin / merchant backend
  async function renderAdmin(){
    const panel = qs('#adminPanel')
    const user = await getCurrentUser()
    if(!user || !user.isMerchant){
      panel && panel.classList.add('hidden')
      return
    }
    panel && panel.classList.remove('hidden')
    bindProductForm(user)
    await renderMerchantProducts(user)
    await renderMerchantOrders(user)
  }

  async function bindProductForm(user){
    const form = qs('#productForm')
    if(!form) return
    const idInput = qs('#prodId'), title = qs('#prodTitle'), cat = qs('#prodCategory'), price = qs('#prodPrice'), desc = qs('#prodDesc'), color = qs('#prodColor')
    qs('#clearForm')?.addEventListener('click', ()=> { idInput.value=''; title.value=''; cat.value=''; price.value=''; desc.value=''; color.value='' })
    form.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const idval = idInput.value || ('p' + Date.now())
      const obj = { id: idval, title: title.value.trim(), category: cat.value.trim() || '其他', price: Number(price.value||0), desc: desc.value.trim(), color: color.value || '#60a5fa', merchantId: user.id }
      await NOVA_DB.put('products', obj)
      // refresh products and UI
      await refreshProducts()
      renderProducts()
      renderMerchantProducts(user)
      form.reset()
    })
  }

  async function renderMerchantProducts(user){
    const wrap = qs('#merchantProducts')
    if(!wrap) return
    const all = await NOVA_DB.getAll('products') || []
    const mine = all.filter(p=>p.merchantId === user.id)
    wrap.innerHTML = ''
    if(mine.length===0){ wrap.innerHTML = '<div class="empty">您还没有商品，使用上方表单添加</div>'; return }
    mine.forEach(p=>{
      const el = document.createElement('article'); el.className = 'card product'
      el.innerHTML = `<div class="thumb" style="background:${p.color}">${p.title[0]}</div><div style="flex:1"><h4>${p.title}</h4><div class="muted">¥ ${money(p.price)}</div><div style="margin-to[...]`
      el.querySelector('.edit').addEventListener('click', ()=>{
        qs('#prodId').value = p.id; qs('#prodTitle').value = p.title; qs('#prodCategory').value = p.category; qs('#prodPrice').value = p.price; qs('#prodDesc').value = p.desc; qs('#prodColor').value = p.color
        window.scrollTo({top:0,behavior:'smooth'})
      })
      el.querySelector('.del').addEventListener('click', async ()=>{
        if(confirm('确定删除该商品？')){ await NOVA_DB.remove('products', p.id); await refreshProducts(); renderMerchantProducts(user); renderProducts() }
      })
      wrap.appendChild(el)
    })
  }

  async function renderMerchantOrders(user){
    const wrap = qs('#merchantOrders')
    if(!wrap) return
    const allOrders = await NOVA_DB.getAll('orders') || []
    const mineOrders = allOrders.filter(o=> o.items.some(i=> i.merchantId === user.id) )
    if(mineOrders.length===0){ wrap.innerHTML = '<div class="empty">暂无订单涉及到您的商品</div>'; return }
    wrap.innerHTML = ''
    mineOrders.forEach(o=>{
      const relatedItems = o.items.filter(i=> i.merchantId === user.id)
      const el = document.createElement('div'); el.className='card'
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>订单 ${o.id}</strong><span>${(new Date(o.created)).toLocaleString()}</span></div>
        <div>涉及商品总数：${relatedItems.reduce((s,i)=>s+i.qty,0)}</div>
        <details style="margin-top:8px"><summary>查看商品</summary><ul>${relatedItems.map(i=>`<li>${i.title} × ${i.qty}（¥${money(i.price)}）</li>`).join('')}</ul></details>`
      wrap.appendChild(el)
    })
  }

  // page init
  async function init(){
    await dbInit()
    await ensureGuestSession()
    renderCounts()

    // common bindings
    qs('#cartBtn')?.addEventListener('click', ()=> { qs('#cartDrawer')?.classList.toggle('hidden'); renderCartDrawer() })
    qs('#closeCart')?.addEventListener('click', ()=> qs('#cartDrawer')?.classList.add('hidden'))
    qs('#favBtn')?.addEventListener('click', ()=> location.href='user.html')
    qs('#menuBtn')?.addEventListener('click', ()=> alert('菜单：稍后可扩展'))
    qs('#userLink')?.addEventListener('click', ()=> {}) // link to user

    const page = document.body.getAttribute('data-page') || 'home'
    if(page === 'home'){
      await renderHome()
      bindSearch()
      renderCounts()
    }
    if(page === 'checkout'){
      await renderCheckoutPage()
      renderCounts()
    }
    if(page === 'user'){
      await bindAuth()
      await setupUserUI()
      renderCounts()
    }
    if(page === 'merchant'){
      await bindMerchantApply()
      renderCounts()
    }
    if(page === 'admin'){
      await renderAdmin()
      renderCounts()
    }

    // keep counts updated on load
    window.addEventListener('storage', ()=> renderCounts())
  }

  // expose some functions for debugging
  window.NOVA_APP = {
    addToCart, setCartQty, removeFromCart, renderProducts, openProductModal
  }

  document.addEventListener('DOMContentLoaded', init)
})();
