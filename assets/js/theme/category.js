import utils, { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import { normalizeFormData } from './common/utils/api';
import currencySelector from './global/currency-selector';
import modalFactory, { alertModal, showAlertModal } from './global/modal';
import $ from 'jquery';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.$overlay = $('[data-cart-item-add] .loadingOverlay');
        this.validationDictionary = createTranslationDictionary(context);
        // eslint-disable-next-line no-self-assign
        this.previewModal = modalFactory('#previewModal')[0];
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () =>
            this.setLiveRegionAttributes(
                $('span.price-filter-message'),
                'status',
                'assertive',
            ));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) =>
            this.setLiveRegionAttributes(
                $(e.currentTarget).next(),
                'status',
                'polite',
            ));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () =>
            this.setLiveRegionsAttributes(
                $('span.reset-message'),
                'status',
                'polite',
            ));

        // Bind add to cart to all buttons in the cards
        const $addToCartForm = $('.grid-add-to-cart-form');
        $addToCartForm.on('submit', (event) => {
            event.preventDefault();
            this.addProductToCart(event);
        });

        this.ariaNotifyNoProducts();
    }

    /**
     *
     * Add a product to cart
     *
     */
    addProductToCart(event) {
        const $addToCartBtn = $('.button--small:first', $(event.target));
        const originalBtnVal = $addToCartBtn.val();
        const waitMessage = $addToCartBtn.data('waitMessage');
        const addedMessage = $addToCartBtn.data('addedMessage');
        const productId = $(
            'input[name=product_id]:first',
            $(event.target),
        ).val();
        const productQty = $('input[name=qty]:first', $(event.target)).val();

        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        // Prevent default
        event.preventDefault();

        $addToCartBtn.val(waitMessage).prop('disabled', true);

        this.$overlay.show();

        const cartFormData = new FormData();
        cartFormData.append('action', 'add');
        cartFormData.append('product_id', productId);
        cartFormData.append('qty[]', productQty);

        // Add item to cart
        utils.api.cart.itemAdd(
            normalizeFormData(cartFormData),
            (err, response) => {
                if (typeof response === 'undefined') {
                    return;
                }

                currencySelector(response.data.cart_id);
                const errorMessage = err || response.data.error;

                $addToCartBtn.val(addedMessage);

                setTimeout(() => {
                    $addToCartBtn.val(originalBtnVal).prop('disabled', false);
                }, 4000);

                this.$overlay.hide();

                // Guard statement
                if (errorMessage) {
                    // Strip the HTML from the error message
                    const tmp = document.createElement('DIV');
                    tmp.innerHTML = errorMessage;

                    if (!this.checkIsQuickViewChild($addToCartBtn)) {
                        alertModal().$preModalFocusedEl = $addToCartBtn;
                    }

                    return showAlertModal(tmp.textContent || tmp.innerText);
                }

                // Open preview modal and update content
                if (this.previewModal) {
                    if (!this.checkIsQuickViewChild($addToCartBtn)) {
                        this.previewModal.$preModalFocusedEl = $addToCartBtn;
                    }
                    this.updateCartContent(
                        this.previewModal,
                        response.data.cart_item.id,
                    );
                } else {
                    this.$overlay.show();
                    // if no modal, redirect to the cart page
                    this.redirectTo(response.data.cart_item.cart_url ||
                            this.context.urls.cart);
                }
            },
        );
        this.setLiveRegionAttributes($addToCartBtn.next(), 'status', 'polite');
    }

    /**
     * Get cart contents
     *
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
    getCartContent(cartItemId, onComplete) {
        const options = {
            template: 'cart/preview',
            params: {
                suggest: cartItemId,
            },
            config: {
                cart: {
                    suggestions: {
                        limit: 4,
                    },
                },
            },
        };

        utils.api.cart.getContent(options, onComplete);
    }

    /**
     * Update cart content
     *
     * @param {Modal} modal
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
    updateCartContent(modal, cartItemId, onComplete) {
        this.getCartContent(cartItemId, (err, response) => {
            if (err) {
                return;
            }

            modal.updateContent(response);

            // Update cart counter
            const $body = $('body');
            const $cartQuantity = $('[data-cart-quantity]', modal.$content);
            const $cartCounter = $('.navUser-action .cart-count');
            const quantity = $cartQuantity.data('cartQuantity') || 0;
            const $promotionBanner = $('[data-promotion-banner]');
            const $backToShopppingBtn = $('.previewCartCheckout > [data-reveal-close]');
            const $modalCloseBtn = $('#previewModal > .modal-close');
            const bannerUpdateHandler = () => {
                const $productContainer = $('#main-content > .container');

                $productContainer.append('<div class="loadingOverlay pdp-update"></div>');
                $('.loadingOverlay.pdp-update', $productContainer).show();
                window.location.reload();
            };

            $cartCounter.addClass('cart-count--positive');
            $body.trigger('cart-quantity-update', quantity);

            if (onComplete) {
                onComplete(response);
            }

            if ($promotionBanner.length && $backToShopppingBtn.length) {
                $backToShopppingBtn.on('click', bannerUpdateHandler);
                $modalCloseBtn.on('click', bannerUpdateHandler);
            }
        });
    }

    checkIsQuickViewChild($element) {
        return !!$element.parents('.quickView').length;
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(
            requestOptions,
            (content) => {
                $productListingContainer.html(content.productListing);
                $facetedSearchContainer.html(content.sidebar);

                $('body').triggerHandler('compareReset');

                $('html, body').animate(
                    {
                        scrollTop: 0,
                    },
                    100,
                );
            },
            {
                validationErrorMessages: {
                    onMinPriceError,
                    onMaxPriceError,
                    minPriceNotEntered,
                    maxPriceNotEntered,
                    onInvalidPrice,
                },
            },
        );
    }
}
