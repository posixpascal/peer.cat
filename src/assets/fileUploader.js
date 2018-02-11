export class FileUploader {
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
        });
    }
}