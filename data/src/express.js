//// Core modules
const util = require('util');

//// External modules
const express = require('express');
const bodyParser = require('body-parser');
const lodash = require('lodash');

//// Modules
const db = require('./db');
const nunjucksEnv = require('./nunjucks-env');
// const routes = require('./routes');


//// Create app
const app = express();

//// Setup view
nunjucksEnv.express(app);

// Remove express
app.set('x-powered-by', false);

//// Middlewares

// Assign view variables once - on app start
app.use(function (req, res, next) {
    app.locals.app = {}
    app.locals.app.title = PACKAGE_JSON.name;
    app.locals.app.description = PACKAGE_JSON.description;
    app.locals.CONFIG = lodash.cloneDeep(CONFIG) // Config
    next();
});

// Static public files
app.use(express.static(CONFIG.app.dirs.public));

// Parse http body
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

//// Set express vars
// Indicates the app is behind a front-facing proxy, and to use the X-Forwarded-* headers to determine the connection and the IP address of the client.
app.set('trust proxy', CONFIG.express.trustProxy);

//// Routes
app.get('/', async(req, res, next)=>{
    try{

        let search = lodash.get(req, 'query.s', '');
        let keys = search.split(',')
        keys = lodash.map(keys, (o) => {
            o = lodash.trim(o)
            o = o.replace(/(brgy\.)|(brgy)/, 'Barangay')
            return new RegExp(o, "i")

        })

        // Our address returned starts from bgy level
        let query = {
            level: 'Bgy'
        }
        if(keys.length === 0){

        }
        if(keys.length === 1){

            query = {
                $or: [
                    {
                        $and: [
                            {name: keys[0]},
                            {level: 'Bgy'},
                        ]
                    },
                    {
                        $and: [
                            {cityMunName: keys[0]},
                            {level: 'Bgy'},
                        ]
                    },
                    {
                        $and: [
                            {provName: keys[0]},
                            {level: 'Bgy'},
                        ]
                    }
                ]
            }

            if(keys[0].source.match(/([\w]+ city)/i)){
                let custom = keys[0].source.replace(/ city/i, '')
                custom = `City of ${custom}`
                query.$or.push({
                    $and: [
                        {cityMunName: new RegExp(custom, 'i')},
                        {level: 'Bgy'},
                    ]
                })
            }

        } else if (keys.length === 2){
            query = {
                $or: [
                    {
                        $and: [
                            {name: keys[0]},
                            {level: 'Bgy'},
                            {cityMunName: keys[1]}
                        ],
                    },
                    {
                        $and: [

                            {level: 'Bgy'},
                            {cityMunName: keys[0]},
                            {provName: keys[1]}
                        ],
                    },
                ]
            }
        } else {
            query = {
                $or: [
                    {
                        $and: [
                            {name: keys[0]},
                            {level: 'Bgy'},
                            {cityMunName: keys[1]},
                            {provName: keys[2]},
                        ],
                    },
                    {
                        $and: [
                            {name: keys[0]},
                            {level: 'Bgy'},
                            {cityMunName: keys[1]},
                        ],
                    },
                ]
            }
        }
        console.log(util.inspect(query, false, null, true /* enable colors */))
        // raw ops
        let addresses = await db.main.Address.collection.find(query).limit(10).toArray()
        addresses = lodash.map(addresses, (o)=>{
            let full = [o.name]
            if(o.cityMunName){
                full.push(o.cityMunName)
            }
            if(o.provName){
                full.push(o.provName)
            }
            return {
                id: o.code,
                name: full.join(', ')
            }
        })
        if(req.xhr){
            return res.send(addresses)
        }
        return res.render('index.html', {
            s: search,
            addresses: addresses,
        })
    } catch (err){
        next(err)
    }
});

// Error handler
app.use(function (error, req, res, next) {
    try {
        if (res.headersSent) {
            return next(error);
        }
        req.socket.on("error", function (err) {
            console.error(err);
        });
        res.socket.on("error", function (err) {
            console.error(err);
        });

        console.error(req.originalUrl)
        console.error(error)
        if (req.xhr) { // response when req was ajax
            return res.status(400).send(error.message)
        }
        if (/^\/api\//.test(req.originalUrl)) {
            return res.status(500).send('API error...');
        }

        // Anything that is not catched
        res.status(500).render('error.html', {error: error.message});
    } catch (err) {
        // If an error handler had an error!! 
        error = errors.normalizeError(err);
        console.error(req.originalUrl)
        console.error(error)
        res.status(500).send('Unexpected error!');
    }
});

//// Export
module.exports = app;