/**
 * Thin wrapper around UIKits Upload Component
 */
export class FileUploader {
    /**
     * Constructor which initializes fileuploader events
     */
    constructor() {
        /**
         *
         * @type {object}
         */
        this.events = {};
    }

    /**
     * Attach listeners
     * @param {string} event The event you want to bind to
     * @param {Function} cb The callback to call
     */
    on(event, cb) {
        if (typeof this.events[event] === "undefined") {
            this.events[event] = [];
        }

        this.events[event].push(cb);
    }

    /**
     * Trigger an event with given args
     * @param {string} eventName
     * @param {Array|object} args The arguments to pass
     */
    trigger(eventName, args) {
        (this.events[eventName] || []).forEach((cb) => {
            cb(args);
        });
    }

    /**
     * Wire UIKit upload together
     * @param {HTMLElement} progressBar Progressbar element
     * @param {HTMLElement} uploadField Upload Inputfield
     */
    init(progressBar, uploadField) {
        UIkit.upload(uploadField, {
            url: '',
            multiple: true,

            beforeAll: (args, files) => {
                this.trigger("files:added", files);
            },
        });
    }
}