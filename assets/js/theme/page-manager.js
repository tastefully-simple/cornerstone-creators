import BBRouter from './global/bb-router';

export default class PageManager {
    constructor(context) {
        this.context = context;
        this.router = new BBRouter(context.themeSettings);
    }

    type() {
        return this.constructor.name;
    }

    onReady() {
    }

    static load(context) {
        const page = new this(context);

        $(document).ready(() => {
            page.onReady.bind(page)();
        });
    }
}
