var IG = require('./lib/ig');
const stringify = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
require('dotenv').config();
var ig = new IG(
  process.env.DEMO_API_KEY,
  process.env.DEMO_USERNAME,
  process.env.DEMO_PASSWORD,
        true
);
var totalPool = [];
var index = 1;
var lastBreakDate = '';
const INTERVAL_IN_MIN = 30;
const POOL_SIZE = 200;
const LAST_N = 10;
let csvIndex=1;
//define break out, delta > BREAK_OUT_RATIO * AVERAGE
const BREAK_OUT_RATIO = 3;
const getPrices = ()=>{
  console.log()
  ig.login().then(function(data){
  
    ig.cst = data.res.headers['cst'];
    ig.token = data.res.headers['x-security-token'];
  
    ig.prices('CS.D.EURUSD.MINI.IP').then((data)=>{
      if(data && !data.errorCode){
       const processedPrices = data.prices.map(price => {return {
          date: price.snapshotTime.split('/').join('').split(':').join('').split(' ').join(''),
          open: price.openPrice.bid,
          high: price.highPrice.bid,
          low: price.lowPrice.bid,
          close: price.closePrice.bid,
          delta: Number(Math.abs((price.openPrice.bid-price.closePrice.bid)).toFixed(6))
        }});
        console.log('prices', processedPrices);
        console.log('bars', totalPool.length);
        if(totalPool.length>=POOL_SIZE){
          //remove eldest 10 bars then add 10 new
          totalPool.splice(10);
        }
        totalPool = totalPool.concat(processedPrices);
        if(totalPool.length >= POOL_SIZE){
          generatePattern(totalPool);
          saveCSV(totalPool, index, 'raw');
          index++;
        }
      }else{
        console.error('api failed')
      }
    }) ;
  })
  
  
}
function saveCSV(data, index=1, type){
  stringify(data, {
      header: true
    }, function(err, output) {
      fs.writeFile(`${path.join(__dirname, 'csv')}/data-${type}-${index}.csv`, output, 'utf8', function(err) {
        if (err) {
          console.log('Some error occured - file either not saved or corrupted file saved.');
        }
      });
    });
}
function generatePattern(pool){
  let lastNItems = [];
  for(var i=0;i<pool.length;i++){
      if(lastNItems.length===LAST_N){
         const AVGN = _.meanBy(lastNItems, 'delta');
         const Range = _.maxBy(lastNItems, 'high').high - _.minBy(lastNItems, 'low').low;
         if(pool[i].delta > BREAK_OUT_RATIO * AVGN && pool[i].delta > Range){
           pool[i].break = 1;
           reverted = 0;
          const MODE = pool[i].open > pool[i].close ? 'DESC': 'ASC';
           let targetOpen = pool[i].open;
           let targetClose = pool[i].close;
           let targetDelta = pool[i].delta;
           for(k = i+1; k< pool.length;k++){
            if((pool[k].close > targetClose && MODE === 'ASC') || (pool[k].close < targetClose && MODE === 'DESC')){
              // keep going up/down, nullify pattern
              break;
              //weak revert
            }else if((pool[k].close > targetOpen && MODE === 'DESC' && pool[k].close<(targetOpen+targetDelta)) || (pool[k].close < targetOpen && MODE === 'ASC' && pool[k].close>(targetOpen-targetDelta))){
              //open condition met
              if(!lastBreakDate || pool[k].date !== lastBreakDate){
                console.log(`revert break happened, revert break date is ${lastBreakDate}`)
                lastBreakDate = pool[k].date;
                saveCSV(pool, csvIndex, 'break');
                csvIndex++;
              }
             
      
                
            }
           }
         }
         lastNItems.shift();
      }
      lastNItems.push(pool[i]);
  }
}

function processForInterval(prices, numOfBars) {
  let consolidatedData = [];
  let index = 0;
  while (prices.length > 0) {
    let chunk=[];
    targetDate = +prices[0].date + numOfBars*100;
  while(prices[0] && prices[0].date && +prices[0].date<targetDate){
     item = prices.splice(0,1);
     chunk = [...chunk, ...item];
  } 
    index++;
    consolidatedData.push({
      date: chunk[0].date,
      open: chunk[0].open,
      high: _.maxBy(chunk, 'high').high,
      low: _.minBy(chunk, 'low').low,
      close: chunk[chunk.length-1].close,
      delta: Math.abs(chunk[0].open-chunk[chunk.length-1].close),
      index: index,
      break: 0,
      revert: 0,
      win: 0,
      lose: 0
    });
  }
  return consolidatedData;
}

getPrices();
setInterval(getPrices, 600000);