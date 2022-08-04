//Requiring the express and mongoose modules
const express = require('express');
const app = express();
const BS = require('body-parser');
const mongoose = require('mongoose');
app.use(BS.urlencoded({ extended: true }));

//Declare express render engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

//Connecting to the local server
const url = "mongodb://localhost:27017/";
const dbName = "evolvDB";
mongoose.connect(url + dbName);



//Food Schema
const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    calories: Number,
    protien: { type: Number, min: 1, max: 100 },
    carb: { type: Number, min: 1, max: 100 },
    fat: { type: Number, min: 1, max: 100 },
    water: { type: Number, min: 1, max: 100 },
    acceptedUnit: {
        enum: ['ml', 'liter', 'kg', 'g']
    },
    itemWeight: { val: Number, units: { type: String, enum: 'g' } }
});
const Food = mongoose.model('Food', foodSchema);



//Meals Schema
const mealSchema = new mongoose.Schema({
    name: String,
    validCategory: {
        enum: ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner']
    },
    category: String,
    mealItems: [{
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
        quantity: Number
    }]
});
const Meal = mongoose.model('Meal', mealSchema);
const CalorieMeal = mongoose.model('CalorieMeal', mealSchema);
//Categories
const category = ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'];


//User schemas
const userSchema = new mongoose.Schema({
    name: String,
    calorieRequirement: Number,
    mealPlan: {
        meals: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meal'
        }],
        date: Number
    }
});
const User = mongoose.model('User', userSchema);



//Rendering index.js when someone visits home route
app.get("/", function (req, res) {
    res.render("index");
});



//Level 3 : Algorithm to create ideal meal given number of calories
//The basic approach of the problem will be using Unbounded Knapsack. WhereIn I will include some possible quantities of all items and not include some items.
//In this way, The algorithm will create an array of all possible combinations of selecting food items such that quantity is <=2 & >=5 and the calorie requirement is satisfied
//Now, I will iterate over these combinations and check the protien/calorie ratio for each of them and return the ones which satisfy the ratio


//The algorithm is able to filter the required combinations out of all possible combinations which implying the logic is working flawlessly.
let no = 0;
function recurse(curr_cal, curr_protien, target_cal, curr_quantity, currArr, ind, foodItems, objArr) {
    no++;
    if (curr_cal > target_cal || objArr.length >= 10) return;
    if (ind >= foodItems.length || curr_quantity == 5) {
        if (curr_quantity >= 2 && curr_cal >= target_cal - 200 && curr_cal <= target_cal && (curr_cal / curr_protien) >= (40 / 3) && (curr_cal / curr_protien) <= 20) {
            let obj = { curArr: [] }
            currArr.forEach(function (item) {
                obj.curArr.push(item);
            });
            objArr.push(obj);
        }
        return;
    }
    else if (curr_quantity < 5) {
        let req_cal = target_cal - curr_cal;
        //if calories in 100gm portion of currItem is less than available calories, select fractional portions
        if (foodItems[ind].calories < req_cal) {
            for (let i = 1; i <= 5; i++) {
                if (foodItems[ind].calories * i <= req_cal) {
                    currArr.push([ind, i]);
                    recurse(curr_cal + foodItems[ind].calories * i, curr_protien + foodItems[ind].protien * i, target_cal, curr_quantity + 1, currArr, ind + 1, foodItems, objArr);
                    currArr.pop();
                }
            }
        }

        //Not selecting any quantity of curr item
        recurse(curr_cal, curr_protien, target_cal, curr_quantity, currArr, ind + 1, foodItems, objArr);
    }
}

app.get('/create', function (req, res) {
    res.render('create');
});

app.post('/create', function (req, res) {
    let calories = parseInt(req.body.calories);
    let foodItems = [];
    Food.find({ calories: { $lte: calories * 4 } }, function (err, items) {
        foodItems = items;
        let currArr = [];
        let objArr = [];
        no = 0;
        //This function returns an objArr which contains quantity and index of all food items in the meals
        recurse(0, 0, calories + 100, 0, currArr, 0, foodItems, objArr);

        //Now iterating over these meals and adding them to an array of meal objects
        objArr.forEach(function (item, index) {
            let mealItems = [];
            for (let i = 0; i < item.curArr.length; i++) {
                const obj = {
                    food: foodItems[item.curArr[i][0]]._id,
                    quantity: item.curArr[i][1]
                };
                mealItems.push(obj);
            }
            const curr = new CalorieMeal({
                name: 'meal' + index,
                validCategory: 'Breakfast',
                category: 'Breakfast',
                mealItems: mealItems
            });
            curr.save();
        });
        CalorieMeal.find({}, function (err, items) {
            if (err) console.log(err)
            else {
                res.render("created", { items: items });
            }
        }).populate('mealItems.food');
    });

});


