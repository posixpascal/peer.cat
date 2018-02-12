import * as CryptoJS from 'crypto-js';
import * as secureRandom from "../vendor/secure-random";

import {humanFileSize} from "./humanFileSize";
import {TORRENT_TEMPLATE} from "./templates/torrent_seed";
import {DOWNLOAD_TORRENT_TEMPLATE} from "./templates/torrent_down";

import {FileUploader} from "./fileUploader";
import {SHARE_URL_SEPARATOR, TRACKER} from "./config/config";
import {UI} from "./ui";

/**
 * Version Tag
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * Peercat Main Class
 *
 * This class acts like a singleton most of the time. There is no need to initialize it more than once.
 */
export class Peercat {
    /**
     * Initializing Peercat
     */
    constructor() {
        /**
         * File Uploader Instance
         * @type {FileUploader}
         */
        this.fileUploader = new FileUploader();

        /**
         * WebTorrent Instance
         * @type {WebTorrent}
         */
        this.client = new WebTorrent();
    }

    /**
     * Init peer cat and all UI  features
     */
    run() {
        console.log(`🐈  peercat V${VERSION}`);
        UI.hideDownloadFeatures();

        // User tries to connect to other peer to download file
        if (window.location.hash) {
           this.prepareDownload();
        }

        this.fileUploader.init(
            document.querySelector("#progressbar"),
            document.querySelector("#uploader")
        );


        this.fileUploader.on("files:added", (files) => {
            UI.showSpinner();
            this.client.seed(files, (torrent) => { this.onTorrentSeed(torrent) });
        });
    }

    /**
     * Prepares the UI to download a torrent instead of offering one.
     */
    prepareDownload(){
        UI.hideUploadFeatures();

        // Receive info hash
        let [infoHashEnc, password] = window.location.hash.substring(1).split(SHARE_URL_SEPARATOR);
        const data = Peercat.decrypt(infoHashEnc, password);

        /**
         * Current downloading torrent identifier
         * @type {string}
         */
        this.infoHash = data.infoHash;

        /**
         * Current downloading torrent filename
         * @type {string}
         */
        this.filename = data.filename;

        // prepare download
        UI.showDownloadFeatures();
    }

    /**
     * Load the torrent and add it to the download queue
     */
    download() {
        UI.showSpinner();
        UI.hideDownloadFeatures();
        const torrentUrl = this.buildMagnetUri();

        /**
         * Timeout for when a connection to a torrent server could not be made.
         * @type {number}
         */
        this.torrentTimeout = setTimeout(() => {
            this.client.remove(this.infoHash);
            UI.showFailedToDownloadMessage();
        }, 6000);

        this.client.add(torrentUrl, (torrent) => { this.onTorrentDownload(torrent) });
    }


    /**
     * Called when a torrent was uploaded through the file dialog
     * @param {Torrent} torrent The torrent that gets uploaded
     */
    onTorrentSeed(torrent) {
        UI.hideSpinner();
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
    }

    /**
     * Called when a torrent was added to download queue via URL
     * @param {Torrent} torrent The torrent that gets downloaded
     */
    onTorrentDownload(torrent) {
        clearTimeout(this.torrentTimeout);
        UI.hideSpinner();

        torrent.status = "waiting";
        torrent.on("download", () => {
            torrent.status = "downloading";
            this.update(true);
        });

        const html = DOWNLOAD_TORRENT_TEMPLATE(torrent);
        $(".downloads").append(html);

        torrent.on('done', () => {
            torrent.status = 'done';
            this.update(true);
            UI.enableDownloadButton(torrent);
        });

        torrent.on('error', () => {
            torrent.status = 'error';
            this.update(true);
        });

        this.update(true);

        torrent.files.forEach((file) => this.downloadFile(torrent, file));
    }

    /**
     * Parse a torrents bloburl and try to download it.
     * @param {Torrent} torrent
     * @param {TorrentFile} file
     */
    downloadFile(torrent, file) {
        file.getBlobURL((err, url) => {
            torrent.bloburl = url;
            Peercat.requestDownload(file.name, torrent.bloburl);
        });
    }

