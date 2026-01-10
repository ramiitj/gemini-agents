// Script to be injected into the preview iframe for visual element selection
export const VISUAL_EDIT_SCRIPT = `
(function() {
  if (window.__visualEditInitialized) return;
  window.__visualEditInitialized = true;

  let highlightOverlay = null;
  let selectedOverlay = null;
  let isActive = true;

  // Create overlay element
  function createOverlay(color, zIndex) {
    const overlay = document.createElement('div');
    overlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      border: 2px solid \${color};
      background: \${color}20;
      z-index: \${zIndex};
      transition: all 0.1s ease;
      border-radius: 2px;
    \`;
    document.body.appendChild(overlay);
    return overlay;
  }

  // Initialize overlays
  highlightOverlay = createOverlay('#3b82f6', 99998);
  selectedOverlay = createOverlay('#22c55e', 99999);
  selectedOverlay.style.borderWidth = '3px';

  // Generate unique CSS selector for an element
  function getSelector(el) {
    if (!el || el === document.body || el === document.documentElement) {
      return 'body';
    }

    // Use ID if available
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }

    // Build path
    const path = [];
    let current = el;

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();

      // Add relevant classes (filtering out dynamic ones)
      const classes = Array.from(current.classList || [])
        .filter(c => !c.match(/^(hover|focus|active|\\d)/))
        .slice(0, 2);
      
      if (classes.length > 0) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // Get relevant computed styles
  function getRelevantStyles(el) {
    const computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      padding: computed.padding,
      margin: computed.margin,
      borderRadius: computed.borderRadius,
      border: computed.border,
      width: computed.width,
      height: computed.height,
      display: computed.display,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      textAlign: computed.textAlign,
      textDecoration: computed.textDecoration,
      opacity: computed.opacity,
      boxShadow: computed.boxShadow
    };
  }

  // Get element info
  function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    return {
      selector: getSelector(el),
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      id: el.id || '',
      textContent: (el.textContent || '').trim().substring(0, 200),
      innerHTML: el.innerHTML.substring(0, 500),
      outerHTML: el.outerHTML.substring(0, 1000),
      computedStyles: getRelevantStyles(el),
      boundingBox: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      },
      attributes: Array.from(el.attributes || []).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {})
    };
  }

  // Position overlay on element
  function positionOverlay(overlay, el) {
    const rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  // Hide overlay
  function hideOverlay(overlay) {
    overlay.style.display = 'none';
  }

  // Should ignore element
  function shouldIgnore(el) {
    if (!el || el === document.body || el === document.documentElement) return true;
    if (el === highlightOverlay || el === selectedOverlay) return true;
    if (el.closest('[data-visual-edit-ignore]')) return true;
    return false;
  }

  // Mouse move handler
  function handleMouseMove(e) {
    if (!isActive) return;
    
    const target = e.target;
    if (shouldIgnore(target)) {
      hideOverlay(highlightOverlay);
      return;
    }

    positionOverlay(highlightOverlay, target);
  }

  // Click handler
  function handleClick(e) {
    if (!isActive) return;
    
    const target = e.target;
    if (shouldIgnore(target)) return;

    e.preventDefault();
    e.stopPropagation();

    positionOverlay(selectedOverlay, target);
    
    const info = getElementInfo(target);
    
    // Security: Use specific origin instead of wildcard
    // Get parent origin from ancestor origins or referrer
    const parentOrigin = getParentOrigin();
    window.parent.postMessage({
      type: 'VISUAL_EDIT_ELEMENT_SELECTED',
      data: info
    }, parentOrigin);
  }

  // Get the parent window's origin safely
  function getParentOrigin() {
    try {
      // Try to get from ancestor origins (most reliable)
      if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
        return window.location.ancestorOrigins[0];
      }
      // Fallback to document.referrer
      if (document.referrer) {
        const url = new URL(document.referrer);
        return url.origin;
      }
      // Last resort: same origin
      return window.location.origin;
    } catch (e) {
      // If all else fails, use same origin
      return window.location.origin;
    }
  }

  // Allowed message types for security
  const ALLOWED_MESSAGE_TYPES = ['VISUAL_EDIT_TOGGLE', 'VISUAL_EDIT_CLEAR_SELECTION'];

  // Listen for messages from parent with origin validation
  window.addEventListener('message', (e) => {
    // Validate message origin
    const expectedOrigin = getParentOrigin();
    
    // Allow same-origin and expected parent origin
    if (e.origin !== expectedOrigin && e.origin !== window.location.origin) {
      // In development, also allow localhost variants
      const isLocalDev = e.origin.includes('localhost') || e.origin.includes('127.0.0.1');
      const targetIsLocalDev = expectedOrigin.includes('localhost') || expectedOrigin.includes('127.0.0.1');
      if (!(isLocalDev && targetIsLocalDev)) {
        console.warn('[Visual Edit] Rejected message from untrusted origin:', e.origin);
        return;
      }
    }

    // Validate message structure and type
    if (!e.data || typeof e.data !== 'object' || typeof e.data.type !== 'string') {
      return;
    }

    // Only process allowed message types
    if (!ALLOWED_MESSAGE_TYPES.includes(e.data.type)) {
      return;
    }

    if (e.data.type === 'VISUAL_EDIT_TOGGLE') {
      isActive = !!e.data.active;
      if (!isActive) {
        hideOverlay(highlightOverlay);
        hideOverlay(selectedOverlay);
      }
    }
    if (e.data.type === 'VISUAL_EDIT_CLEAR_SELECTION') {
      hideOverlay(selectedOverlay);
    }
  });

  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);

  // Send ready signal with specific origin
  const parentOrigin = getParentOrigin();
  window.parent.postMessage({ type: 'VISUAL_EDIT_READY' }, parentOrigin);

  console.log('[Visual Edit] Initialized with secure postMessage');
})();
`;

export interface ElementInfo {
  selector: string;
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  innerHTML: string;
  outerHTML: string;
  computedStyles: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
  attributes: Record<string, string>;
}
