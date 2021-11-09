#! /app/.heroku/node/bin/node
const { Client } = require("pg");
const axios = require('axios');

const client = new Client({
    connectionString: 'postgres://lnhehewzhikycg:2aa42c3838714543fd7cb5b9814531d2d10216b4621c2b2240aae313f28f1827@ec2-44-195-240-222.compute-1.amazonaws.com:5432/d3rl0qvpau3ccf',//process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
client.connect(); 
let data = [];

// client.query(
//   'SELECT * from "orders"',
//   (err, res) => {
//     if (err) throw err;
//     for (let row of res.rows) {
//       console.log(row);
//     }
//   });
client.query(
        'SELECT po.plant_id, SUM(po.quantity_purchased) ' + 
        'FROM plant_orders po ' + 
        'LEFT JOIN "orders" "o" ON po.order_id = o.id ' +
        'WHERE TO_TIMESTAMP(o.order_date, \'Dy Mon DD YYYY HH24:MI:SS\') > NOW() - INTERVAL \'24 HOURS\' ' +
        'GROUP BY "po".plant_id;',
        (err, res) => {
            if (err) throw err;
            console.log("got", res.rowCount, "rows");
            for (let row of res.rows) {
              data.push({id: row.plant_id, quantity: row.sum});
              console.log({id: row.plant_id, quantity: row.sum});
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