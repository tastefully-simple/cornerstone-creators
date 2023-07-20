class StickyHeader {
    constructor($header, config) {
        this.$header = $header;
        this.sticky = $header.offsetTop;
        this.config = config;

        window.addEventListener('scroll', () => (
            this.onScroll(this.$header, this.sticky, this.config.screenMinWidth)
        ));

        // Change the position of the mega menu if the Consultant bar is being displayed
        if (window.Cookies.get('cid') !== undefined) {
            document.getElementById('headerMain').classList.add('consultant-bar-open');
        }
    }

    onScroll($mainHeader, sticky, screenMinWidth) {
        const $navlinks = document.querySelector('.header-top-links');
        const $topHeaderContainer = document.querySelector('header .header-top .container');
        const $mainHeaderContainer = $mainHeader.querySelector('.container');

        if (window.pageYOffset > sticky && (window.innerWidth >= screenMinWidth)) {
            $mainHeader.classList.add('sticky-header');
            $mainHeaderContainer.appendChild($navlinks);
        } else {
            $mainHeader.classList.remove('sticky-header');
            $topHeaderContainer.appendChild($navlinks);
        }
    }
}

export default function () {
    const stickyHeader = new StickyHeader(
        document.querySelector('#headerMain'),
        { screenMinWidth: 801 },
    );

    return stickyHeader;
}
