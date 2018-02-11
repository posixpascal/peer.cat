export const UI = {
    showSpinner: () => {
        $(".spinner").show();
    },

    hideSpinner: () => {
        $(".spinner").hide();
    },

    hideUploadFeatures: () => {
        $("#uploader").hide();
        $(".intro p").hide();
    },

    hideDownloadFeatures(){
        $(".download-cta").hide();
    },

    showUploadFeatures: () => {
        $(".intro p").hide();
        $("#uploader").fadeIn();
    },

    showDownloadFeatures: () => {
        $(".download-cta").show();
    },

    showFailedToDownloadMessage: () => {
        UI.hideSpinner();
        $(".download-cta").show();
        UIkit.notification({
            message: 'This file is not available anymore.',
            status: 'danger',
            pos: 'top-center',
            timeout: 5000
        });
    },

    removeTorrent: (infoHash) => {
        $(`[data-id='${infoHash}']`).remove();
    },

    showShareModal: (torrent) => {
        $("#share-modal").find("[data-link]").html(torrent.shareUrl);
        UIkit.modal("#share-modal").show();
    },

    enableDownloadButton: (torrent) => {
        $(`[data-id='${torrent.infoHash}'] .download-btn`).removeClass("uk-disabled");
    }
};