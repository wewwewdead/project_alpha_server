import express from 'express'
import cors from 'cors';
import router from './routes/router.js';
import dotenv from 'dotenv';


const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin:'*',
    methods:'GET,POST,PUT,DELETE',
    credentials: true
}))

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(router)

app.get('/', (req, res) =>{
    res.send('SERVER IS WORKING' )
})

app.listen(PORT, () =>{
    console.log(`server is running at ${PORT}`)
})