import {delay, shuffleArray} from './utils.js'
import axios from 'axios';

const min_delay = 1000 // min_delay before doing request on same endpoint

let endpoints = shuffleArray([
  {url: 'https://aa.dapplica.io/', lastusage: 0},
  {url: 'https://wax-atomic-api.eosphere.io/', lastusage: 0},
  {url: 'https://wax-aa.eu.eosamsterdam.net/', lastusage: 0},
  {url: 'https://wax.blokcrafters.io/', lastusage: 0},
  {url: 'https://atomic-wax-mainnet.wecan.dev/', lastusage: 0},
])

export const safeAtomicFetch = async(req) => {
  endpoints.sort((a, b) => a.lastusage - b.lastusage)
  const now = Date.now()

  if(now - endpoints[0].lastusage < min_delay)
    await delay(min_delay - now + endpoints[0].lastusage)

  try {
    const res = await axios.get(endpoints[0].url + req)
    endpoints[0].lastusage = now
    return res.data.data;
  }
  catch(e) {
    console.warn(e)
    console.info('Retry with another endpoint')
    endpoints[0].lastusage = now
    return await safeAtomicFetch(req)
  }
}