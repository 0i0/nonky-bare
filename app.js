var child_process = require('child_process')
var os            = require('os')
  , exec0         = child_process.exec
  , si            = require('systeminformation')
  , smc           = require('smc')
  , request       = require('request')
  , nowplaying    = require('nowplaying')
  , express       = require('express')

var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.use(express.static(__dirname + '/public'))

// returns a number of samples of os.cpus
app.get('/api/cpus/:samplesNumber/:sampleTime', function (req, res) {
  var samplesNumber = req.params.samplesNumber
    , sampleTime = req.params.sampleTime
    , samples = []
  samples.push(os.cpus())
  if (samplesNumber==1) {
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(samples))
  }else{
    setTimeout(function getSample(){
      samples.push(os.cpus())
      samplesNumber--
      if (samplesNumber==1) {
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify(samples))
      }else{
        setTimeout(getSample,sampleTime)
      }
    },sampleTime)
  }
})

app.get('/api/smc/:key', function (req, res) {
  var key = req.params.key
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(smc.get(key)))
  //res.send(smc.get('TC0P').toString())
})

app.get('/api/mem', function (req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(
    {
      total:os.totalmem(),
      free:os.freemem()
    }
  ))
})

app.get('/api/defaultnet', function (req, res) {
  si.networkInterfaceDefault(function(interface){
    si.networkStats(interface, function(data) {
      res.setHeader('Content-Type', 'application/json')
      res.send(JSON.stringify(data))
    })
  })
})

app.get('/api/ps/:sortcolumn', function (req, res) {
  var sortcolumn = req.params.sortcolumn
  exec0('ps -Ao pid,%cpu,%mem,comm |sort -nrk '+
        sortcolumn+
        ' | head -n 5 | awk \'{gsub("(.+/)","",$4);print "<"substr($4,1,13)"<" "," $1 "," $2 "," $3 ":" }\'',function(error, stdout, stderr) {
    if(stderr) return
    var str = stdout.replace(/:/g,'],[')
    str = str.replace(/</g,'"')
    str = '[['+str+']]'
    res.setHeader('Content-Type', 'application/json')
    res.send(str)
  })
})

app.get('/api/crypto', function (req, res) {
  request.get('https://api.coinmarketcap.com/v1/ticker/',{},function(err,gres,body){
    if(err) return
    if(res.statusCode !== 200 ) return
    res.setHeader('Content-Type', 'application/json')
    res.send(body)
  })
})

io.on('connection', function(socket){
  nowplaying.on('playing', function (data) {
    socket.broadcast.emit('playing', data)
  })
  nowplaying.on('paused', function (data) {
    socket.broadcast.emit('paused', data)
  })
  
})


http.listen(26497, function(){
  console.log('running on http://localhost:26497')
})