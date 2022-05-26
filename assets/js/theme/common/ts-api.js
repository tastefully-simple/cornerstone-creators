export default class TSApi {
    constructor() {
        this.baseUrl = window.theme_settings.ts_api_environment
            ? `https:\/\/${window.theme_settings.ts_api_environment}-${window.theme_settings.ts_tsapi_base_url}`
            : `https:\/\/${window.theme_settings.ts_tsapi_base_url}`;
    }

    /**
     * Get endpoint's full URL
     * @param uri
     * @returns {string}
     */
    fullUrl(uri) {
        return this.baseUrl + uri;
    }

    /**
     * Post affiliation info with cart data
     * @param affiliationData
     * @returns {Promise<Response>}
     */
    affiliationCheck(affiliationData) {
        return fetch(this.fullUrl('/cart/affiliationcheck'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(affiliationData),
        });
    }
}
