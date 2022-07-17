import { Model, ModelStatic, Sequelize } from 'sequelize';
import LRUCache = require('lru-cache');

declare type CacheKey = string | number;
export interface CacheExtraOptions<M, CacheValue = M> {
  /** 获取缓存 Key */
  getCacheKey: (m: M) => CacheKey;
  /** 获取缓存 Value */
  getCacheValue?: (m: M) => CacheValue;
}

const AllDBCacheMaps = [] as Array<LRUCache<Sequelize, any>>;

export function createModelCache<M extends Model, CacheValue = M>(
  ModelClass: ModelStatic<M>,
  oneDBCacheOptions?: LRUCache.Options<CacheKey, CacheValue> & CacheExtraOptions<M, CacheValue>,
) {
  const { getCacheKey, getCacheValue, ...lruCacheOption } = oneDBCacheOptions;

  const dbCacheMap = new LRUCache<Sequelize, LRUCache<CacheKey, CacheValue>>({
    max: 1000,
    maxAge: 1000 * 60 * 60 * 3,
  });
  AllDBCacheMaps.push(dbCacheMap);

  function delCacheWithInstance(instance: M) {
    if (!instance) return;
    const cache = dbCacheMap.peek(instance.sequelize);
    if (cache != null) {
      cache.del(getCacheKey(instance));
    }
  }
  function delCacheWithDB(db: Sequelize) {
    dbCacheMap.del(db);
  }

  const originInit = ModelClass.init;
  ModelClass.init = function (...args) {
    const ChildModelClass = this as any as typeof ModelClass;
    const [_, options] = args;
    try {
      return originInit.call(this, ...args);
    } finally {
      ChildModelClass.afterSave(delCacheWithInstance);
      ChildModelClass.afterFind((instances, options) => {
        if (options.transaction) return; // 忽略事务中的查询
        instances = [].concat(instances).filter(Boolean);
        const db = instances[0]?.sequelize;
        let cache = dbCacheMap.peek(db);
        if (!cache) {
          cache = new LRUCache<CacheKey, CacheValue>(lruCacheOption);
          dbCacheMap.set(db, cache);
        }
        instances.forEach((i) => cache.set(getCacheKey(i), getCacheValue ? getCacheValue(i) : (i as any as CacheValue)));
      });
      ChildModelClass.afterDestroy(delCacheWithInstance);
      ChildModelClass.afterBulkCreate((instances) => {
        if (!instances) return;
        // create 也需要清除缓存：如果设置了 getCacheKey，可能会和创建的 instance key 相同，需要清除缓存数据
        instances.forEach(delCacheWithInstance);
      });

      // 批量删除和更新场景无法追溯变化实例，清理 db 下全部缓存
      ChildModelClass.afterBulkDestroy(() => delCacheWithDB(options.sequelize));
      ChildModelClass.afterBulkUpdate(() => delCacheWithDB(options.sequelize));
    }
  };

  function getCacheTotalLength() {
    let length = 0;
    dbCacheMap.values().forEach((c) => (length += c.length));
    return length;
  }
  function getCacheTotalItemCount() {
    let itemCount = 0;
    dbCacheMap.values().forEach((c) => (itemCount += c.itemCount));
    return itemCount;
  }

  return {
    getInCache(db: Sequelize, cacheKey: CacheKey): CacheValue {
      const cache = dbCacheMap.peek(db);
      if (cache != null) return cache.get(cacheKey);
    },
    setInCache(db: Sequelize, cacheKey: CacheKey, cacheValue: CacheValue) {
      let cache = dbCacheMap.peek(db);
      if (!cache) {
        cache = new LRUCache<CacheKey, CacheValue>(lruCacheOption);
        dbCacheMap.set(db, cache);
      }
      cache.set(cacheKey, cacheValue);
    },
    delInCache(db: Sequelize, cacheKey: CacheKey) {
      let cache = dbCacheMap.peek(db);
      if (cache) {
        cache.del(cacheKey);
      }
    },
    getAllCachedValue(db: Sequelize): CacheValue[] {
      const cache = dbCacheMap.peek(db);
      return cache?.values() || [];
    },
    get length() {
      return getCacheTotalLength();
    },
    get itemCount() {
      return getCacheTotalItemCount();
    },
  };
}

export function clearAllModelCache(db: Sequelize) {
  AllDBCacheMaps.forEach((item) => {
    item.del(db);
  });
}
