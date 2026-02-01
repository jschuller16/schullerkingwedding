/**
 * ============================================
 * ANIMATIONS
 * Scroll-triggered animations and effects
 * ============================================
 */

(function() {
    'use strict';

    // ----------------------------------------
    // SCROLL ANIMATIONS
    // Using Intersection Observer for performance
    // ----------------------------------------
    
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.scroll-animate');
        
        if (animatedElements.length === 0) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
            // Show all elements immediately without animation
            animatedElements.forEach(el => {
                el.classList.add('scroll-animate--visible');
            });
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-animate--visible');
                    // Optionally unobserve after animation
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => observer.observe(el));
    }

    // ----------------------------------------
    // PARALLAX EFFECTS
    // Subtle depth on scroll
    // ----------------------------------------
    
    function initParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        if (parallaxElements.length === 0) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateParallax(parallaxElements);
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    function updateParallax(elements) {
        const scrollY = window.scrollY;

        elements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.1;
            const rect = el.getBoundingClientRect();
            
            // Only animate when in viewport
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                const offset = scrollY * speed;
                el.style.transform = `translateY(${offset}px)`;
            }
        });
    }

    // ----------------------------------------
    // STAGGERED REVEAL
    // Animate children in sequence
    // ----------------------------------------
    
    function initStaggeredReveal() {
        const containers = document.querySelectorAll('[data-stagger]');
        
        if (containers.length === 0) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.2
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const children = entry.target.children;
                    const delay = parseInt(entry.target.dataset.stagger) || 100;

                    Array.from(children).forEach((child, index) => {
                        if (prefersReducedMotion) {
                            child.style.opacity = '1';
                            child.style.transform = 'none';
                        } else {
                            setTimeout(() => {
                                child.style.opacity = '1';
                                child.style.transform = 'translateY(0)';
                            }, index * delay);
                        }
                    });

                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        containers.forEach(container => {
            // Set initial styles for children
            Array.from(container.children).forEach(child => {
                child.style.opacity = '0';
                child.style.transform = 'translateY(20px)';
                child.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            });
            
            observer.observe(container);
        });
    }

    // ----------------------------------------
    // HERO ANIMATION SEQUENCE
    // Orchestrated entrance animation
    // ----------------------------------------
    
    function initHeroAnimation() {
        const hero = document.querySelector('.hero');
        
        if (!hero) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
            // Make everything visible immediately
            hero.querySelectorAll('.animate-fade-up').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.style.animation = 'none';
            });
            return;
        }

        // Hero animations are handled by CSS keyframes
        // This function can be extended for more complex sequences
    }

    // ----------------------------------------
    // IMAGE LAZY LOADING
    // Load images as they enter viewport
    // ----------------------------------------
    
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if (lazyImages.length === 0) return;

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        
                        if (img.dataset.srcset) {
                            img.srcset = img.dataset.srcset;
                        }
                        
                        img.removeAttribute('data-src');
                        img.removeAttribute('data-srcset');
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px'
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
            });
        }
    }

    // ----------------------------------------
    // CURSOR EFFECTS (optional enhancement)
    // ----------------------------------------
    
    function initCursorEffects() {
        // Only on non-touch devices
        if ('ontouchstart' in window) return;
        
        const interactiveElements = document.querySelectorAll(
            'a, button, .hover-lift, .hover-scale'
        );
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });
    }

    // ----------------------------------------
    // INITIALIZE
    // ----------------------------------------
    
    function init() {
        initHeroAnimation();
        initScrollAnimations();
        initStaggeredReveal();
        initLazyLoading();
        // initParallax(); // Disabled by default - enable if needed
        // initCursorEffects(); // Disabled by default - enable if needed
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
