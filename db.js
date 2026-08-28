/* db.js
   简单的 IndexedDB 封装：提供 Promise 接口的 CRUD。
   Stores: products, users, merchants, orders
*/
(function(global){
  const DB_NAME = 'nova_db_v1'
  const DB_VERSION = 1
  let db = null

  function openDB(){
    return new Promise((resolve, reject)=>{
      if(db) return resolve(db)
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = (e)=>{
        const idb = e.target.result
        if(!idb.objectStoreNames.contains('products')){
          idb.createObjectStore('products', { keyPath: 'id' })
        }
        if(!idb.objectStoreNames.contains('users')){
          idb.createObjectStore('users', { keyPath: 'id' })
        }
        if(!idb.objectStoreNames.contains('merchants')){
          idb.createObjectStore('merchants', { keyPath: 'id' })
        }
        if(!idb.objectStoreNames.contains('orders')){
          idb.createObjectStore('orders', { keyPath: 'id' })
        }
      }
      req.onsuccess = (e)=>{ db = e.target.result; resolve(db) }
      req.onerror = (e)=> reject(e.target.error)
    })
  }

  function tx(storeName, mode='readonly'){
    return openDB().then(database=> database.transaction(storeName, mode).objectStore(storeName) )
  }

  function getAll(storeName){
    return tx(storeName).then(store=> new Promise((res,rej)=>{
      const req = store.getAll()
      req.onsuccess = ()=> res(req.result)
      req.onerror = ()=> rej(req.error)
    }))
  }

  function get(storeName, key){
    return tx(storeName).then(store=> new Promise((res,rej)=>{
      const req = store.get(key)
      req.onsuccess = ()=> res(req.result)
      req.onerror = ()=> rej(req.error)
    }))
  }

  function put(storeName, value){
    return openDB().then(db=>{
      return new Promise((res,rej)=>{
        const tx = db.transaction(storeName,'readwrite')
        const store = tx.objectStore(storeName)
        const req = store.put(value)
        req.onsuccess = ()=> res(req.result)
        req.onerror = ()=> rej(req.error)
      })
    })
  }

  function add(storeName, value){
    return openDB().then(db=>{
      return new Promise((res,rej)=>{
        const tx = db.transaction(storeName,'readwrite')
        const store = tx.objectStore(storeName)
        const req = store.add(value)
        req.onsuccess = ()=> res(req.result)
        req.onerror = ()=> rej(req.error)
      })
    })
  }

  function remove(storeName, key){
    return openDB().then(db=> new Promise((res,rej)=>{
      const tx = db.transaction(storeName,'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.delete(key)
      req.onsuccess = ()=> res()
      req.onerror = ()=> rej(req.error)
    }))
  }

  // export API
  global.NOVA_DB = {
    init: openDB,
    getAll,
    get,
    put,
    add,
    remove
  }
})(window);
