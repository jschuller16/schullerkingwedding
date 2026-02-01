/**
 * ============================================
 * ACCORDION & FAQ COMPONENTS
 * Expandable sections for Travel and FAQ
 * ============================================
 */

(function() {
    'use strict';

    // ----------------------------------------
    // ACCORDION COMPONENT
    // For Travel section
    // ----------------------------------------

    function initAccordions() {
        const accordionItems = document.querySelectorAll('.accordion__item');
        
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion__header');
            const content = item.querySelector('.accordion__content');
            
            if (!header || !content) return;
            
            header.addEventListener('click', () => {
                const isOpen = header.getAttribute('aria-expanded') === 'true';
                
                // Close all other items in this accordion
                const accordion = item.closest('.accordion');
                if (accordion) {
                    accordion.querySelectorAll('.accordion__item').forEach(otherItem => {
                        if (otherItem !== item) {
                            closeAccordionItem(otherItem);
                        }
                    });
                }
                
                // Toggle current item
                if (isOpen) {
                    closeAccordionItem(item);
                } else {
                    openAccordionItem(item);
                }
            });
            
            // Keyboard support
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });
        });
    }

    function openAccordionItem(item) {
        const header = item.querySelector('.accordion__header');
        header.setAttribute('aria-expanded', 'true');
        item.classList.add('accordion__item--open');
    }

    function closeAccordionItem(item) {
        const header = item.querySelector('.accordion__header');
        header.setAttribute('aria-expanded', 'false');
        item.classList.remove('accordion__item--open');
    }

    // ----------------------------------------
    // FAQ COMPONENT
    // Similar to accordion but independent items
    // ----------------------------------------

    function initFAQ() {
        const faqItems = document.querySelectorAll('.faq__item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq__question');
            const answer = item.querySelector('.faq__answer');
            
            if (!question || !answer) return;
            
            question.addEventListener('click', () => {
                const isOpen = question.getAttribute('aria-expanded') === 'true';
                
                if (isOpen) {
                    closeFAQItem(item);
                } else {
                    openFAQItem(item);
                }
            });
            
            // Keyboard support
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    question.click();
                }
            });
        });
    }

    function openFAQItem(item) {
        const question = item.querySelector('.faq__question');
        question.setAttribute('aria-expanded', 'true');
        item.classList.add('faq__item--open');
    }

    function closeFAQItem(item) {
        const question = item.querySelector('.faq__question');
        question.setAttribute('aria-expanded', 'false');
        item.classList.remove('faq__item--open');
    }

    // ----------------------------------------
    // INITIALIZE
    // ----------------------------------------

    function init() {
        initAccordions();
        initFAQ();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
