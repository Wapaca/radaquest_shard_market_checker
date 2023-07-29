import { safeAtomicFetch } from './utils/atomicapihelper.js'
import { delay } from './utils/utils.js'

const fetchAllShardSales = async (params = {}, rows = []) => {
  const page = (params.page !== undefined) ? params.page :  1
  const limit = (params.limit !== undefined) ? params.limit :  100
  const req = 'atomicmarket/v2/sales?state=1'+
    '&max_assets=1'+
    '&symbol=WAX'+
    '&collection_name=radaquesttcg'+
    '&schema_name=shard'+
    '&page='+ page +
    '&limit='+ limit +
    '&order=desc&sort=created'

  //console.log(req, 'fetchAllShardSales')

  const data = await safeAtomicFetch(req)
  rows = rows.concat(data)

  if(data.length === limit) {
    await delay(1000)
    return fetchAllShardSales({page: page+1, limit: limit}, rows)
  }
  else
    return rows
}

const parseAssetName = (asset_name) => {
  //  name: 'Eidaes (1/3)',
  const split = asset_name.split('(')
  let part_num = split[1].split('/')
  part_num[0] = 1*part_num[0]
  part_num[1] = 1*(part_num[1].slice(0, -1))
  return {
    name: split[0].trim(),
    num: part_num[0],
    max: part_num[1]
  }
}

const associateSalesToGameArt = (sales) => {
  // gameart_name => sales[]
  let associatedShardSales = {}
  for(const sale of sales) {
    const currentSale = { price: sale.price, assets: [] }
    
    for(const sale_asset of sale.assets.filter(a => a.schema.schema_name === 'shard'))
      currentSale.assets.push(parseAssetName(sale_asset.name))

    if(currentSale.price.token_symbol === 'WAX' && 'eosio.token' === currentSale.price.token_contract) {
      for(let i = 0; i < currentSale.assets.length; ++i) {
        if(associatedShardSales[currentSale.assets[i].name] === undefined)
          associatedShardSales[currentSale.assets[i].name] = []

        currentSale.assets[i].price_amount = 1*currentSale.price.amount/currentSale.assets.length
        
        associatedShardSales[currentSale.assets[i].name].push(currentSale.assets[i])
      }
    }
    else {
      console.log(currentSale, 'Price is not WAX')
    }
  }

  return associatedShardSales
}

const filterCompleteGameArt = (associatedShardSales) => {
  let ret = {}
  for(const name of Object.keys(associatedShardSales)) {
    const max = associatedShardSales[name][0].max
    let isValid = true
    for(let i = 1; i <= max; ++i)
      if(associatedShardSales[name].filter(a => a.num === i).length === 0)
        isValid = false

    if(isValid)
      ret[name] = associatedShardSales[name]
  }
  return ret
}

const getCheapestAssetPrice = (assets, num_part) => {
  assets = assets.filter(a => a.num === num_part)
  assets.sort((a, b) => a.price_amount - b.price_amount)

  return assets[0].price_amount
}

const main = async () => {
  const shardSales = await fetchAllShardSales()
  let associatedShardSales = associateSalesToGameArt(shardSales)
  associatedShardSales = filterCompleteGameArt(associatedShardSales)

  for(const name of Object.keys(associatedShardSales) ) {
    let total = 0
    for(let i = 1; i <= associatedShardSales[name][0].max; ++i) {
      total += getCheapestAssetPrice(associatedShardSales[name], i)
    }

    console.log(name+' total price '+total/Math.pow(10, 8)+' WAX')
  }
} 

main();