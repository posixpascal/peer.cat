import { Peercat } from "./peercat";

window.peercat = new Peercat();
document.addEventListener("DOMContentLoaded", () => {
    const clipboard = new Clipboard('[data-clipboard-target]');
    clipboard.on('success', function(e) {
        UIkit.notification({
            message: 'Copied link to clipboard!',
            status: 'primary',
            pos: 'top',
            timeout: 3000
        });

        e.clearSelection();
    });
    peercat.run()
});