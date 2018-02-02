const VERSION = "1.0.0";


const template = (strings, ...keys) => {
    return ((...values) => {
        const dict = values[values.length - 1] || {};
        const result = [strings[0]];
        keys.forEach(function (key, i) {
            const value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join('');
    });
};

const DOWNLOAD_TORRENT_TEMPLATE = torrent => template`
    <div data-id="${'infoHash'}" class="uk-card uk-card-default uk-card-body uk-width-1-1">
        <h3 class="uk-card-title uk-text-center" data-filename>${'name'}</h3>
        <div uk-grid class="metadata">
            <div class="uk-width-1-5">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: rss"></span>
                    <code><span data-progress>${'progressHuman'}</span>%
                    </code>
                </div>
            </div>
            <div class="uk-width-1-5">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: file-edit"></span>
                    <code><span data-size>${'lengthHuman'}</span>
                        
                    </code>
                </div>
            </div>
            <div class="uk-width-1-5">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: download"></span>
                    <code><span data-download-speed>${'downloadSpeedHuman'}</span>
                    </code>
                </div>
            </div>
           
            <div class="uk-width-1-5">
                <div onclick="window.peercat.remove('${'infoHash'}')" class="uk-button uk-button-danger">
                     <span uk-icon="icon: trash"></span> Remove
                </div>
            </div>
            <div class="uk-width-1-5">
                <div onclick="window.peercat.downloadBlob('${'infoHash'}')" class="download-btn uk-button uk-button-primary uk-disabled">
                    <span uk-icon="icon: cloud-download"></span> Download
                </div>
            </div>
        </div>
    </div>
`(torrent);

const TORRENT_TEMPLATE = torrent => template`
    <div data-id="${'infoHash'}" class="uk-card uk-card-default uk-card-body">
        <h3 class="uk-card-title uk-text-center" data-filename>${'name'}</h3>
        <div uk-grid class="metadata">
            <div class="uk-width-1-1 uk-width-1-4@m">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: server"></span>
                    <code><span data-peers>${'numPeers'}</span>
                        Peer(s)
                    </code>
                </div>
            </div>
            <div class="uk-width-1-1 uk-width-1-4@m">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: file-edit"></span>
                    <code><span data-size>${'lengthHuman'}</span>
                        
                    </code>
                </div>
            </div>
            <div class="uk-width-1-1 uk-width-1-4@m">
                <div class="uk-padding-small uk-padding-vertical">
                    <span uk-icon="icon: upload"></span>
                    <code><span data-upload-speed>${'uploadSpeedHuman'}</span>
                    </code>
                </div>
            </div>
            <div class="uk-width-1-1 uk-width-1-4@m">
            <div class="actions uk-margin uk-margin-vertical">
                <ul class="uk-iconnav">
                <li uk-tooltip="Share link" onclick="window.peercat.share('${'infoHash'}')" class="uk-padding-small uk-padding-horizontal uk-text-warning">
                    <span uk-icon="icon: social; ratio: 1.2"></span>
                </li>
               <!-- <li data-clipboard-text="" data-clipboard-btn uk-tooltip="Copy link"  class="uk-padding-small uk-padding-horizontal uk-text-secondary">
                    <span uk-icon="icon: link"></span>
                </li>-->
                <li uk-tooltip="Remove file" onclick="window.peercat.remove('${'infoHash'}')" class="uk-padding-small uk-padding-horizontal uk-text-danger">
                    <span uk-icon="icon: trash; ratio: 1.2"></span>
                </li>
            </div>
        </div>
    </div>
`(torrent);


export class Peercat {
    constructor() {
        this.fileUploader = new FileUploader();
        this.torrents = [];
        this.client = new WebTorrent();
    }

    run() {
        console.log(`🐈  peercat V${VERSION}`);
        $(".download-cta").hide();
        // User tries to connect to other peer to download file
        if (window.location.hash) {
            $("#uploader").hide();
            $(".intro p").hide();

            // Receive info hash
            let [infoHashEnc, password] = window.location.hash.substring(1).split(":");
            const data = JSON.parse(CryptoJS.AES.decrypt(infoHashEnc, password).toString(CryptoJS.enc.Utf8));
            this.infoHash = data.infoHash;
            this.filename = data.filename;

            // prepare download
            $(".download-cta").show();
        }

        this.fileUploader.init(
            document.querySelector("#progressbar"),
            document.querySelector("#uploader")
        );


        this.fileUploader.on("files:added", (files) => {
            this.showSpinner();
            this.client.seed(files, (torrent) => {
                this.hideSpinner();
                console.log('Client is seeding ' + torrent.magnetURI);
                torrent.on("download", () => {
                    this.update();
                });
                torrent.progressHuman = "--";
                torrent.uploadSpeedHuman = "--";
                torrent.lengthHuman = "--";
                const html = TORRENT_TEMPLATE(torrent);
                $(".torrents").append(html);
                setInterval(() => {
                    this.update()
                }, 1000);
            });
        });
    }

    showSpinner() {
        $(".spinner").show();
    }

    hideSpinner() {
        $(".spinner").hide();
    }

    download() {
        this.showSpinner();
        $(".download-cta").hide();
        const torrentUrl = `magnet:?xt=urn:btih:${this.infoHash}&dn=${this.filename}&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com`;

        let torrentTimeout = setTimeout(() => {
           this.hideSpinner();
           $(".download-cta").show();
           this.client.remove(this.infoHash);
            UIkit.notification({
                message: 'This file is not available anymore.',
                status: 'danger',
                pos: 'top-center',
                timeout: 5000
            });
        }, 6000);

        const added = this.client.add(torrentUrl, (torrent) => {
            clearTimeout(torrentTimeout);
            this.hideSpinner();
            console.log(torrent, this.infoHash);
            torrent.status = "waiting";
            torrent.on("download", () => {
                torrent.status = "downloading";
                console.log(torrent);
                this.update(true);
            });

            const html = DOWNLOAD_TORRENT_TEMPLATE(torrent);
            $(".downloads").append(html);

            torrent.on('done', () => {
                torrent.status = 'done';
                this.update(true);
                $(`[data-id='${torrent.infoHash}'] .download-btn`).removeClass("uk-disabled");
            });

            torrent.on('error', () => {
                torrent.status = 'error';
                this.update(true);
            });
            this.torrents.push(torrent);
            this.update(true);

            torrent.files.forEach(function (file) {
                file.getBlobURL(function (err, url) {
                    torrent.bloburl = url;

                    const anchorElement = document.createElement('a');
                    document.body.appendChild(anchorElement);
                    anchorElement.download = file.name;
                    anchorElement.href = torrent.bloburl;
                    anchorElement.click();
                    anchorElement.parentNode.removeChild(anchorElement);
                });
            })
        });

        console.log(added);
    }

    /**
     * Update views
     */
    update(downloadSide) {
        if (downloadSide) {
            this.client.torrents.forEach((torrent) => {
                const $element = $(`[data-id='${torrent.infoHash}']`);
                torrent.lengthHuman = this.humanFileSize(torrent.length, true);

                if (torrent.status === "done") {
                    torrent.progressHuman = "100";
                    torrent.downloadSpeedHuman = "0 KB/s";
                } else {
                    torrent.progressHuman = (torrent.progress * 100).toFixed(2);
                    torrent.downloadSpeedHuman = this.humanFileSize(torrent.downloadSpeed, true) + "/s";
                }

                $element.find("[data-status]").html(torrent.status);
                $element.find("[data-download-speed]").html(torrent.downloadSpeedHuman);
                $element.find("[data-progress]").html(torrent.progressHuman);
                $element.find("[data-size]").html(torrent.lengthHuman);
            });
            return;
        }

        this.client.torrents.forEach((torrent) => {
            const $element = $(`[data-id='${torrent.infoHash}']`);
            torrent.lengthHuman = this.humanFileSize(torrent.length, true);
            torrent.uploadSpeedHuman = this.humanFileSize(torrent.uploadSpeed, true) + "/s";
            $element.find("[data-peers]").html(torrent.numPeers);
            $element.find("[data-upload-speed]").html(torrent.uploadSpeedHuman);
            $element.find("[data-size]").html(torrent.lengthHuman);

        });
    }

    downloadBlob(infoHash) {
        const torrent = this.client.get(infoHash);
        if (!torrent.bloburl){
            torrent.files.forEach(function (file) {
                file.getBlobURL(function (err, url) {
                    torrent.bloburl = url;

                    const anchorElement = document.createElement('a');
                    document.body.appendChild(anchorElement);
                    anchorElement.download = file.name;
                    anchorElement.href = torrent.bloburl;
                    anchorElement.click();
                    anchorElement.parentNode.removeChild(anchorElement);
                });
            });
            return;
        }
        const anchorElement = document.createElement('a');
        document.body.appendChild(anchorElement);
        anchorElement.href = torrent.bloburl;
        anchorElement.click();
        anchorElement.parentNode.removeChild(anchorElement);
    }

    share(infoHash) {
        // encrypt the info hash:
        const torrent = this.client.get(infoHash);
        if (!torrent) {
            return false;
        }

        this.password = CryptoJS.SHA512(secureRandom.randomBuffer(256).toString()).toString();

        const crypto = CryptoJS.AES.encrypt(JSON.stringify({
            infoHash: torrent.infoHash,
            filename: torrent.name
        }), this.password);

        torrent.shareUrl = `https://peer.cat/#${crypto}:${this.password}`;

        $("#share-modal [data-link]").html(torrent.shareUrl);

        UIkit.modal("#share-modal").show();
    }

    /**
     * Remove a torrent from peercat
     * This immediately stops sharing a file to torrents and disconnects with all peers.
     * @param infoHash string The torrents infoHash
     */
    remove(infoHash) {
        this.client.remove(infoHash);
        $(`[data-id='${infoHash}']`).remove();
        this.update();

        if (!this.client.torrents.length){
            $("#uploader").fadeIn();
        }
    }

    humanFileSize(bytes, si) {
        var thresh = si ? 1000 : 1024;
        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        var units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1) + ' ' + units[u];
    }
}


class FileUploader {
    constructor() {
        this.events = {};
    }

    on(event, cb) {
        if (typeof this.events[event] === "undefined") {
            this.events[event] = [];
        }

        this.events[event].push(cb);
    }

    trigger(eventName, args) {
        (this.events[eventName] || []).forEach((cb) => {
            cb(args);
        });
    }

    init(progressBar, uploadField) {
        UIkit.upload(uploadField, {

            url: '',
            multiple: true,

            beforeAll: (args, files) => {
                this.trigger("files:added", files);
            },
            /* load: function () {
                 console.log('load', arguments);
             },
             error: function () {
                 console.log('error', arguments);
             },
             complete: function () {
                 console.log('complete', arguments);
             },

             loadStart: function (e) {
                 console.log('loadStart', arguments);

                 progressBar.removeAttribute('hidden');
                 progressBar.max = e.total;
                 progressBar.value = e.loaded;
             },

             progress: function (e) {
                 console.log('progress', arguments);

                 progressBar.max = e.total;
                 progressBar.value = e.loaded;
             },

             loadEnd: function (e) {
                 console.log('loadEnd', arguments);

                 progressBar.max = e.total;
                 progressBar.value = e.loaded;
             },

             completeAll: function () {
                 console.log('completeAll', arguments);

                 setTimeout(function () {
                     progressBar.setAttribute('hidden', 'hidden');
                 }, 1000);

                 alert('Upload Completed');
             }*/
        });
    }
}