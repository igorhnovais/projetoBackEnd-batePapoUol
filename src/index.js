import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';


const app = express();
app.use(cors());
app.use(express.json()); 



const mongoClient = new MongoClient("mongodb://localhost:27017"); // conectando a porta do mongo
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("batePapoUol") // conectando ao data base, onde vão ter as collections 
})



app.post("/participants", (req, res) => {

    const {name} = req.body;

    if(!name || name === "" || name === Number){
        return res.sendStatus(422);
    }

    const user = {name}

    db.collection("user").insertOne(user)
    .then(res.sendStatus(201))
    .catch(res.sendStatus(500)) // inserindo o nome no mongo
});

app.get("/participants", (req, res) => {
    db.collection("user").find().toArray().then(user => {
        res.send(user)
    }).catch(res.send("erro no banco de dados"));
});



app.listen (5000, () => {
    console.log("server running in port 5000")
})