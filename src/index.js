import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';


const userSchema = joi.object({
    name: joi.string().required()
});

const msgSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()   
});

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); 


const mongoClient = new MongoClient(process.env.MONGO_URI); // conectando a porta do mongo
await mongoClient.connect();
    
const db = mongoClient.db("batePapoUol"); // conectando ao data base, onde vão ter as collections
const users = db.collection("users");
const messages = db.collection("messages");


app.post("/participants",  async (req, res) => {

    const nameBody = req.body;

    const { error } = userSchema.validate( nameBody, {abortEarly: false});

    if(error){
        const errors = error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const verify = await users.findOne({name: nameBody.name});

    if(verify){
        return res.status(409).send("Usuario já cadastrado");
    }

    const user = {
        name: nameBody.name, 
        lastStatus: Date.now()
    };

    const msg = {
        from: nameBody.name, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time:dayjs().format("HH:mm:ss")
    };

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
        res.send(user);
    } catch (err){
        res.status(500).send('Server not running');
    }
    
});

app.post("/messages", async (req,res) => {

    const msg = req.body;
    const {user} = req.headers;

    const {error} = msgSchema.validate(msg, {abortEarly: false});

    if(error){
        const errors = error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const part = await users.find({ name: user }).toArray();
    const verifyUser = part.length <= 0 ? true : false;

    if(verifyUser){
        return res.sendStatus(422);
    }

    const messageCreated = {
        from: user,
        to: msg.to,
        text: msg.text,
        type: msg.type,
        time:dayjs().format("HH:mm:ss")
    };

    try{
        await messages.insertOne(messageCreated);
        res.sendStatus(201);
    } catch (err){
        res.status(500).send('Server not running');
    }
});

app.get("/messages", async (req, res) => {

    const {user} = req.headers;

    let limit = parseInt(req.query.limit);
    limit = (limit > 0) ? limit : 0;

    try{
        const message = await messages
        .find({$or: [{"from":user}, {"type": "message"}, {"to": user}, {"to": "Todos"}]})
        .toArray();

        const filtered = [];
        for (let i = message.length - limit; i < message.length; i++){
            filtered.push(message[i]);
        };
        res.send(filtered);

    } catch(err){
        res.status(500).send('Server not running');
    }    
});

app.post("/status", async (req, res) => {
    const {user} = req.headers;

    const lastStatus = { $set: {lastStatus: Date.now()}};

    try{
        const part = await users.find({name: user}).toArray();

        if(part.length === 0){
            return res.sendStatus(404);
        }

        users.updateOne({name: user}, lastStatus);

        res.sendStatus(200);
    } catch (err){
        res.status(500).send('Server not running');
    }
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
                    time:dayjs().format("HH:mm:ss")
                };

                await messages.insertOne(msg);
                await users.deleteOne(arr[i]);
            }
        }
    } catch (err){
        res.status(500).send('Server not running');
    }

}, 15000);


app.listen (5000, () => {
    console.log("server running in port 5000")
});