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
//Not working as 
app.post('/create',function(req,res) {
    let calories = req.body.calories;
    let foodItems = [];
    let objArr = [];
    //Only consider elements which have max calorie requirement
    Food.find({calories:{$lte:calories*4}},function(err,items) {
        // console.log(items);
        foodItems = items;
        //Sorting all items in increasing order of calories/protien ratio
        foodItems.sort(function(a,b){
            return a.calories/a.protien - b.calories/b.protien;
        });
        //Selecting whole number quantities of 2-5 items while calories is in range
        // let curr_cal = 0;
        // let diffItems = 0;
        // foodItems.forEach(function(res) {
        //     if(diffItems < 5 && curr_cal < calories+100) {
        //         let rem_cal= calories+100 - curr_cal;
        //         let remItems = 5-diffItems;
        //         let k = rem_cal/remItems;

        //     }
        // });
        // console.log(foodItems);
        let start = -1, end = -1;
        let l = 40/3, r = 20;
        foodItems.forEach(function(item,ind) {
            if(item.calories/item.protien >= l && item.calories/item.protien <= r) {
                if(start == -1) start = ind;
                end = ind;
            }
        });
        const len = foodItems.length;
        let mealItems = [];
        //If there are sufficient elements in the range of 20-30% choose min 2 and max 5 items of those
        if(end - start >= 2) {

        }
        //If there aren't min 2 elements in the range, run 2 for loops and find any 2 items whose ratios will 20-30% protien/calories
        else {
            for(let i = 0; i < len; i++) {
                for(let j = 0; j < len; j++) {
                    if(i != j) {
                        // item[i].calories + 
                    }
                }
            }
        }
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

