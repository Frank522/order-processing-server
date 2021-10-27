const express = require("express");
const http = require("https");
const app = express();

const { Client } = require("pg");

const port = process.env.PORT || 3002;

var bodyParser = require("body-parser");
// create application/json parser
var jsonParser = bodyParser.json();

const cors = require("cors");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

app.use(
  cors({
    origin: "*",
  })
);
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
  next();
});


const ShippingQuery =
  "INSERT INTO shippinginfo (id,address,city,state,zipcode,email,shipping_method1,shipping_method2,name)VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);";
const PaymentQuery = "INSERT INTO paymentinfo (id,creditcardnumber,expirationdate,cvvcode)VALUES ($1, $2, $3, $4);";
const OrderQuery = "INSERT INTO orders (id,shippingid,paymentid,order_date)VALUES ($1, $2, $3, $4)";
const PlantsQuery = "INSERT INTO plant_orders(order_id,plant_id,quantity_purchased) VALUES($1, $2, $3)";

async function insertShipping(request, response) {
  let shipping = request.body.shipping;
  client.query(
    'INSERT INTO shippinginfo (id,address,city,state,zipcode,email,shipping_method1,shipping_method2,name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);',
    [
      shipping.id,
      shipping.address,
      shipping.city,
      shipping.state,
      shipping.zipCode,
      shipping.email,
      shipping.shipping_method,
      shipping.shipping_method2,
      shipping.name,
    ],
    (err, res) => {
      if (err) throw err;
      console.log(err,res);
      // client.end();
    }
  );
}

async function insertPayment(request, response) {
  // let payment = request.body.cart;
  let payment = request.body.payment;
  console.log(payment.id);
  console.log(payment.creditCardNumber);
  console.log(payment.expirationDate);
  console.log(payment.cvvCode);
  client.query(
    'INSERT INTO paymentinfo (id,creditcardnumber,expirationdate,cvvcode) VALUES ($1, $2, $3, $4);',
    [
      payment.id,
      payment.creditCardNumber,
      payment.expirationDate,
      payment.cvvCode,
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      // client.end();
    }
  );
}

async function insertOrder(request, response) {
  const date = new Date();
  client.query(
    'INSERT INTO orders (id,shippingid,paymentid,order_date) VALUES ($1, $2, $3, $4);',
    [
      request.body.id,
      request.body.shipping.id,
      request.body.payment.id,
      date.toString(),
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      // client.end();
    }
  );
}

async function insertPlants(request, response) {
  for (item in request.body.product)
    client.query(
      'INSERT INTO plant_orders(order_id,plant_id,quantity_purchased) VALUES ($1, $2, $3);',
      [request.body.id, item.id, item.quantity],
      (err, res) => {
        if (err) throw err;
        console.log(res);
        // client.end();
      }
    );
}

async function checkInventory(request, result) {
  let cart = request.body.product;
  console.log("Got body:", request.body);
  http
    .get(
      "https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Inventory",
      (response) => {
        let data = [];
        const headerDate =
          result.headers && result.headers.date
            ? result.headers.date
            : "no response date";
        console.log("Status Code:", result.statusCode);
        console.log("Date in Response header:", headerDate);

        response.on("data", (chunk) => {
          data.push(chunk);
        });

        response.on("end", () => {
          console.log("Response ended: ");
          const inventory = JSON.parse(Buffer.concat(data).toString());
          let i, j;
          for (i = 0; i < cart.length; i++) {
            for (j = 0; j < inventory.length; j++) {
              if (cart[i].id == inventory[j].id) {
                console.log(
                  "comparing",
                  cart[i].name,
                  cart[i].quantity,
                  "and",
                  inventory[j].name,
                  inventory[j].inventory
                );
                if (cart[i].quantity > inventory[j].inventory) {
                  // result.status(403);
                  result.status(403);
                  result.send();
                  // return;
                }
                break;
              }
            }
          }
          console.log(inventory);
          result.status(200);
          result.send();
        });
        return;
      }
    )
    .on("error", (err) => {
      console.log("Error: ", err.message);
    });
}

async function updateInventory(request, result) {
  console.log("Got body:", request.body);
  http.post(
    "https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update",
    async function (response) {
        //TODO: for each plant update the inventory count, 
        //create functionality in Inventory microservice to do that as well
    }
  );
}

app
.route("/OrderMicroservice/Order")
.post(
  jsonParser,
  insertShipping,
  insertPayment,
  insertOrder,
  insertPlants,
  checkInventory,
)

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log(`Example app listening at ${host}:${port}`);
});
