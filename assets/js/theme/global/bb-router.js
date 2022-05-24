import BBCookie from '../common/bb-cookie';

export default class BBRouter {
    constructor(settings) {
        this.settings = settings;
        this.checkUrls();
    }

    checkUrls() {
        // Function returns true to stop routing chain
        return this.checkUrlForConsultantId();
    }

    checkUrlForConsultantId() {
        const szUrl = window.location.search;
        const matches = szUrl.match(/cid=\d+/ig);

        if (matches) {
            const consultantId = matches[0].substring(4);
            BBCookie.setConsultantId(consultantId);

            return true;
        }
        return false;
    }
}
