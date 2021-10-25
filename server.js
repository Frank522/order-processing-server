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
const PaymentQuery = "INSERT INTO PaymentInfo VALUES ($1, $2, $3, $4);";
const OrderQuery = "INSERT INTO orders VALUES ($1, $2, $3, $4)";
const PlantsQuery = "INSERT INTO plant_orders ($1, $2, $3, $4)";

async function insertShipping(request, response) {
  let shipping = request.body.shipping;
  client.query(
    ShippingQuery,
    [
      shipping.id,
      shipping.name,
      shipping.address,
      shipping.city,
      shipping.state,
      shipping.zipcode,
      shipping.email,
      shipping.shipping_method,
      shipping.shipping_method2,
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

  client.query(
    PaymentQuery,
    [
      payment.id,
      payment.creditCardNumber,
      payment.expirationDAte,
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
  client.query(
    OrderQuery,
    [
      request.body.id,
      date.toString(),
      request.body.payment.id,
      request.body.shipping.id,
    ],
    (err, res) => {
      if (err) throw err;
      console.log(res);
      client.end();
    }
  );
}

async function insertPlants(request, response) {
  for (item in request.body.product)
    client.query(
      PlantsQuery,
      [request.body.id, item.id, item.quantity],
      (err, res) => {
        if (err) throw err;
        console.log(res);
        client.end();
      }
    );
}

async function checkInventory(request, result) {
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

app.post(
  "/OrderMicroservice/Order",
  jsonParser,
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
