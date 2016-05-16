var importedFunc = require('./sat1')
var package = require('./package.json')
var async = require('async')
var request = require('request')
var debug = require('debug')('myservice1')
var debugStep1 = require('debug')('myservice1.step1')
var debugStep2 = require('debug')('myservice1.step2')
var debugEntry = require('debug')('myservice1.entry')

var fs = require('fs')
var express = require('express')
var app = express()


// Homework ========================================================================
app.use( "/step1", function (req, res, next) {
  console.log('REQUEST RECEIVED TO step1')
  //debugStep1('REQUEST RECEIVED TO step1')
  next()
}, function (req, res, next){
	setTimeout( () => {
	if (req.query.throw) {
	  debugStep1("request errored on server", {message: "some error"})
	  return res.status(500).json({message: "some error"})
	}
	res.json({step1: "OK", data: req.query.data || "42"})
	next();
	}, parseInt(req.query.timeout, 10) )
}, () => {
	console.log('step1 FINISHED')
	//debugStep1('step1 FINISHED')
})

app.use("/step2", (req, res, next) => {
  console.log('REQUEST RECEIVED TO step2')
  //debugStep2('REQUEST RECEIVED TO step2')
  next()
},(req, res, next) => {
  setTimeout( () => {
    res.json({step2: "OK", data: req.query.data || "42"})
	next()
  }, parseInt(req.query.timeout, 10) )
}, () => {
	console.log('step2 FINISHED')
	//debugStep2('step2 FINISHED')
})
//==================================================================

app.use("/entry", (req, res) => {
  debugEntry("request received to entry")
  console.time("execution of entry")
  var jobDefs = [
    { step:'step1', timeout:250},
    { step:'step2', timeout:150},
    { step:'step1', timeout:250},
    { step:'step2', timeout:150},
    { step:'step1', timeout:250},
    { step:'step2', timeout:150},
    { step:'step1', timeout:250},
    { step:'step2', timeout:150}
  ]

  function step(data, done) {
    request.get(`http://localhost:${port}/${data.step}?timeout=${data.timeout || 0}`, function(err, result, nextJobDef) {
      if (err || result.statusCode >= 500) {
        var _err =  err || { message: `status ${result.statusCode}`}
        //data.debug("request errored on client", _err)
        return done(_err)
      }
      //data.debug("request completed on client", JSON.parse(result.body))
      data.result = JSON.parse(result.body)
      done(undefined, JSON.parse(result.body))
    })
  }
  

  async.each(jobDefs, step, (err, result) => {
    if (err) {
      debugEntry("jobs errored", err)
      return res.status(500).json(err)
    }
    debugEntry("jobs complete", err, result, jobDefs)
    console.timeEnd("execution of entry")
    res.json(jobDefs)
  })
  
  
})

function errorHandler(err, req, res, next) {
  console.log("Error in request", err.message, err.stack)
  if (err) {
    res.status(500).send(err.message + "in:" + err.stack)
  }
}
app.use(errorHandler)

var port = process.env.PORT || 5000
var server = app.listen(port, (err) => {
  console.log("Our server listening on " + port)
})
