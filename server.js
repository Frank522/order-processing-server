const express = require("express");
const http = require("https");
const app = express();
var request = require('request');
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


const ShippingQuery =
  "INSERT INTO shippingInfo (id,address,city,state,zipcode,email,shipping_method1,shipping_method2,name)VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);";
const PaymentQuery = "INSERT INTO paymentInfo (id,creditcardnumber,expirationdate,cvvcode)VALUES ($1, $2, $3, $4);";
const OrderQuery = "INSERT INTO orders (id,shippingid,paymentid,order_date)VALUES ($1, $2, $3, $4)";
const PlantsQuery = "INSERT INTO plant_orders(order_id,plant_id,quantity_purchased) VALUES($1, $2, $3)";

async function insertShipping(request, response) {
  client.connect(); 
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
  console.log("Got body:", request.body);
  app.post('/add', function(req, res){
    console.log(req.body);
    request.post(
      {
      url:'https://cse5234-inventory-microservice.herokuapp.com/InventoryMicroservice/Update',
      json: {
        products: request.body.product
          },
      headers: {
          'Content-Type': 'application/json'
      }
      },
    function(error, response, body){
      // console.log(error);
      // console.log(response);
      console.log(body);
      res.send(body);
    });
    // res.send("body");
  });
}


async function ToPayment(request, result) {
  console.log("Got body:", request.body);
  axios.post('/PaymentMicroservice/Payment', {
    payment: request.body.payment,
    entity: "Garden",
    businessAccount: "01123456"
  })
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });
  // app.post('/PaymentMicroservice/Payment', function(req, res){
  //   console.log(req.body);
  //   request.post(
  //     {
  //     url:'https://cse5234-payment-microservice.herokuapp.com/PaymentMicroservice/Payment',
  //     json: {
  //       payment: request.body.payment,
  //       entity: "Garden",
  //       businessAccount: "01123456"
  //     },
  //     headers: {
  //         'Content-Type': 'application/json'
  //     }
  //     },
  //   function(error, response, body){
  //     // console.log(error);
  //     // console.log(response);
  //     console.log(body);
  //     res.send(body);
    // });
    // res.send("body");
  // });
}
async function ToShipping(request, result) {
  console.log("Got body:", request.body);
  app.post('/ShippingMicroservice/Shipping', function(req, res){
    console.log(req.body);
    request.post(
      {
      url:'https://cse5234-payment-microservice.herokuapp.com/ShippingMicroservice/Shipping',
      json: {
        shipping: request.body.shipping, 
      },
      headers: {
          'Content-Type': 'application/json'
      }
      },
    function(error, response, body){
      // console.log(error);
      // console.log(response);
      console.log(body);
      res.send(body);
    });
    // res.send("body");
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
