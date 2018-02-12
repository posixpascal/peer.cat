/**
 * A general UI class which calls jQuery DOM operations
 * @type {object}
 */
export class UI {
    /**
     * Show loading spinner
     */
    static showSpinner() {
        $(".spinner").show();
    }

    /**
     * Hide loading spinner
     */
    static hideSpinner() {
        $(".spinner").hide();
    }

    /**
     * Switch Peercats view; Hide upload features
     */
    static hideUploadFeatures() {
        $("#uploader").hide();
        $(".intro p").hide();
    }

    /**
     * Hide all download related elements
     */
    static hideDownloadFeatures(){
        $("download-cta").hide();
    }

    /**
     * Show upload related elements
     */
    static showUploadFeatures() {
        $(".intro p").hide();
        $("#uploader").fadeIn();
    }

    /**
     * Hide download related elements
     */
    static showDownloadFeatures() {
        $(".download-cta").show();
    }

    /**
     * Show a message that the file is not available
     */
    static showFailedToDownloadMessage() {
        UI.hideSpinner();
        $(".download-cta").show();
        UIkit.notification({
            message: 'This file is not available anymore.',
            status: 'danger',
            pos: 'top-center',
            timeout: 5000
        });
    }

    /**
     * Remove a given torrent from the view
     * @param {string} infoHash
     */
    static removeTorrent(infoHash){
        $(`[data-id='${infoHash}']`).remove();
    }

    /**
     * Show the share modal view for the given torrent,.
     * @param {Torrent} torrent
     */
    static showShareModal(torrent){
        $("#share-modal").find("[data-link]").html(torrent.shareUrl);
        UIkit.modal("#share-modal").show();
    }

    /**
     * Enable the download button for the given torrent.
     * @param {Torrent} torrent
     */
    static enableDownloadButton(torrent){
        $(`[data-id='${torrent.infoHash}'] .download-btn`).removeClass("uk-disabled");
    }
};