var pm2 = require('pm2');

var package = require('../package.json');

var MACHINE_NAME = package.name;
var PRIVATE_KEY  = process.env.KEYMETRICS_PRIVATEKEY;   // Keymetrics Private key
var PUBLIC_KEY   = process.env.KEYMETRICS_PUBLICKEY;   // Keymetrics Public  key

var instances = process.env.WEB_CONCURRENCY || -1; // Set by Heroku or -1 to scale to max cpu core -1
var maxMemory = process.env.WEB_MEMORY      || 512;// " " "

pm2.connect(function() {
  pm2.start({
    script    : 'app/index.js',
    name      : package.name,     // ----> THESE ATTRIBUTES ARE OPTIONAL:
    exec_mode : 'cluster',            // ----> https://github.com/Unitech/PM2/blob/master/ADVANCED_README.md#schema
    instances : instances,
    max_memory_restart : maxMemory + 'M',   // Auto restart if process taking more than XXmo
    env: {                            // If needed declare some environment variables
      'NODE_PATH': 'app/src'
    },
    post_update: ["npm install"]       // Commands to execute once we do a pull from Keymetrics
  }, function() {
    pm2.interact(PRIVATE_KEY, PUBLIC_KEY, MACHINE_NAME, function() {

     // Display logs in standard output
     pm2.launchBus(function(err, bus) {
       console.log('[PM2] Log streaming started');

       bus.on('log:out', function(packet) {
        console.log('[App:%s] %s', packet.process.name, packet.data);
       });

       bus.on('log:err', function(packet) {
         console.error('[App:%s][Err] %s', packet.process.name, packet.data);
       });
      });


    });
  });
});
