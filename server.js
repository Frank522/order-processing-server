const express = require('express');
const http = require('http');
const app = express();

const port = process.env.PORT || 3002;

var bodyParser = require('body-parser');
// create application/json parser
var jsonParser = bodyParser.json();

const cors = require('cors');
const fetch = require('node-fetch');
app.use(cors({
    origin: '*'
}));
fetch('https://cse5234-order-microservice.herokuapp.com/', {
  mode: 'cors',
  credentials: 'include'
})
app.post('/*', jsonParser, async function (req, res) {
    console.log('Got body:', req.body);
    let cart = req.body.product;

   http.get('https://cse5234-inventory-microservice.herokuapp.com/', response => {
        let data = [];
        const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
        console.log('Status Code:', res.statusCode);
        console.log('Date in Response header:', headerDate);

        response.on('data', chunk => {
            data.push(chunk);
        });

        response.on('end', () => {
            console.log('Response ended: ');
            const inventory = JSON.parse(Buffer.concat(data).toString());
            let i, j;
            for(i = 0; i < cart.length; i++){
                for(j = 0; j < inventory.length; j++){
                    if(cart[i].id == inventory[j].id){
                        console.log("comparing", cart[i].name, cart[i].quantity, "and", inventory[j].name, inventory[j].inventory);
                        if(cart[i].quantity > inventory[j].inventory){
                            // res.status(403);
                            res.status(403);
                            res.send();
                            // return;
                        }
                        break;
                    }
                }
            }
            console.log(inventory);
            res.status(200);
            res.send();
        });
        return;
    }).on('error', err => {
        console.log('Error: ', err.message);
    });

    // res.status(200);
    // res.send();
});

var server = app.listen(port, function () {
    var host = server.address().address
    var port = server.address().port
    console.log(`Example app listening at ${host}:${port}`)

});