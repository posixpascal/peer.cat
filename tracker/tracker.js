const Server = require('bittorrent-tracker').Server;

const server = new Server({
    udp: true, // enable udp server? [default=true]
    http: true, // enable http server? [default=true]
    ws: true, // enable websocket server? [default=true]
    stats: true, // enable web-based statistics? [default=true]
    filter: (infoHash, params, cb) => {
        // Blacklist/whitelist function for allowing/disallowing torrents. If this option is
        // omitted, all torrents are allowed. It is possible to interface with a database or
        // external system before deciding to allow/deny, because this function is async.

        // All torrents are allowed by default.
        const allowed = true;
        if (allowed) {
            // If the callback is passed `null`, the torrent will be allowed.
            cb(null)
        } else {
            // If the callback is passed an `Error` object, the torrent will be disallowed
            // and the error's `message` property will be given as the reason.
            cb(new Error('disallowed torrent'))
        }
    }
});

server.on('error', (err) => {
    // fatal server error!
    console.log(err.message)
});

server.on('warning', (err) => {
    // client sent bad data. probably not a problem, just a buggy client.
    console.log(err.message)
});

// start tracker server listening! Use 0 to listen on a random free port.
server.listen(41337, "0.0.0.0", () => {
    console.log('listening on http port:' + server.http.address().port);
    console.log('listening on udp port:' + server.udp.address().port);
});

// listen for individual tracker messages from peers:

server.on('start', (addr) => {
    console.log('got start message from ' + addr)
});

server.on('complete', (addr) => {});
server.on('update', (addr) => {});
server.on('stop', (addr) => {});
