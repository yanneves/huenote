// dependencies
var fs = require('fs'),
    util = require('util');
    http = require('http');

// create local CDN endpoint
http.createServer(function(req, res) {
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
}).listen(80, function() {
    util.puts("Server running...");
});