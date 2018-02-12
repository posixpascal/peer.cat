import {template} from "./template";

/**
 * Download Torrent Template
 * This renders a HTML view for a given torrent
 * @param {Torrent} torrent The torrent you want to generate a template for
 */
export const DOWNLOAD_TORRENT_TEMPLATE = torrent => template`
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
