import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs'
import "dayjs/locale/pt-br.js ";


const app = express();
app.use(cors());
app.use(express.json()); 

const time = dayjs().locale("pt-br").format("HH:MM:SS")


const mongoClient = new MongoClient("mongodb://localhost:27017"); // conectando a porta do mongo
let db; 
mongoClient.connect().then(() => {
    db = mongoClient.db("batePapoUol") // conectando ao data base, onde vão ter as collections 
})


app.post("/participants", (req, res) => {

    const {name} = req.body;

    if(!name || name === Number){
        return res.sendStatus(422);
    }

    const user = {
        name, 
        lastStatus: Date.now()
    };

    const msg = {
        from: name, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time
    }

    db.collection("messages").insertOne(msg); // inserindo a mensagem no mongo

    db.collection("users").insertOne(user)
    .then(res.sendStatus(201)); // inserindo o nome no mongo
});

app.get("/participants", (req, res) => {
    db.collection("users").find().toArray()
    .then(user => {
        res.send(user)
    });
});

app.post("/messages", (req,res) => {

    const {to, text, type} = req.body;
    const {User} = req.header;

    const verifyType = ("message" || "private_message");
    const verifyFrom = (users.find(user => user.name === User));

    if(!to || !text || !verifyType || !verifyFrom){
        return res.sendStatus(422);
    }

    const messageCreated = {
        from: User,
        to,
        text,
        type,
        time
    }

    db.collection("messages").insertOne(messageCreated)
    .then(res.sendStatus(201))
    .catch(res.sendStatus(500));
});

app.get("/messages", (req, res) => {
    db.collection("messages").find().toArray()
    .then(message => {
        res.send(message)
    });
});

app.post("/status", (req, res) => {
    const {User} = req.header

    if(!User){
        return res.sendStatus(404)
    }

    res.sendStatus(200);

});


app.listen (5000, () => {
    console.log("server running in port 5000")
});