require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId, ObjectID } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const port = 4000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://bookCorner:bookCorner123@cluster0.du7xt.mongodb.net/BookDB?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const run = async () => {
  try {
    const db = client.db("BookDB");
    const bookCollection = db.collection("books");
    const wishListCollection = db.collection("wishList");
    const readingListCollection = db.collection("readingList");

   
    app.get("/books", async (req, res) => {
      const searchTerm = req.query.searchTerm;
      const sort = req.query.sort;
      const limit = parseInt(sort)

      const query = {
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { author: { $regex: searchTerm, $options: "i" } },
          { genre: { $regex: searchTerm, $options: "i" } },
        ],
      };
      let book;
      if(searchTerm){
         const cursor =  bookCollection.find(query);
         book = await cursor.toArray()
      }
      else if(limit){
       
        const cursor =  bookCollection.find().sort({ createdAt: -1 }).limit(limit)
        book = await cursor.toArray()
      }
      else{
         const cursor = bookCollection.find({})
         book = await cursor.toArray()
      }
      
      res.send({ status: true, total: book.length, data: book });
    });
   

    app.get("/book/details/:id", async (req, res) => {
      const id = req.params.id;
      const cursor = bookCollection.find({ _id: ObjectId(id) });
      const book = await cursor.toArray();

      res.send({ status: true, data: book });
    });

    app.post("/comment/:id", async (req, res) => {
      const bookId = req.params.id;
      const comment = req.body.comment;

      console.log(bookId);
      console.log(comment);

      const result = await bookCollection.updateOne(
        { _id: ObjectId(bookId) },
        { $push: { comments: comment } }
      );

      console.log(result);

      if (result.modifiedCount !== 1) {
        console.error("book not found or comment not added");
        res.json({ error: "book not found or comment not added" });
        return;
      }

      console.log("Comment added successfully");
      res.json({ message: "Comment added successfully" });
    });

    app.get("/comment/:id", async (req, res) => {
      const bookId = req.params.id;

      const result = await bookCollection.findOne(
        { _id: ObjectId(bookId) },
        { projection: { _id: 0, comments: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "book not found" });
      }
    });

    // Get current cart items
    app.get("/wishlist", async (req, res) => {
      const cursor = wishListCollection.find({});
      const data = await cursor.toArray();

      res.send({ status: true,  data });
    });

    app.post('/wishlist', async (req, res) => {
      const { title, price, author, image, genre,bookId,wishlistedBy} =
        req.body;
    
      try {
        const isExists = await wishListCollection.findOne({ bookId });
        if(isExists){
          res.status(500).json({ error: 'Book Already in to Wishlist' });
        }else{
        const data = await wishListCollection.insertOne({title, price, author, image, genre,bookId,wishlistedBy});
        console.log(data);
        res.status(201).json(data);
        }
      } catch (error) {
       
          
          res.status(500).json({ error: 'Failed to save data',error });
        
      }
    });
    app.patch("/book/readinglist/:id", async (req, res) => {
      const bookId = req.params.id;
      console.log(req.body);
      
    
      try {
        const isExists = await readingListCollection.findOne({ bookId });
        
        if(isExists){
          const result = await readingListCollection.updateOne(
            { _id: ObjectID(isExists?._id) },
            { $set:  req.body }
          );
    console.log(result);
          res.send({
            msg: "Added to plan to read",
            result,
          });
        }
      } catch (error) {
       
          
          res.status(500).json({ error: 'Failed to save data',error });
        
      }
    });
    app.post('/readinglist', async (req, res) => {
      const { title, price, author, image, genre,bookId,readinglistedBy,publicationDate,isPlanToRead,isReading,isFinished} =
        req.body;
    
      try {
        const isExists = await readingListCollection.findOne({ bookId });
        if(isExists){
          res.status(500).json({ error: 'Book Already in to Wishlist' });
        }else{
        const data = await readingListCollection.insertOne({title, price, author, image, genre,bookId,readinglistedBy,publicationDate,isPlanToRead,isReading,isFinished});
        console.log(data);
        res.status(201).json(data);
        }
      } catch (error) {
       
          
          res.status(500).json({ error: 'Failed to save data',error });
        
      }
    });
    app.get("/readinglist", async (req, res) => {
      const cursor = readingListCollection.find({});
      const data = await cursor.toArray();

      res.send({ status: true,  data });
    });
    // Remove item from cart
    app.delete("/wishlist/:id", async (req, res) => {
      try {
        const bookId= req.params.id;
        console.log(bookId);
        const isExists = await wishListCollection.findOne({ bookId  });
        console.log(isExists);
        const id = isExists?._id;
        const result = await wishListCollection.deleteOne({ _id: ObjectId(id) });
    
        // if (result.deletedCount === 0) {
        //   return res.status(404).json({ error: 'Book not found' });
        // }
    
        res.json({ message: 'Book deleted successfully',result });
      } catch (error) {
        console.error('Error deleting book:', error);
        // res.status(500).json({ error: 'Failed to delete book' });
      }
    });

    app.post("/book", async (req, res) => {
      const { title, price, author, image, genre, publicationDate, publisher } =
        req.body;

      const publicationYear = parseInt(publicationDate.slice(0, 4));
      const createdAt = new Date();

      const result = await bookCollection.insertOne({
        title,
        price,
        author,
        image,
        genre,
        publicationDate,
        publicationYear,
        publisher,
        createdAt,
      });

      res.send(result);
    });
    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updatebook = req.body;

      const result = await bookCollection.updateOne(
        { _id: ObjectID(id) },
        { $set: updatebook }
      );

      res.send({
        msg: "book updated successfully",
        result,
      });
    });


    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;

      const result = await bookCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
