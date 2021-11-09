#! /app/.heroku/node/bin/node
const { Client } = require("pg");
const axios = require('axios');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
client.connect(); 
let data = [];
client.query(
        'SELECT po.plant_id, SUM(po.quantity_purchased) ' + 
        'FROM plant_orders po ' + 
        'LEFT JOIN "orders" "o" ON po.order_id = o.id ' +
        'WHERE o.order_date > NOW() - INTERVAL \'24 HOURS\' ' +
        'GROUP BY "po".plant_id;',
        (err, res) => {
            if (err) throw err;
            for (let row of res.rows) {
              data.push({id: row.plant_id, quantity: row.sum});
            }
            axios({
              method: 'post',
              url: 'https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update',
              headers: { "Content-Type": "application/json" },
              data: {
                      products: data
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
          });
// timeout if the call doesn't finish in 20 seconds
setTimeout(() => {process.exit()}, 20000);