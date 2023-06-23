class AccordianItem {
    constructor($item, accordion) {
        this.isOpen = false;

        // DOM
        this.$item = $item;
        this.$title = $item.querySelector('.tst-accordion-title');
        this.$body = $item.querySelector('.tst-accordion-body');
        this.accordion = accordion;

        this.initListeners();
    }

    initListeners() {
        this.$item.addEventListener(
            'click',
            () => this.onClick(),
            false,
        );
    }

    onClick() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.$item.classList.add('open');
        this.isOpen = true;
        this.accordion.itemOpened(this);
    }

    close() {
        this.$item.classList.remove('open');
        this.isOpen = false;
    }
}

class Accordian {
    constructor($accordion) {
        this.openItem = null;

        this.$accordion = $accordion;
        const itemsArr = Array.from($accordion.querySelectorAll('.tst-accordion-item'));
        this.items = itemsArr.map((el) => new AccordianItem(el, this));
    }

    itemOpened(item) {
        if (this.openItem) {
            this.openItem.close();
        }
        this.openItem = item;
    }
}

export default function () {
    const accordion = $('.tst-accordion');
    accordion.each((i, elem) => new Accordian(elem));
}
