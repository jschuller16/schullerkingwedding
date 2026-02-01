/**
 * ============================================
 * NAVIGATION
 * Mobile menu and scroll behavior
 * ============================================
 */

(function() {
    'use strict';

    // ----------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------
    
    const nav = document.querySelector('.nav');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav__menu');
    const navLinks = document.querySelectorAll('.nav__link');

    // ----------------------------------------
    // MOBILE MENU
    // ----------------------------------------
    
    function initMobileMenu() {
        if (!navToggle || !navMenu) return;

        navToggle.addEventListener('click', toggleMenu);
        
        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen()) {
                closeMenu();
                navToggle.focus();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuOpen() && 
                !navMenu.contains(e.target) && 
                !navToggle.contains(e.target)) {
                closeMenu();
            }
        });
    }

    function toggleMenu() {
        const isOpen = isMenuOpen();
        
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        navToggle.setAttribute('aria-expanded', 'true');
        navMenu.classList.add('nav__menu--open');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('nav__menu--open');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    function isMenuOpen() {
        return navToggle.getAttribute('aria-expanded') === 'true';
    }

    // ----------------------------------------
    // SCROLL BEHAVIOR
    // ----------------------------------------
    
    function initScrollBehavior() {
        if (!nav) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateNavOnScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Initial check
        updateNavOnScroll();
    }

    function updateNavOnScroll() {
        const scrollY = window.scrollY;
        const threshold = CONFIG?.ui?.navScrollThreshold || 50;

        if (scrollY > threshold) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
    }

    // ----------------------------------------
    // SMOOTH SCROLL
    // ----------------------------------------
    
    function initSmoothScroll() {
        // Handle all anchor links that point to IDs on the page
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                
                // Skip if just "#"
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    
                    // Account for fixed nav height
                    const navHeight = nav ? nav.offsetHeight : 0;
                    const targetPosition = targetElement.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without jumping
                    history.pushState(null, null, targetId);
                }
            });
        });
    }

    // ----------------------------------------
    // ACTIVE LINK HIGHLIGHTING
    // ----------------------------------------
    
    function initActiveLinks() {
        const sections = document.querySelectorAll('section[id]');
        
        if (sections.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -80% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    setActiveLink(id);
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    function setActiveLink(sectionId) {
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if (href === `#${sectionId}`) {
                link.classList.add('nav__link--active');
            } else {
                link.classList.remove('nav__link--active');
            }
        });
    }

    // ----------------------------------------
    // INITIALIZE
    // ----------------------------------------
    
    function init() {
        initMobileMenu();
        initScrollBehavior();
        initSmoothScroll();
        initActiveLinks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
