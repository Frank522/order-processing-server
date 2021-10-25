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

const ShippingQuery =
  "INSERT INTO shippingInfo VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);";
const PaymentQuery = "INSERT INTO paymentInfo VALUES ($1, $2, $3, $4);";
const OrderQuery = "INSERT INTO orders VALUES ($1, $2, $3, $4)";
const PlantsQuery = "INSERT INTO plant_orders ($1, $2, $3, $4)";

async function insertShipping(request, response) {

  let shipping = request.body.shipping;
  console.log("Inserting Shipping\n");
  client.query(
    ShippingQuery,
    [
      Math.round(shipping.id),
      shipping.address,
      shipping.city,
      shipping.state,
      shipping.zipcode,
      shipping.email,
      shipping.shipping_method,
      shipping.shipping_method2,
      shipping.name
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      client.end();
    }
  );
}

async function insertPayment(request, response) {
  let payment = request.body.cart;
  console.log("Inserting Payment\n");
  client.query(
    PaymentQuery,
    [
      Math.round(payment.id),
      payment.creditCardNumber,
      payment.expirationDate,
      payment.cvvCode,
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      client.end();
    }
  );
}

async function insertOrder(request, response) {
  const date = new Date();
  console.log("Inserting Order\n");
  client.query(
    OrderQuery,
    [
      Math.round(request.body.id),
      date.toString(),
      Math.round(request.body.payment.id),
      Math.round(request.body.shipping.id),
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      client.end();
    }
  );
}

async function insertPlants(request, response) {
  console.log("Inserting Plants\n");
  for (item in request.body.product) {
    client.query(
      PlantsQuery,
      [Math.round(request.body.id), item.id, item.quantity],
      (err, res) => {
        if (err) throw err;
        console.log(res);
        client.end();
      }
    );
  }
  client.end();
}

async function checkInventory(request, result, next) {
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
          const inventory = JSON.parse(data);
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
                  inventory[j].quantity
                );
                if (cart[i].quantity > inventory[j].quantity) {
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
    next();
}

async function updateInventory(request, result) {
  console.log("Got body:", request.body);
  http.post(
    "https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update",
    async function () {
        //TODO: for each plant update the inventory count, 
        //create functionality in Inventory microservice to do that as well
    }
  );
}

app.post(
  "/OrderMicroservice/Order",
  jsonParser, //method changes from POST to OPTIONS if removed
  checkInventory,
  insertShipping,
  insertPayment,
  insertOrder,
  insertPlants,
  updateInventory
);

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log(`Example app listening at ${host}:${port}`);
});
