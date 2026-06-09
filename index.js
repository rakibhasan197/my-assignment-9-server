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
  new URL(`${process.env.CLIENT_URl}/api/auth/jwks`)
)

const verifyToken = async (req, res, next)=> {
       const authHeader = req?.headers.authorization
       if(!authHeader){
        return res.status(401).json({ message: "Unauthorized" });
       }
       const token = authHeader.split(" ")[1]
       if(!token){
        return res.status(401).json({ message: "You Are Not Authorized Person" });
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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("ideaVault");
    const ideasCollection = db.collection("ideas");
    const commentsCollection = db.collection("comments");


app.get("/ideas", async (req, res) => {
  const { search, category } = req.query;

  let query = {};


  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  if (category) {
    query.category = {
      $regex: `^${category}$`,
      $options: "i",
    };
  }

  const ideas = await ideasCollection.find(query).toArray();
  res.send(ideas);
});

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
    return res.status(400).send({ message: "must be userEmail is required" });
  }

  const newIdea = {
    ...idea,
    createdAt: new Date(),
  };

  const result = await ideasCollection.insertOne(newIdea);
  res.send(result);
});

app.get('/comments', verifyToken, async (req, res) => {
  const comments = await commentsCollection.find().toArray();
  res.send(comments);
});

    app.get('/comments/:ideaId', async (req, res) => {
  const { ideaId } = req.params;

  const comments = await commentsCollection
    .find({ ideaId })
    .sort({ createdAt: -1 })
    .toArray();

  res.send(comments);
});


app.get("/my-ideas", verifyToken, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  const result = await ideasCollection
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});


    app.post('/comments', async (req, res)=>{
      const comment = req.body;
      console.log(comment);
      const result = await commentsCollection.insertOne(comment);
      res.send(result);
    })


    app.patch('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const result = await commentsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { comment} }
  );
  res.send(result);
});



  app.delete('/comments/:id', async (req, res)=>{
    const {id} = req.params;
    const result = await commentsCollection.deleteOne({_id: new ObjectId(id)});
    res.send(result);
  })

    

    // await client.db("admin").command({ ping: 1 });


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