    /**
     * Try to download the file using a newly created anchor tag.
     * This may or may not work depending on how long the user waits for his actions.
     * I usually just call this and if the browser blocks it I'm okay with it
     * @param {string} fileName
     * @param {string} blobUrl
     */
    static requestDownload(fileName, blobUrl) {
        const anchorElement = document.createElement('a');
        document.body.appendChild(anchorElement);
        anchorElement.download = fileName;
        anchorElement.href = blobUrl;
        anchorElement.click();
        anchorElement.parentNode.removeChild(anchorElement);
    }

    /**
     * Update views, progressbars etc.
     */
    update(downloadSide) {
        const viewDataMapping = {
            'status': 'status',
            'download-speed': 'downloadSpeedHuman',
            'upload-speed': 'uploadSpeedHuman',
            'progress': 'progressHuman',
            'peers': 'numPeers',
            'size': 'lengthHuman'
        };

        this.client.torrents.forEach((torrent) => {
            const $element = $(`[data-id='${torrent.infoHash}']`);
            torrent.lengthHuman = humanFileSize(torrent.length, true);
            torrent.uploadSpeedHuman = humanFileSize(torrent.uploadSpeed, true) + "/s";

            if (torrent.status === "done") {
                torrent.progressHuman = "100";
                torrent.downloadSpeedHuman = "0 KB/s";
            } else {
                torrent.progressHuman = (torrent.progress * 100).toFixed(2);
                torrent.downloadSpeedHuman = humanFileSize(torrent.downloadSpeed, true) + "/s";
            }

            for (let key in viewDataMapping){
                if (viewDataMapping.hasOwnProperty(key)){
                    $element.find(`[data-${key}]`).html(torrent[key]);
                }
            }
        });
    }

    /**
     * Request to download the blob of a given torrent and try to download it using @see requestDownload
     * @param {string} infoHash
     */
    downloadBlob(infoHash) {
        const torrent = this.client.get(infoHash);
        if (!torrent.bloburl) {
            torrent.files.forEach((file) => this.downloadFile(torrent, file));
            return;
        }

        Peercat.requestDownload(torrent.infoHash, torrent.bloburl);
    }

    /**
     * Decrypt a given string using a given password
     * @param {string} data The AES sequence to decrypt
     * @param {string} password The password to decrypt
     * @returns {string} The decrypted string
     */
    static decrypt(data, password){
        return JSON.parse(CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8));
    }

    /**
     * Encrypt a given string using a given password
     * @param {JSON} data JSON payload to encrypt
     * @param {string} password The password used to encrypt
     * @returns {string} The encrypted string
     */
    static encrypt(data, password) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), password);
    }

    /**
     * Generate a random 256 bytes long password using a buffer
     * @returns {string} A sha512 string built by using a randombuffer of 256
     */
    static randomPassword() {
        return CryptoJS.SHA512(secureRandom.randomBuffer(256).toString()).toString();
    }

    /**
     * Generate a share URL for other people to download this torrent
     * @param {Torrent} torrent the torrent to generate a share url for
     * @returns {string} The share url for the given torrent
     */
    static generateShareUrl(torrent){
        this.randomPassword = Peercat.randomPassword();

        const crypto = Peercat.encrypt({
            infoHash: torrent.infoHash,
            filename: torrent.name
        }, this.randomPassword);

        return `https://peer.cat/#${crypto}${SHARE_URL_SEPARATOR}${this.randomPassword}`;
    }

    /**
     * Build a magnet uri on the current downloading torrent file
     * @returns {string}
     */
    buildMagnetUri(){
        return `magnet:?xt=urn:btih:${this.infoHash}&dn=${this.filename}&tr=${TRACKER}`;
    }

    /**
     * Show the share modal view and populate it with data
     * @param {Torrent|string} torrentIdentifier The infohash of the torrent you want to share
     * @returns {boolean}
     */
    showShareModal(torrentIdentifier) {
        if (typeof torrentIdentifier !== "string"){
            torrentIdentifier = torrentIdentifier.infoHash;
        }

        const torrent = this.client.get(torrentIdentifier);
        if (!torrent) {
            return false;
        }

        torrent.shareUrl = Peercat.generateShareUrl(torrent);

        UI.showShareModal(torrent);
    }

    /**
     * Remove a torrent from peercat
     * This immediately stops sharing a file to torrents and disconnects with all peers.
     * @param {string} infoHash The torrents infoHash
     */
    remove(infoHash) {
        this.client.remove(infoHash);
        this.update();

        UI.removeTorrent(infoHash);
        if (!this.client.torrents.length) {
            UI.showUploadFeatures();
        }
    }
}

