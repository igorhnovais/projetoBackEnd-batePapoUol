import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); 

const time = dayjs().format("HH:mm:ss");

const mongoClient = new MongoClient(process.env.MONGO_URI); // conectando a porta do mongo
await mongoClient.connect();
    
const db = mongoClient.db("batePapoUol"); // conectando ao data base, onde vão ter as collections
const users = db.collection("users");
const messages = db.collection("messages");


app.post("/participants",  async (req, res) => {

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

    try{
        await messages.insertOne(msg); // inserindo a mensagem no mongo
        await users.insertOne(user); // inserindo o nome no mongo
        res.sendStatus(201);

    } catch (err) {
        res.status(500).send('Server not running');
    }
});

app.get("/participants", async (req, res) => {
    try{
        const user = await users.find().toArray();
        res.send(user)
    } catch (err){
        res.status(500).send('Server not running');
    }
    
});

app.post("/messages", async (req,res) => {

    const {to, text, type} = req.body;
    const {user} = req.headers;

    const verifyType = ("message" || "private_message");
    const verifyFrom = users.find(atualUser => atualUser.name === user);

    if(!to || !text || !verifyType || !verifyFrom){
        return res.sendStatus(422);
    }

    const messageCreated = {
        from: user,
        to,
        text,
        type,
        time
    }

    try{
        await messages.insertOne(messageCreated);
        res.sendStatus(201);
    } catch (err){
        res.status(500).send('Server not running');
    }
});

app.get("/messages", async (req, res) => {

    const {user} = req.header

    let limit = parseInt(req.query.limit);
    limit = (limit > 0) ? limit : 0;

    try{
        const message = await messages
        .find({$or: [{user}, {"type": "message"}, {"to": user}, {"to": "Todos"}]})
        .skip(messages.count() - limit)
        .toArray();

        res.send(message);
    } catch(err){
        res.status(500).send('Server not running');
    }    
});

app.post("/status", (req, res) => {
    const {User} = req.header



    if(!User){
        return res.sendStatus(404)
    }

    res.sendStatus(200);

});

setInterval( async () => {
    try{
        const arr = await users.find().toArray();
            
        for(let i = 0; i < arr.length; i++){
            const verify = Date.now() - arr[i].lastStatus;
            
            if(verify >= 10000){
                const msg = {
                    from: arr[i].name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time
                };

                await messages.insertOne(msg);
                await users.deleteOne(arr[i]);
            }
        }
    } catch (err){
        res.status(500).send('Server not running');
    }

}, 15000)


app.listen (5000, () => {
    console.log("server running in port 5000")
});