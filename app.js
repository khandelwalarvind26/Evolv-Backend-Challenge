//Requiring the express and mongoose modules
const express = require('express');
const app = express();
const BS = require('body-parser');
const mongoose = require('mongoose');
app.use(BS.urlencoded({extended : true}));

//Declare express render engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

//Connecting to the local server
const url = "mongodb://localhost:27017/";
const dbName = "evolvDB";
mongoose.connect(url + dbName);



//Food Schema
const foodSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    calories:Number,
    protien:{type:Number,min:1,max:100} ,
    carb:{type:Number,min:1,max:100},
    fat:{type:Number,min:1,max:100},
    water:{type:Number,min:1,max:100},
    acceptedUnit:{
        enum:['ml','liter','kg','g']
    },
    itemWeight:{val :{type:Number,min:1,max:100},units:{type:String,enum:'g'}}
});
const Food = mongoose.model('Food',foodSchema);



//Meals Schema
const mealSchema = new mongoose.Schema({
    validCategory :{
        enum:['Breakfast', 'Lunch', 'Evening Snack', 'Dinner']
    },
    category:String,
    name:String,
    mealItems:[{type:foodSchema}]
});
const Meal = mongoose.model('Meal',mealSchema);



//User schemas
const userSchema = new mongoose.Schema({
    name:String,
    calorieRequirement:{val :{type:Number,min:1,max:100},units:{type:String,enum:['ml','liter','kg','g']}},
    mealPlan:[mealSchema]
});
const User = mongoose.model('User',userSchema);



//Rendering index.js when someone visits home route
app.get("/",function(req,res){
    res.render("index");
});



//Rendering Food items when this page is visited
const units = ['g','kg','ml','l'];
app.get("/food",function(req,res) {
    Food.find({},function(err,items){
        if(err)console.log(err)
        else {
            res.render("food",{items:items,units:units});
        }
    });
});



//Rendering Meals.ejs when /meals is visited
const category = ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'];
app.get("/meals",function(req,res) {
    let foodItems = [];
    Food.find({},function(err,items){
        if(err)console.log(err)
        else {
            foodItems = items;
        }
    })
    Meal.find({},function(err,items) {
        if(err)console.log(err)
        else {
            // console.log(items);
            res.render("meals",{items:items,foodItems:foodItems,category:category});
        }
    });
});



//Handling post request to /food when a new item is added
app.post("/food",function(req,res){
    console.log(req.body);
    const item = new Food({
        name:req.body.name,
        calories:req.body.cal,
        protien:req.body.protien,
        fat:req.body.fat,
        carb:req.body.carb,
        water:req.body.water,
        itemWeight:{
            val:req.body.wght,
            units:req.body.units
        },
        acceptedUnit:req.body.units
    });
    item.save();
    res.redirect("/food");
});



//Handling post request to /meal when a new item is added
app.post("/addMeals",function(req,res){
    const arr = [];
    
    const id = req.body.checked;
    // console.log(id);
    if(id.size === 1) {
        Food.findById(id,function(err,food) {
            if(err) console.log(err);
            else {
                console.log(food.name);
                arr.push(food);
            }
        });
    }
    else {
        id.forEach(function(id){
            Food.findById(id,function(err,food) {
                if(err) console.log(err);
                else {
                    console.log(food.name);
                    arr.push(food);
                }
            });
        });
    }
    const curr = new Meal({
        name:req.body.name,
        validCategory:req.body.category,
        category:req.body.category,
        mealItems:arr
    });
    console.log(curr.mealItems);
    curr.save(function(err) {
        if(err)console.log(err);
    });
    res.redirect("/meals");
});



//Setting up the server to listen on localhost:3000/
app.listen(3000,function(){console.log("Server started on port 3000")});

