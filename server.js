const express = require("express");
const http = require("https");
const app = express();
const request = require('request');
const axios = require('axios');
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


async function insertShipping(request, response) {
  client.connect(); 
  let shipping = request.body.shipping;
  client.query(
    'INSERT INTO shippinginfo (id,address,city,state,zipcode,email,shipping_method1,name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
    [
      shipping.id,
      shipping.address,
      shipping.city,
      shipping.state,
      shipping.zipCode,
      shipping.email,
      shipping.shipping_method,
      shipping.name,
    ],
    (err, res) => {
      if (err) throw err;
      console.log(err,res);
      //client.end();
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
      //client.end();
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
      //client.end();
    }
  );
}

async function insertPlants(request, response) {
  request.body.product.forEach(item => {
    client.query(
      'INSERT INTO plant_orders(order_id,plant_id,quantity_purchased) VALUES ($1, $2, $3);',
      [request.body.id, item.id, item.quantity],
      (err, res) => {
        if (err) throw err;
        console.log(res);
        //client.end();
      });
  })
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
  console.log("Got body in updateInventory:", request.body.product);
  axios({
    method: 'post',
    url: 'https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update',
    headers: { "Content-Type": "application/json" },
    data: {
      products: request.body.product
        }
  })
  .then(function (response) {
    //handle success
    console.log(response);
  })
  .catch(function (response) {
    //handle error
    console.log(response);
  });
}


async function ToPayment(request, res) {
  // console.log("Got body:", request.body);
  axios({
    method: 'post',
    url: 'https://cse5234-payment-microservice.herokuapp.com/PaymentMicroservice/Payment',
    headers: { "Content-Type": "application/json" },
    data: {
      payment: request.body.payment,
      entity: "Garden",
      businessAccount: "01123456699549388345"
    }
  })
  .then(function (response) {
    //handle success
    console.log("got payment response", response.data);
    client.query(
      'UPDATE paymentinfo SET comfimation = ($1) WHERE id = ($2);',
      [response.data.confirm, response.data.id],
      (err, res) => {
        if (err) throw err;
        console.log(res);
        //client.end();
      }
    );
  })
  .catch(function (response) {
    //handle error
    // console.log(response);
  });
}

async function ToShipping(request, result) {
  axios({
    method: 'post',
    url: 'https://cse5234-payment-microservice.herokuapp.com/ShippingMicroservice/Shipping',
    headers: { "Content-Type": "application/json" },
    data: {
      shipping: request.body.shipping,
      entity: "Garden",
      msg: "Garden initiate the Shipping Process"
    }
  })
  .then(function (response) {
    //handle success
  })
  .catch(function (response) {
    //handle error
    // console.log(response);
  });
}
app
.route("/OrderMicroservice/Order")
.post(
  jsonParser,
  function(req, res) {
    checkInventory(req, res);
    insertShipping(req, res);
    insertPayment(req, res);
    insertOrder(req, res);
    insertPlants(req, res);  
    updateInventory(req, res);
    ToPayment(req,res);
    ToShipping(req,res);
  }
)

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log(`Example app listening at ${host}:${port}`);
});
