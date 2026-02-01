/**
 * ============================================
 * CELESTIAL EFFECTS
 * Subtle parallax and scroll-based effects
 * for the hero celestial SVG texture
 * ============================================
 * 
 * Features:
 * - Very subtle parallax on scroll (restrained)
 * - Respects prefers-reduced-motion
 * - Performance-optimized with RAF
 * - Only active within hero viewport
 */

(function() {
    'use strict';

    // ----------------------------------------
    // CONFIGURATION
    // ----------------------------------------
    
    const CONFIG = {
        // Parallax intensity - keep very low for elegance
        // Each group moves at different rates for depth
        parallaxRates: {
            group1: 0.015,   // Upper left - slowest
            group2: 0.012,   // Upper right
            group3: 0.018,   // Lower left
            group4: 0.01,    // Lower right - slowest
            stars: 0.008     // Stars - barely move
        },
        
        // Maximum parallax offset in pixels
        maxOffset: 30,
        
        // Throttle scroll events (ms)
        throttleDelay: 16  // ~60fps
    };

    // ----------------------------------------
    // STATE
    // ----------------------------------------
    
    let isReducedMotion = false;
    let heroSection = null;
    let celestialSvg = null;
    let groups = {};
    let starsGroup = null;
    let isInView = true;
    let ticking = false;
    let lastScrollY = 0;

    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------
    
    function init() {
        // Check for reduced motion preference
        isReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        
        if (isReducedMotion) {
            console.log('Celestial: Reduced motion detected, parallax disabled');
            return;
        }
        
        // Get DOM elements
        heroSection = document.getElementById('hero');
        celestialSvg = document.querySelector('.hero__celestial');
        
        if (!heroSection || !celestialSvg) {
            console.log('Celestial: Required elements not found');
            return;
        }
        
        // Get celestial groups
        groups = {
            group1: celestialSvg.querySelector('.celestial-group--1'),
            group2: celestialSvg.querySelector('.celestial-group--2'),
            group3: celestialSvg.querySelector('.celestial-group--3'),
            group4: celestialSvg.querySelector('.celestial-group--4')
        };
        
        starsGroup = celestialSvg.querySelector('.celestial-stars');
        
        // Add parallax-active class for CSS will-change
        celestialSvg.classList.add('celestial-parallax-active');
        
        // Set up intersection observer for performance
        setupIntersectionObserver();
        
        // Bind scroll handler
        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Initial position
        updateParallax();
        
        console.log('Celestial: Parallax initialized');
    }

    // ----------------------------------------
    // INTERSECTION OBSERVER
    // Only run parallax when hero is visible
    // ----------------------------------------
    
    function setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isInView = entry.isIntersecting;
            });
        }, options);
        
        observer.observe(heroSection);
    }

    // ----------------------------------------
    // SCROLL HANDLER
    // Throttled with requestAnimationFrame
    // ----------------------------------------
    
    function onScroll() {
        lastScrollY = window.scrollY;
        
        if (!ticking && isInView) {
            window.requestAnimationFrame(() => {
                updateParallax();
                ticking = false;
            });
            ticking = true;
        }
    }

    // ----------------------------------------
    // PARALLAX UPDATE
    // Applies subtle transforms to each group
    // ----------------------------------------
    
    function updateParallax() {
        if (isReducedMotion || !isInView) return;
        
        const scrollY = lastScrollY;
        const heroHeight = heroSection.offsetHeight;
        
        // Only parallax within hero section
        if (scrollY > heroHeight) return;
        
        // Calculate progress (0 to 1)
        const progress = scrollY / heroHeight;
        
        // Apply transforms to each group
        // Different directions and rates create depth
        
        if (groups.group1) {
            const offset = Math.min(scrollY * CONFIG.parallaxRates.group1, CONFIG.maxOffset);
            groups.group1.style.transform = `translate(${offset * 0.5}px, ${offset}px)`;
        }
        
        if (groups.group2) {
            const offset = Math.min(scrollY * CONFIG.parallaxRates.group2, CONFIG.maxOffset);
            groups.group2.style.transform = `translate(${-offset * 0.3}px, ${offset * 0.8}px)`;
        }
        
        if (groups.group3) {
            const offset = Math.min(scrollY * CONFIG.parallaxRates.group3, CONFIG.maxOffset);
            groups.group3.style.transform = `translate(${offset * 0.4}px, ${-offset * 0.5}px)`;
        }
        
        if (groups.group4) {
            const offset = Math.min(scrollY * CONFIG.parallaxRates.group4, CONFIG.maxOffset);
            groups.group4.style.transform = `translate(${-offset * 0.6}px, ${-offset * 0.3}px)`;
        }
        
        // Stars move even more subtly
        if (starsGroup) {
            const offset = Math.min(scrollY * CONFIG.parallaxRates.stars, CONFIG.maxOffset * 0.5);
            starsGroup.style.transform = `translate(${offset * 0.2}px, ${offset * 0.5}px)`;
        }
    }

    // ----------------------------------------
    // CLEANUP
    // ----------------------------------------
    
    function destroy() {
        window.removeEventListener('scroll', onScroll);
        
        if (celestialSvg) {
            celestialSvg.classList.remove('celestial-parallax-active');
        }
        
        // Reset transforms
        Object.values(groups).forEach(group => {
            if (group) group.style.transform = '';
        });
        
        if (starsGroup) {
            starsGroup.style.transform = '';
        }
    }

    // ----------------------------------------
    // LISTEN FOR REDUCED MOTION CHANGES
    // ----------------------------------------
    
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
        isReducedMotion = e.matches;
        
        if (isReducedMotion) {
            destroy();
        } else {
            init();
        }
    });

    // ----------------------------------------
    // INITIALIZE ON DOM READY
    // ----------------------------------------
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose destroy for potential cleanup
    window.celestialEffects = { destroy };

})();
