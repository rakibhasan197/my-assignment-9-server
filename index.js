const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const app = express()
const PORT = process.env.PORT || 8000;

dotenv.config()
app.use(cors())
app.use(express.json());

// ideaVault GSFFRZSwq45IFPZy
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
)

const verifyToken = async (req, res, next)=> {
       const authHeader = req?.headers.authorization
       if(!authHeader){
        return res.status(401).json({ message: "Unauthorized" });
       }
       const token = authHeader.split(" ")[1]
       if(!token){
        return res.status(401).json({ message: "Unauthorized" });
       }

      try{
         const {payload} = await jwtVerify(token, JWKS)
         console.log(payload)
          next()
      } catch (error){
        return res.status(403).json({ message: "Forbidden" });
      }
       
      
    }


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("ideaVault");
    const ideasCollection = db.collection("ideas");
    const commentsCollection = db.collection("comments");


    app.get('/ideas', async (req, res) =>{
       const ideas = await ideasCollection.find().toArray();
        res.send(ideas);
    })

    app.get('/featured', async (req, res)=>{
      const featuredIdeas = await ideasCollection.find().limit(6);
      const result = await featuredIdeas.toArray();
      res.send(result);
    })
    // middleware

    app.get('/ideas/:id', verifyToken, async (req, res) =>{
       const {id} = req.params;
        const idea = await ideasCollection.findOne({_id: new ObjectId(id)});
        res.send(idea);
    })

  app.post('/ideas', async (req, res) => {
  const idea = req.body;

  if (!idea.userEmail) {
    return res.status(400).send({ message: "userEmail is required" });
  }

  const newIdea = {
    ...idea,
    createdAt: new Date(),
  };

  const result = await ideasCollection.insertOne(newIdea);
  res.send(result);
});


    

    await client.db("admin").command({ ping: 1 });


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})