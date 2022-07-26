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
    mealItems:[{
        food:{type:mongoose.Schema.Types.ObjectId, ref:'Food'},
        quantity:Number
    }]
});
const Meal = mongoose.model('Meal',mealSchema);



//User schemas
const userSchema = new mongoose.Schema({
    name:String,
    calorieRequirement:Number,
    mealPlan:{
        meals:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Meal'
        }],
        date:Number
    }
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
    Food.find({},function(err,foodItems){
        if(err)console.log(err)
        else {
            Meal.find({},function(err,items) {
                if(err)console.log(err)
                else {
                    res.render("meals",{items:items,foodItems:foodItems,category:category});
                }
            }).populate('mealItems.food');
        }
    });
    
});



//Rendering users.ejs when /users is visited
app.get("/users",function(req,res) {

    Meal.find({}).populate("mealItems.food").exec(function(err,meals) {
        if(err) console.log(err);
        else {
            User.find({}).populate("mealPlan.meals").populate("mealPlan.meals.mealItems.food").exec(function(err2,items) {
                if(err2) console.log(err2);
                else {
                    res.render("users",{items:items,meals:meals});
                }
            });
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
    // console.log(req.body);
    const quant = req.body.quantity;
    for(let i = 0; i < quant.length; i++) {
        // console.log(i);
        // console.log(quant[i]);
        if(quant[i] === '' || quant[i] === '0') {quant.splice(i,1); i--;}
    }
    let objArr = []
    for(let i = 0; i < req.body.checked.length; i++) {
        const obj = {
            food:req.body.checked[i],
            quantity:quant[i]
        };
        objArr.push(obj);
    }
    console.log(objArr);
    const curr = new Meal({
        name:req.body.name,
        validCategory:req.body.category,
        category:req.body.category,
        mealItems:objArr
    });
    // console.log(curr.mealItems);
    curr.save(function(err) {
        if(err)console.log(err);
    });
    res.redirect("/meals");
});


//Handling post request on /addUsers to add new users
app.post("/addUsers",function(req,res){
    const curr = new User({
        name:req.body.name,
        calorieRequirement:req.body.calReq,
        mealPlan:{
            date:req.body.date,
            meals:req.body.checked
        }
    });
    curr.save(function(err) {
        if(err)console.log(err);
        else console.log("Success");
    });
    res.redirect('/users');
})



//Handle post requeusts /mealspatch to patch meals with patch api
// app.post("/mealsPatch",function(req,res) {
//     console.log(req.body);
//     const id = req.body.checked;
//     Food.find({},function(err,foodItems){
//         if(err)console.log(err)
//         else {
//             Meal.findById(id,function(err,item) {
//                 if(err)console.log(err)
//                 else {
//                     res.render("mealsPatch",{item:item,foodItems:foodItems,category:category});
//                 }
//             }).populate('mealItems');
//         }
//     });
// });



//Handle patch request to /patchMeal
// app.post("/patchMeal",function(req,res) {
//     console.log(req.body);
// });

//Setting up the server to listen on localhost:3000/
app.listen(3000,function(){console.log("Server started on port 3000")});

