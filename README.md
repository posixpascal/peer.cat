<img align="center" src="https://raw.githubusercontent.com/posixpascal/peer.cat/master/screen_1.png" alt="peer.cat">

![https://docs.peer.cat/badge.svg](https://docs.peer.cat/badge.svg)

Secure and anonymous file sharing service. No server required.
`peercat` uses WebTorrent to stream files from one computer to another without hitting a server.

You can share multiple files to multiple users at once.

Works on latest Firefox, Chrome and Mobile Browsers.

### Running locally

I'm using parcel to create the assets, just run:

```
parcel build src/index.html
```

Then open the `dist/index.html` file in your browser.

### Command Line

`peercat` now offers a command line utility which allows you to share your files through peer.cat without going to the website.

[![asciicast](https://asciinema.org/a/ct09aD5BF8o3D8RH6Da5VUuzU.png)](https://asciinema.org/a/ct09aD5BF8o3D8RH6Da5VUuzU)

This tool does not do downloads at the moment, I will add this later.

### Todos

- Cleanup Code
- Better error messages

This project was created within a day and I was suffering an illness so forgive me if the code is still a little bit messy.

### Docs

Docs are available here: [docs.peer.cat](https://docs.peer.cat)


### Tracker

peer.cat uses it's own tracker for file exchange, check out the `tracker` folder in this repository.

### Contributing

Just... do... it. 


### License

Licensed under MIT

```
Copyright 2018 Pascal Raszyk

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```