//Save the generated meals
app.post('/save', function (req, res) {
    req.body.checked.forEach(function(id){
        CalorieMeal.findById(id,function(err,item) {
            const curr = new Meal({
                name:item.name,
                validCategory:item.validCategory,
                category:item.category,
                mealItems:item.mealItems
            });
            curr.save();
        });
    });
    
    res.redirect('/users');
});


app.post('/clear', function (req, res) {
    CalorieMeal.collection.drop();
    console.log('deleted');
    res.redirect('/');
});


//Get and post requests for food
const units = ['g', 'kg', 'ml', 'l'];

app.route('/food')

    .get(function (req, res) {
        Food.find({}, function (err, items) {
            if (err) console.log(err)
            else {
                res.render("food", { items: items, units: units });
            }
        });
    })

    .post(function (req, res) {
        console.log(req.body);
        const item = new Food({
            name: req.body.name,
            calories: req.body.cal,
            protien: req.body.protien,
            fat: req.body.fat,
            carb: req.body.carb,
            water: req.body.water,
            itemWeight: {
                val: req.body.wght,
                units: req.body.units
            },
            acceptedUnit: req.body.units
        });
        item.save();
        res.redirect("/food");
    });






//Get, post and patch functions for /meals route


app.route('/meals')

    .get(function (req, res) {
        Food.find({}, function (err, foodItems) {
            if (err) console.log(err)
            else {
                Meal.find({}, function (err, items) {
                    if (err) console.log(err)
                    else {
                        res.render("meals", { items: items, foodItems: foodItems, category: category });
                    }
                }).populate('mealItems.food');
            }
        });

    })

    .post(function (req, res) {
        // Remove empty elements from the input quantity array
        const quant = req.body.quantity;
        for (let i = 0; i < quant.length; i++) {
            if (quant[i] === '' || quant[i] === '0') { quant.splice(i, 1); i--; }
        }
        //Pushing all objects into a temp array
        let objArr = [];
        for (let i = 0; i < req.body.checked.length; i++) {
            const obj = {
                food: req.body.checked[i],
                quantity: quant[i]
            };
            objArr.push(obj);
        }
        console.log(objArr);
        //Creating the new temp obj and saving it
        const curr = new Meal({
            name: req.body.name,
            validCategory: req.body.category,
            category: req.body.category,
            mealItems: objArr
        });
        curr.save(function (err) {
            if (err) console.log(err);
        });
        //Redirecting it back to /meals
        res.redirect("/meals");
    })

    //To make patch request, have field id containing id of meal to be updated and then the fields that are to be patched
    .patch(function (req, res) {
        const id = req.body.id;
        const temp = req.body;
        delete temp.id;
        Meal.updateOne(
            { _id: id },
            { $set: temp },
            function (err) {
                if (err) res.send(err);
                else res.send("Success");
            }
        );
    });




//Get and post requests for route /users
app.route('/users')

    .get(function (req, res) {
        Meal.find({}).populate("mealItems.food").exec(function (err, meals) {
            if (err) console.log(err);
            else {
                User.find({}).populate("mealPlan.meals").populate("mealPlan.meals.mealItems.food").exec(function (err2, items) {
                    if (err2) console.log(err2);
                    else {
                        res.render("users", { items: items, meals: meals });
                    }
                });
            }
        });
    })

    .post(function (req, res) {
        const curr = new User({
            name: req.body.name,
            calorieRequirement: req.body.calReq,
            mealPlan: {
                date: req.body.date,
                meals: req.body.checked
            }
        });
        curr.save(function (err) {
            if (err) console.log(err);
            else console.log("Success");
        });
        res.redirect('/users');
    })

    //To make patch request, have field id containing id of user to be updated and then the fields that are to be patched
    .patch(function (req, res) {
        const id = req.body.id;
        const temp = req.body;
        delete temp.id;
        User.updateOne(
            { _id: id },
            { $set: temp },
            function (err) {
                if (err) res.send(err);
                else res.send("Success");
            }
        );
    });


//Setting up the server to listen on localhost:3000/
app.listen(3000, function () { console.log("Server started on port 3000") });

