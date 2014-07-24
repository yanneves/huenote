// dependencies
var fs = require('fs'),
    util = require('util'),
    express = require('express'),
    passport = require('passport');

// set up server instance
var app = express();
// configure server instance
app.use(passport.initialize());
// persistent login sessions
app.use(passport.session());

// authentication configuration
require('./server-auth')(passport);

// launch
app.get('*', passport.authenticate('basic'), function(req, res) {
    var url = (req.url !== '/') ? req.url : '/index.html';
    try {
        // local static resources
        var file = fs.readFileSync('./src/' + url);
        res.writeHead(200, {'Content-Length': file.length});
        res.write(file);
        res.end();
    } catch(e) {
        // resource not found
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write("Resource not found: '" + url + "' :( ");
        res.end();
    }
}).listen(process.env.PORT || 8224, function() {
    util.puts("Server running...");
});
