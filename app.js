/* NOVA 前端轻量 JS：管理商品渲染、搜索、分类、收藏、购物车、结算等功能
   设计为在多个 HTML 页面复用。所有数据保存在 localStorage（不会联网）。
*/
(function(){
  // utils
  function qs(sel, root=document){return root.querySelector(sel)}
  function qsa(sel, root=document){return Array.from(root.querySelectorAll(sel))}
  function money(n){return Number(n).toFixed(2)}

  // storage keys
  const KEY_CART = 'nova_cart_v1'
  const KEY_FAV = 'nova_fav_v1'
  const KEY_ORDERS = 'nova_orders_v1'
  const KEY_MERCHANTS = 'nova_merchants_v1'

  // load products from global
  const PRODUCTS = window.NOVA_PRODUCTS || []

  // state
  let state = {
    products: PRODUCTS.slice(),
    category: '全部',
    query: '',
    sort: 'default'
  }

  // storage helpers
  const store = {
    getCart(){ try{return JSON.parse(localStorage.getItem(KEY_CART)||'[]')}catch(e){return []} },
    setCart(v){ localStorage.setItem(KEY_CART, JSON.stringify(v)) },
    getFav(){ try{return JSON.parse(localStorage.getItem(KEY_FAV)||'[]')}catch(e){return []} },
    setFav(v){ localStorage.setItem(KEY_FAV, JSON.stringify(v)) },
    getOrders(){ try{return JSON.parse(localStorage.getItem(KEY_ORDERS)||'[]')}catch(e){return []} },
    setOrders(v){ localStorage.setItem(KEY_ORDERS, JSON.stringify(v)) },
    getMerchants(){ try{return JSON.parse(localStorage.getItem(KEY_MERCHANTS)||'[]')}catch(e){return []} },
    setMerchants(v){ localStorage.setItem(KEY_MERCHANTS, JSON.stringify(v)) }
  }

  // helpers manipulating cart & fav
  function addToCart(id, qty=1){
    const cart = store.getCart()
    const item = cart.find(i=>i.id===id)
    if(item) item.qty += qty
    else cart.push({id, qty})
    store.setCart(cart)
    renderCartCount()
    renderCartDrawer()
  }
  function setCartQty(id, qty){
    let cart = store.getCart()
    cart = cart.map(i=> i.id===id ? {...i, qty: Math.max(0, qty)} : i).filter(i=>i.qty>0)
    store.setCart(cart)
    renderCartCount()
    renderCartDrawer()
  }
  function removeCart(id){
    let cart = store.getCart().filter(i=>i.id!==id)
    store.setCart(cart)
    renderCartCount()
    renderCartDrawer()
  }
  function toggleFav(id){
    const fav = store.getFav()
    const idx = fav.indexOf(id)
    if(idx>=0) fav.splice(idx,1)
    else fav.push(id)
    store.setFav(fav)
    renderFavCount()
  }

  // rendering functions
  function renderCategories(){
    const cats = ['全部', ...Array.from(new Set(PRODUCTS.map(p=>p.category)))]
    const wrap = qs('#categories')
    if(!wrap) return
    wrap.innerHTML = ''
    cats.forEach(c=>{
      const btn = document.createElement('button')
      btn.textContent = c
      btn.className = 'cat-btn' + (state.category===c ? ' active' : '')
      btn.addEventListener('click', ()=>{
        state.category = c
        renderCategories()
        renderProducts()
      })
      wrap.appendChild(btn)
    })
  }

  function filterAndSort(){
    let results = state.products.slice()
    if(state.category && state.category!=='全部'){
      results = results.filter(p=>p.category===state.category)
    }
    if(state.query && state.query.trim()){
      const q = state.query.trim().toLowerCase()
      results = results.filter(p=> (p.title+ ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q))
    }
    if(state.sort==='price_asc') results.sort((a,b)=>a.price-b.price)
    if(state.sort==='price_desc') results.sort((a,b)=>b.price-a.price)
    return results
  }

  function renderProducts(){
    const grid = qs('#productGrid')
    if(!grid) return
    const list = filterAndSort()
    grid.innerHTML = ''
    if(list.length===0){
      qs('#emptyState')?.classList.remove('hidden')
      return
    } else {
      qs('#emptyState')?.classList.add('hidden')
    }
    const fav = store.getFav()
    list.forEach(p=>{
      const el = document.createElement('article')
      el.className = 'card'
      el.innerHTML = `
        <div class="thumb" style="background:${p.color}">${p.title.split('')[0]||'N'}</div>
        <div class="body">
          <h4>${p.title}</h4>
          <p>${p.desc}</p>
          <div class="meta">
            <div>¥ ${money(p.price)}</div>
            <div>
              <button class="small-btn fav">${fav.includes(p.id)?'❤':'♡'}</button>
              <button class="small-btn add">加入购物车</button>
            </div>
          </div>
        </div>
      `
      el.querySelector('.add').addEventListener('click', (e)=>{
        addToCart(p.id,1)
        e.stopPropagation()
        animateAdd(el)
      })
      el.querySelector('.fav').addEventListener('click', (e)=>{
        toggleFav(p.id); renderProducts(); e.stopPropagation()
      })
      el.addEventListener('click', ()=> openProductModal(p.id))
      grid.appendChild(el)
    })
  }

  function animateAdd(card){
    card.style.transform = 'translateY(-6px)'
    setTimeout(()=>card.style.transform='',180)
  }

  // modal
  function openProductModal(id){
    const p = PRODUCTS.find(x=>x.id===id)
    if(!p) return
    const modal = qs('#productModal')
    const body = qs('#modalBody')
    body.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:160px;height:160px;border-radius:12px;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:36px">${p.title[0]}</div>
        <div style="flex:1">
          <h3>${p.title}</h3>
          <p style="color:var(--muted)">${p.desc}</p>
          <div style="margin-top:10px;font-size:18px">¥ ${money(p.price)}</div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button id="modalFav" class="btn small">收藏</button>
            <button id="modalAdd" class="btn primary">加入购物车</button>
          </div>
        </div>
      </div>
    `
    qs('#modalClose').onclick = closeModal
    qs('#modalAdd').onclick = ()=>{
      addToCart(p.id,1)
      closeModal()
    }
    qs('#modalFav').onclick = ()=>{
      toggleFav(p.id)
      qs('#modalFav').textContent = store.getFav().includes(p.id) ? '已收藏' : '收藏'
      renderFavCount()
      renderProducts()
    }
    modal.classList.remove('hidden')
  }
  function closeModal(){ qs('#productModal')?.classList.add('hidden') }

  // cart drawer
  function renderCartCount(){
    const cart = store.getCart()
    const count = cart.reduce((s,i)=>s+i.qty,0)
    qs('#cartCount') && (qs('#cartCount').textContent = count)
  }
  function renderFavCount(){
    qs('#favCount') && (qs('#favCount').textContent = store.getFav().length)
  }
  function renderCartDrawer(){
    const drawer = qs('#cartDrawer')
    const itemsWrap = qs('#cartItems')
    const cart = store.getCart()
    itemsWrap && (itemsWrap.innerHTML = '')
    let total = 0
    cart.forEach(ci=>{
      const p = PRODUCTS.find(x=>x.id===ci.id)
      if(!p) return
      total += p.price * ci.qty
      const el = document.createElement('div')
      el.className = 'checkout-item'
      el.innerHTML = `
        <div style="width:56px;height:56px;border-radius:8px;background:${p.color};display:flex;align-items:center;justify-content:center">${p.title[0]}</div>
        <div class="meta">
          <div style="display:flex;justify-content:space-between"><div>${p.title}</div><div>¥ ${money(p.price)}</div></div>
          <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
            <button class="small-btn dec">-</button>
            <span class="qty">${ci.qty}</span>
            <button class="small-btn inc">+</button>
            <button class="small-btn remove">删除</button>
          </div>
        </div>
      `
      el.querySelector('.inc').addEventListener('click', ()=> setCartQty(p.id, ci.qty+1))
      el.querySelector('.dec').addEventListener('click', ()=> setCartQty(p.id, ci.qty-1))
      el.querySelector('.remove').addEventListener('click', ()=> removeCart(p.id))
      itemsWrap.appendChild(el)
    })
    qs('#cartTotal') && (qs('#cartTotal').textContent = money(total))
  }

  // checkout page rendering & actions
  function renderCheckoutList(){
    if(!qs('#checkoutList')) return
    const wrap = qs('#checkoutList')
    const cart = store.getCart()
    if(cart.length===0){ wrap.innerHTML = '<div class="empty">购物车为空，去首页挑选好物吧。</div>'; qs('#checkoutTotal').textContent = '0.00'; return }
    wrap.innerHTML = ''
    let total = 0
    cart.forEach(ci=>{
      const p = PRODUCTS.find(x=>x.id===ci.id)
      if(!p) return
      total += p.price * ci.qty
      const el = document.createElement('div')
      el.className = 'checkout-item'
      el.innerHTML = `
        <div style="width:72px;height:72px;border-radius:8px;background:${p.color};display:flex;align-items:center;justify-content:center">${p.title[0]}</div>
        <div class="meta">
          <div style="display:flex;justify-content:space-between"><strong>${p.title}</strong><div>¥ ${money(p.price)}</div></div>
          <div style="margin-top:6px">
            数量：<button class="small-btn dec">-</button> <span class="qty">${ci.qty}</span> <button class="small-btn inc">+</button>
            <button class="small-btn remove">删除</button>
          </div>
        </div>
      `
      el.querySelector('.inc').addEventListener('click', ()=> { setCartQty(p.id, ci.qty+1); renderCheckoutList(); })
      el.querySelector('.dec').addEventListener('click', ()=> { setCartQty(p.id, ci.qty-1); renderCheckoutList(); })
      el.querySelector('.remove').addEventListener('click', ()=> { removeCart(p.id); renderCheckoutList(); })
      wrap.appendChild(el)
    })
    qs('#checkoutTotal').textContent = money(total)
  }

  function placeOrderSimulated(){
    const name = qs('#inputName')?.value?.trim()
    const phone = qs('#inputPhone')?.value?.trim()
    const addr = qs('#inputAddress')?.value?.trim()
    if(!name || !phone || !addr){ alert('请填写收货信息（模拟）'); return }
    const cart = store.getCart()
    if(cart.length===0){ alert('购物车为空'); return }
    // build order
    const items = cart.map(ci=>{
      const p = PRODUCTS.find(x=>x.id===ci.id)
      return {id:ci.id, title:p?.title||'未知', price:p?.price||0, qty:ci.qty}
    })
    const total = items.reduce((s,i)=>s+i.price*i.qty,0)
    const orders = store.getOrders()
    const order = {
      id: 'o'+Date.now(),
      created: new Date().toISOString(),
      customer: {name, phone, addr},
      items,
      total
    }
    orders.unshift(order)
    store.setOrders(orders)
    // clear cart
    store.setCart([])
    renderCartCount(); renderCartDrawer(); renderCheckoutList()
    qs('#orderResult').classList.remove('hidden')
    qs('#orderResult').textContent = '下单成功（模拟），订单号：' + order.id
  }

  // user page render
  function renderFavoritesList(){
    const favWrap = qs('#favoritesList')
    if(!favWrap) return
    const fav = store.getFav()
    if(fav.length===0){ favWrap.innerHTML = '<div class="empty">你还没有收藏任何商品</div>'; return }
    favWrap.innerHTML = ''
    fav.forEach(id=>{
      const p = PRODUCTS.find(x=>x.id===id)
      if(!p) return
      const el = document.createElement('article')
      el.className = 'card'
      el.innerHTML = `
        <div class="thumb" style="background:${p.color}">${p.title[0]}</div>
        <div><h4>${p.title}</h4><p>${p.desc}</p><div class="meta"><div>¥ ${money(p.price)}</div><div><button class="small-btn remove">取消收藏</button></div></div></div>
      `
      el.querySelector('.remove').addEventListener('click', ()=>{
        toggleFav(p.id)
        renderFavoritesList()
        renderFavCount()
      })
      el.addEventListener('click', ()=> openProductModal(p.id))
      favWrap.appendChild(el)
    })
  }

  function renderOrdersList(){
    const w = qs('#ordersList')
    if(!w) return
    const orders = store.getOrders()
    if(orders.length===0){ w.innerHTML = '<div class="empty">暂无订单</div>'; return }
    w.innerHTML = ''
    orders.forEach(o=>{
      const el = document.createElement('div')
      el.className = 'profile-block'
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>订单 ${o.id}</strong><span>${(new Date(o.created)).toLocaleString()}</span></div>
        <div>总计：¥ ${money(o.total)}</div>
        <details style="margin-top:8px">
          <summary>查看商品</summary>
          <ul>${o.items.map(i=>`<li>${i.title} × ${i.qty}（¥${money(i.price)}）</li>`).join('')}</ul>
        </details>
      `
      w.appendChild(el)
    })
  }

  // merchant form
  function handleMerchantForm(){
    const form = qs('#merchantForm')
    if(!form) return
    form.addEventListener('submit',(e)=>{
      e.preventDefault()
      const name = qs('#mName').value.trim()
      const contact = qs('#mContact').value.trim()
      const phone = qs('#mPhone').value.trim()
      const desc = qs('#mDesc').value.trim()
      if(!name||!contact||!phone){ alert('请填写必填项'); return }
      const apps = store.getMerchants()
      const app = {id:'m'+Date.now(), name, contact, phone, desc, created: new Date().toISOString(), status:'pending'}
      apps.unshift(app)
      store.setMerchants(apps)
      qs('#merchantResult').classList.remove('hidden')
      qs('#merchantResult').textContent = '已提交入驻申请（模拟），ID：' + app.id
      form.reset()
    })
  }

  // initial binding for home page
  function bindHome(){
    qs('#searchInput')?.addEventListener('input', (e)=>{
      state.query = e.target.value
      renderProducts()
    })
    qs('#sortSelect')?.addEventListener('change',(e)=>{
      state.sort = e.target.value
      renderProducts()
    })
    qs('#cartBtn')?.addEventListener('click', ()=>{
      qs('#cartDrawer')?.classList.toggle('hidden')
      renderCartDrawer()
    })
    qs('#closeCart')?.addEventListener('click', ()=> qs('#cartDrawer')?.classList.add('hidden'))
    qs('#favBtn')?.addEventListener('click', ()=> location.href='user.html')
    qs('#modalClose')?.addEventListener('click', closeModal)
  }

  // page router
  function init(){
    renderCartCount(); renderFavCount()
    const page = document.body.getAttribute('data-page') || 'home'
    if(page==='home'){
      renderCategories(); renderProducts(); bindHome()
    }
    if(page==='checkout'){
      renderCartCount(); renderCheckoutList()
      qs('#placeOrderBtn')?.addEventListener('click', placeOrderSimulated)
    }
    if(page==='user'){
      renderFavoritesList(); renderOrdersList()
      // allow clicking saved favs to open modal
      document.addEventListener('click', (e)=>{
        const card = e.target.closest('.card')
        if(card && card.querySelector('h4')) {
          const title = card.querySelector('h4').textContent
          const p = PRODUCTS.find(x=>x.title===title)
          if(p) openProductModal(p.id)
        }
      })
    }
    if(page==='merchant'){
      handleMerchantForm()
    }
    // global behaviors
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeModal(); qs('#cartDrawer')?.classList.add('hidden') } })
    // make sure cart UI is up to date
    renderCartDrawer()
  }

  // run
  document.addEventListener('DOMContentLoaded', init)
})();
