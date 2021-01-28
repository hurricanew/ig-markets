var IG = require('./lib/ig');
var ig = new IG(
        process.env.IG_KEY,
        process.env.IG_IDENTIFIER,
        process.env.IG_PASSWORD,
        true
);
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
    }else{
      console.error('api failed')
    }
  }) ;
})

