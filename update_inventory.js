#! /app/.heroku/node/bin/node
const { Client } = require("pg");

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
client.connect(); 
client.query(
        'SELECT plant_id, SUM(quantity_purchased)' + 
        'FROM plant_orders po' + 
        'LEFT JOIN orders o ON po.order_id = o.id' +
        'WHERE o.order_date > NOW() - INTERVAL \'24 HOURS\';',
        (err, res) => {
            if (err) throw err;
            result.jsonp(res.rows);
          });
axios({
    method: 'post',
    url: 'https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update',
    headers: { "Content-Type": "application/json" },
    data: {
            products: request.body.product
        }
})
.then(function (response) {
    //handle success, exit afterward
    console.log(response);
    process.exit();
  })
  .catch(function (response) {
    //handle error, exit afterward
    console.log(response);
    process.exit();
  });

// timeout if the call doesn't finish in 20 seconds
setTimeout(() => {process.exit()}, 20000);