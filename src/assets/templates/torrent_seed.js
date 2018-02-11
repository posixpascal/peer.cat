import {template} from "./template";

export const TORRENT_TEMPLATE = torrent => template`
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
                <li uk-tooltip="Share link" onclick="window.peercat.showShareModal('${'infoHash'}')" class="uk-padding-small uk-padding-horizontal uk-text-warning">
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