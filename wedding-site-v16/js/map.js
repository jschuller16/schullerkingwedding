/**
 * ============================================
 * AUSTIN MAP INTERACTIONS
 * Click-to-toggle for 4-point star markers
 * One marker open at a time
 * ============================================
 */

(function() {
    'use strict';

    let activeMarker = null;

    function initMap() {
        const mapContainer = document.querySelector('.austin-map__container');
        if (!mapContainer) return;

        const markers = mapContainer.querySelectorAll('.map-marker');
        const tooltip = mapContainer.querySelector('.austin-map__tooltip');
        const tooltipName = tooltip?.querySelector('.austin-map__tooltip-name');
        const tooltipDesc = tooltip?.querySelector('.austin-map__tooltip-desc');

        if (!tooltip || !tooltipName || !tooltipDesc) return;

        // Click handler for each marker
        markers.forEach(marker => {
            const name = marker.dataset.name;
            const desc = marker.dataset.desc;

            // Set up accessibility attributes
            marker.setAttribute('tabindex', '0');
            marker.setAttribute('role', 'button');
            marker.setAttribute('aria-label', `${name}: ${desc}`);
            marker.setAttribute('aria-expanded', 'false');

            // Click to toggle - works on both desktop and mobile
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMarker(marker, name, desc, tooltip, tooltipName, tooltipDesc, markers);
            });

            // Keyboard support
            marker.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMarker(marker, name, desc, tooltip, tooltipName, tooltipDesc, markers);
                }
                // Escape to close
                if (e.key === 'Escape' && activeMarker) {
                    closeTooltip(tooltip, markers);
                }
            });
        });

        // Click outside map to close tooltip
        document.addEventListener('click', (e) => {
            if (!mapContainer.contains(e.target)) {
                closeTooltip(tooltip, markers);
            }
        });

        // Click on map background (not marker) to close
        mapContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.map-marker')) {
                closeTooltip(tooltip, markers);
            }
        });
    }

    function toggleMarker(marker, name, desc, tooltip, tooltipName, tooltipDesc, allMarkers) {
        // If clicking the active marker, close it
        if (activeMarker === marker) {
            closeTooltip(tooltip, allMarkers);
            return;
        }

        // Close any previously open marker
        if (activeMarker) {
            activeMarker.classList.remove('map-marker--active');
            activeMarker.setAttribute('aria-expanded', 'false');
        }

        // Open clicked marker
        activeMarker = marker;
        marker.classList.add('map-marker--active');
        marker.setAttribute('aria-expanded', 'true');
        
        tooltipName.textContent = name;
        tooltipDesc.textContent = desc;
        tooltip.hidden = false;
    }

    function closeTooltip(tooltip, allMarkers) {
        tooltip.hidden = true;
        if (activeMarker) {
            activeMarker.classList.remove('map-marker--active');
            activeMarker.setAttribute('aria-expanded', 'false');
            activeMarker = null;
        }
    }

    // ----------------------------------------
    // INITIALIZE
    // ----------------------------------------

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        initMap();
    }

})();
