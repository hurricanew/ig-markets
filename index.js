var IG = require('./lib/ig');
const stringify = require('csv-stringify');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
var ig = new IG(
  process.env.DEMO_API_KEY,
  process.env.DEMO_USERNAME,
  process.env.DEMO_PASSWORD,
        true
);
var totalPool = [];
var index = 1;
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
        totalPool = totalPool.concat(processedPrices);
        if(totalPool.length === 10){
          saveCSV(totalPool, index);
          index++;
          totalPool = [];
        }
      }else{
        console.error('api failed')
      }
    }) ;
  })
  
  
}
function saveCSV(data, index=1){
  stringify(data, {
      header: true
    }, function(err, output) {
      fs.writeFile(`${path.join(__dirname, 'csv')}/data-pattern-${index}.csv`, output, 'utf8', function(err) {
        if (err) {
          console.log('Some error occured - file either not saved or corrupted file saved.');
        }
      });
    });
}
getPrices();
setInterval(getPrices, 600000);