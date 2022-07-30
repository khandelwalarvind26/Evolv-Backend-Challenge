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



//Level 3 : Algorithm to create ideal meal given number of calories
//The basic approach of the problem will be using Unbounded Knapsack. WhereIn I will include some possible quantities of all items and not include some items.
//In this way, The algorithm will create an array all possible combinations of selecting food items such that quantity is <=2 & >=5 and the calorie requirement is satisfied
//Now, I will iterate over these combinations and check the protien/calorie ratio for each of them and return the ones which satisfy the ratio
//The Implementation of recursive function is under progress as of now 
function recurse(curr_cal, target_cal, curr_quantity,currArr,ind,foodItems) {
    if(curr_cal > target_cal +100) return;
    if(ind >= foodItems.length || curr_quanity == 5) {
        if(curr_quantity >= 2 && curr_cal >= target_cal-100 && curr_cal <= target_cal+100) {
            objArr.push(currArr);
        } 
        return;
    }
    else if(curr_quantity < 5) {

    }

} 
app.post('/create',function(req,res) {
    let calories = req.body.calories;
    let foodItems = [];
    let objArr = [];
    Food.find({calories:{$lte:calories*4}},function(err,items) {
        foodItems = items;

    });
    res.send("Done");
});



//Get and post requests for food
const units = ['g','kg','ml','l'];

app.route('/food')

.get(function(req,res) {
    Food.find({},function(err,items){
        if(err)console.log(err)
        else {
            res.render("food",{items:items,units:units});
        }
    });
})

.post(function(req,res){
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






//Get, post and patch functions for /meals route
const category = ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'];

app.route('/meals')

.get(function(req,res) {
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
    
})

.post(function(req,res){
    // Remove empty elements from the input quantity array
    const quant = req.body.quantity;
    for(let i = 0; i < quant.length; i++) {
        if(quant[i] === '' || quant[i] === '0') {quant.splice(i,1); i--;}
    }
    //Pushing all objects into a temp array
    let objArr = [];
    for(let i = 0; i < req.body.checked.length; i++) {
        const obj = {
            food:req.body.checked[i],
            quantity:quant[i]
        };
        objArr.push(obj);
    }
    console.log(objArr);
    //Creating the new temp obj and saving it
    const curr = new Meal({
        name:req.body.name,
        validCategory:req.body.category,
        category:req.body.category,
        mealItems:objArr
    });
    curr.save(function(err) {
        if(err)console.log(err);
    });
    //Redirecting it back to /meals
    res.redirect("/meals");
})

//To make patch request, have field id containing id of meal to be updated and then the fields that are to be patched
.patch(function(req,res){
    const id = req.body.id;
    const temp = req.body;
    delete temp.id;
    console.log(id);
    Meal.updateOne(
        {_id:id},
        {$set:temp},
        function(err) {if(err) res.send(err);
        else res.send("Success");}
    );
});




//Get and post requests for route /users
app.route('/users')

.get(function(req,res) {
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
})

.post(function(req,res){
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

//To make patch request, have field id containing id of user to be updated and then the fields that are to be patched
.patch(function(req,res){
    const id = req.body.id;
    const temp = req.body;
    delete temp.id;
    console.log(id);
    User.updateOne(
        {_id:id},
        {$set:temp},
        function(err) {if(err) res.send(err);
        else res.send("Success");}
    );
});


//Setting up the server to listen on localhost:3000/
app.listen(3000,function(){console.log("Server started on port 3000")});

