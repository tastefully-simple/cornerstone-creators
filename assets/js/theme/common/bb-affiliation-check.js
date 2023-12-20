import TSApi from './ts-api';
import BBCookie from './bb-cookie';

export default class BbAffiliationCheck {
    constructor() {
        this.api = new TSApi();
        this.init();
    }

    init() {
        this.getCartData()
            .then(cart => {
                if (cart.length > 0) {
                    const affiliations = {
                        cartID: cart[0].id,
                        // cart[0].email returns "" when user not signed in
                        email: cart[0].email ? cart[0].email : undefined,
                        consultantID: BBCookie.getConsultantId() ?? "0799999",
                    };
                    this.api.affiliationCheck(affiliations);
                }
            })
            .catch(err => console.warn('StorefrontAPI::getCart()', err));
    }

    /**
     * Retrieve data from the current cart
     * @returns {Promise<any>}
     */
    getCartData() {
        return fetch('/api/storefront/cart', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json());
    }
}
