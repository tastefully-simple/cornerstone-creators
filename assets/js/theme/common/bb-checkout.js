import PageManager from '../page-manager';
import BbAffiliationCheck from './bb-affiliation-check';

export default class BbCheckout extends PageManager {
    onReady() {
        this.initBbAffiliationCheck();
    }

    initBbAffiliationCheck() {
        return new BbAffiliationCheck();
    }
}
