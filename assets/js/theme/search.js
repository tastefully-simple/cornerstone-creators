import utils, { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import FacetedSearch from './common/faceted-search';
import { announceInputErrorMessage } from './common/utils/form-utils';
import compareProducts from './global/compare-products';
import urlUtils from './common/utils/url-utils';
import Url from 'url';
import collapsibleFactory from './common/collapsible';
import 'jstree';
import nod from './common/nod';
import { normalizeFormData } from './common/utils/api';
import currencySelector from './global/currency-selector';
import $ from 'jquery';
import modalFactory, { alertModal, showAlertModal } from './global/modal';

const leftArrowKey = 37;
const rightArrowKey = 39;

const previewModal = modalFactory('#previewModal')[0];

export default class Search extends CatalogPage {
    formatCategoryTreeForJSTree(node) {
        const nodeData = {
            text: node.data,
            id: node.metadata.id,
            state: {
                selected: node.selected,
            },
        };

        if (node.state) {
            nodeData.state.opened = node.state === 'open';
            nodeData.children = true;
        }

        if (node.children) {
            nodeData.children = [];
            node.children.forEach((childNode) => {
                nodeData.children.push(this.formatCategoryTreeForJSTree(childNode));
            });
        }

        return nodeData;
    }

    showProducts(navigate = true) {
        this.$productListingContainer.removeClass('u-hidden');
        this.$facetedSearchContainer.removeClass('u-hidden');
        this.$contentResultsContainer.addClass('u-hidden');

        $('[data-content-results-toggle]').removeClass('navBar-action-color--active');
        $('[data-content-results-toggle]').addClass('navBar-action');

        $('[data-product-results-toggle]').removeClass('navBar-action');
        $('[data-product-results-toggle]').addClass('navBar-action-color--active');

        this.activateTab($('[data-product-results-toggle]'));

        if (!navigate) {
            return;
        }

        const searchData = $('#search-results-product-count span').data();
        const url =
            searchData.count > 0
                ? searchData.url
                : urlUtils.replaceParams(searchData.url, {
                    page: 1,
                });

        urlUtils.goToUrl(url);
    }

    showContent(navigate = true) {
        this.$contentResultsContainer.removeClass('u-hidden');
        this.$productListingContainer.addClass('u-hidden');
        this.$facetedSearchContainer.addClass('u-hidden');

        $('[data-product-results-toggle]').removeClass('navBar-action-color--active');
        $('[data-product-results-toggle]').addClass('navBar-action');

        $('[data-content-results-toggle]').removeClass('navBar-action');
        $('[data-content-results-toggle]').addClass('navBar-action-color--active');

        this.activateTab($('[data-content-results-toggle]'));

        if (!navigate) {
            return;
        }

        const searchData = $('#search-results-content-count span').data();
        const url =
            searchData.count > 0
                ? searchData.url
                : urlUtils.replaceParams(searchData.url, {
                    page: 1,
                });

        urlUtils.goToUrl(url);
    }

    activateTab($tabToActivate) {
        const $tabsCollection = $('[data-search-page-tabs]').find('[role="tab"]');

        $tabsCollection.each((idx, tab) => {
            const $tab = $(tab);

            if ($tab.is($tabToActivate)) {
                $tab.removeAttr('tabindex');
                $tab.attr('aria-selected', true);
                return;
            }

            $tab.attr('tabindex', '-1');
            $tab.attr('aria-selected', false);
        });
    }

    onTabChangeWithArrows(event) {
        const eventKey = event.which;
        const isLeftOrRightArrowKeydown =
            eventKey === leftArrowKey || eventKey === rightArrowKey;
        if (!isLeftOrRightArrowKeydown) return;

        const $tabsCollection = $('[data-search-page-tabs]').find('[role="tab"]');

        const isActiveElementNotTab =
            $tabsCollection.index($(document.activeElement)) === -1;
        if (isActiveElementNotTab) return;

        const $activeTab = $(`#${document.activeElement.id}`);
        const activeTabIdx = $tabsCollection.index($activeTab);
        const lastTabIdx = $tabsCollection.length - 1;

        let nextTabIdx;
        switch (eventKey) {
        case leftArrowKey:
            nextTabIdx = activeTabIdx === 0 ? lastTabIdx : activeTabIdx - 1;
            break;
        case rightArrowKey:
            nextTabIdx = activeTabIdx === lastTabIdx ? 0 : activeTabIdx + 1;
            break;
        default:
            break;
        }

        $($tabsCollection.get(nextTabIdx)).focus().trigger('click');
    }

    onReady() {
        this.$overlay = $('[data-cart-item-add] .loadingOverlay');
        this.previewModal = modalFactory('#previewModal')[0];

        compareProducts(this.context);
        this.arrangeFocusOnSortBy();

        const $searchForm = $('[data-advanced-search-form]');
        const $categoryTreeContainer = $searchForm.find('[data-search-category-tree]');
        const url = Url.parse(window.location.href, true);
        const treeData = [];
        this.$productListingContainer = $('#product-listing-container');
        this.$facetedSearchContainer = $('#faceted-search-container');
        this.$contentResultsContainer = $('#search-results-content');

        // Init faceted search
        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        // Init collapsibles
        collapsibleFactory();

        $('[data-product-results-toggle]').on('click', (event) => {
            event.preventDefault();
            this.showProducts();
        });

        $('[data-content-results-toggle]').on('click', (event) => {
            event.preventDefault();
            this.showContent();
        });

        $('[data-search-page-tabs]').on('keyup', this.onTabChangeWithArrows);

        if (
            this.$productListingContainer.find('li.product').length === 0 ||
            url.query.section === 'content'
        ) {
            this.showContent(false);
        } else {
            this.showProducts(false);
        }

        $('a.reset-btn').on('click', () =>
            this.setLiveRegionsAttributes(
                $('span.reset-message'),
                'status',
                'polite',
            ));

        const validator = this.initValidation($searchForm).bindValidation($searchForm.find('#search_query_adv'));

        this.context.categoryTree.forEach((node) => {
            treeData.push(this.formatCategoryTreeForJSTree(node));
        });

        this.categoryTreeData = treeData;
        this.createCategoryTree($categoryTreeContainer);

        $searchForm.on('submit', (event) => {
            const selectedCategoryIds = $categoryTreeContainer
                .jstree()
                .get_selected();

            if (!validator.check()) {
                return event.preventDefault();
            }

            $searchForm.find('input[name="category[]"]').remove();

            for (const categoryId of selectedCategoryIds) {
                const input = $('<input>', {
                    type: 'hidden',
                    name: 'category[]',
                    value: categoryId,
                });

                $searchForm.append(input);
            }
        });

        const $searchResultsMessage = $(`<p
            class="aria-description--hidden"
            tabindex="-1"
            role="status"
            aria-live="polite"
            >${this.context.searchResultsCount}</p>`).prependTo('body');

        setTimeout(() => $searchResultsMessage.focus(), 100);

        // Bind add to cart to all buttons in the cards
        const $addToCartForm = $('.grid-add-to-cart-form');
        $addToCartForm.on('submit', (event) => {
            event.preventDefault();
            this.addProductToCart(event);
        });
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

    loadTreeNodes(node, cb) {
        $.ajax({
            url: '/remote/v1/category-tree',
            data: {
                selectedCategoryId: node.id,
                prefix: 'category',
            },
            headers: {
                'x-xsrf-token':
                    window.BCData && window.BCData.csrf_token
                        ? window.BCData.csrf_token
                        : '',
            },
        }).done((data) => {
            const formattedResults = [];

            data.forEach((dataNode) => {
                formattedResults.push(this.formatCategoryTreeForJSTree(dataNode));
            });

            cb(formattedResults);
        });
    }

    createCategoryTree($container) {
        const treeOptions = {
            core: {
                data: (node, cb) => {
                    // Root node
                    if (node.id === '#') {
                        cb(this.categoryTreeData);
                    } else {
                        // Lazy loaded children
                        this.loadTreeNodes(node, cb);
                    }
                },
                themes: {
                    icons: true,
                },
            },
            checkbox: {
                three_state: false,
            },
            plugins: ['checkbox'],
        };

        $container.jstree(treeOptions);
    }

    initFacetedSearch() {
        // eslint-disable-next-line object-curly-newline
        const {
            onMinPriceError,
            onMaxPriceError,
            minPriceNotEntered,
            maxPriceNotEntered,
            onInvalidPrice,
        } = this.context;
        const $productListingContainer = $('#product-listing-container');
        const $contentListingContainer = $('#search-results-content');
        const $facetedSearchContainer = $('#faceted-search-container');
        const $searchHeading = $('#search-results-heading');
        const $searchCount = $('#search-results-product-count');
        const $contentCount = $('#search-results-content-count');
        const productsPerPage = this.context.searchProductsPerPage;
        const requestOptions = {
            template: {
                productListing: 'search/product-listing',
                contentListing: 'search/content-listing',
                sidebar: 'search/sidebar',
                heading: 'search/heading',
                productCount: 'search/product-count',
                contentCount: 'search/content-count',
            },
            config: {
                product_results: {
                    limit: productsPerPage,
                },
            },
            showMore: 'search/show-more',
        };

        this.facetedSearch = new FacetedSearch(
            requestOptions,
            (content) => {
                $searchHeading.html(content.heading);

                const url = Url.parse(window.location.href, true);
                if (url.query.section === 'content') {
                    $contentListingContainer.html(content.contentListing);
                    $contentCount.html(content.contentCount);
                    this.showContent(false);
                } else {
                    $productListingContainer.html(content.productListing);
                    $facetedSearchContainer.html(content.sidebar);
                    $searchCount.html(content.productCount);
                    this.showProducts(false);
                }

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

    initValidation($form) {
        this.$form = $form;
        this.validator = nod({
            submit: $form,
            tap: announceInputErrorMessage,
        });

        return this;
    }

    bindValidation($element) {
        if (this.validator) {
            this.validator.add({
                selector: $element,
                validate: 'presence',
                errorMessage: $element.data('errorMessage'),
            });
        }

        return this;
    }

    check() {
        if (this.validator) {
            this.validator.performCheck();
            return this.validator.areAll('valid');
        }

        return false;
    }
}
