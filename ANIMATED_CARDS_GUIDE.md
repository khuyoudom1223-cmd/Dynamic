# 🎨 Animated Cards UI - Complete Guide

A modern, premium animated card component with smooth entrance animations, press effects, and horizontal scrolling. Inspired by Netflix and Shopee UX patterns.

## 📁 Files Created

```
public/
├── css/
│   └── animated-cards.css       # All styles and animations
├── js/
│   └── animated-cards.js        # Interactive functionality
└── demo-animated-cards.html     # Live demo page

views/partials/
└── animated-cards.ejs           # Reusable EJS component
```

## 🚀 Quick Start

### 1. **Include CSS & JS in your EJS/HTML**

```html
<!-- In your head section -->
<link rel="stylesheet" href="/css/animated-cards.css">

<!-- Before closing body -->
<script src="/js/animated-cards.js"></script>
```

### 2. **Use the Partial in Your View**

```ejs
<!-- In any .ejs file -->
<%- include('./partials/animated-cards') %>
```

### 3. **View the Demo**

Open in browser: `http://localhost:3000/demo-animated-cards.html`

---

## ✨ Features

### **Entrance Animations**
- ✅ Fade-in effect (0% → 100% opacity)
- ✅ Slide-up from bottom (40px translation)
- ✅ Staggered delays (each card appears 100ms apart)
- ✅ Smooth cubic-bezier easing

### **Press Effects**
- ✅ Scale down to 0.96 on tap/click
- ✅ Instant shadow reduction for haptic feel
- ✅ Smooth return to normal state
- ✅ Works on touch and mouse input

### **Hover States**
- ✅ Smooth elevation (translateY -8px on desktop, -12px on large screens)
- ✅ Enhanced shadow on hover
- ✅ Image opacity increase
- ✅ Button lift effect

### **Scroll Features**
- ✅ Smooth horizontal scrolling
- ✅ Snap points for proper alignment
- ✅ Touch-friendly scrolling (`-webkit-overflow-scrolling: touch`)
- ✅ Auto-updating scroll indicators

### **Design Elements**
- ✅ Rounded corners (20px border-radius)
- ✅ Soft shadows (elevation system)
- ✅ Gradient backgrounds (5 different gradients)
- ✅ Shine effect animation
- ✅ Premium button styling

### **Responsive**
- ✅ Mobile optimized (280px width)
- ✅ Tablet enhanced (320px width)
- ✅ Desktop premium (360px width)
- ✅ Touch device detection

### **Accessibility**
- ✅ Dark mode support
- ✅ `prefers-reduced-motion` respected
- ✅ Keyboard navigation support
- ✅ Semantic HTML structure
- ✅ ARIA attributes ready

---

## 🎮 JavaScript API

### **Initialize**

```javascript
// Auto-initialized on page load
window.animatedCards

// Or manually:
const cards = new AnimatedCards('.animated-cards-container');
```

### **Methods**

#### `scrollToCard(index)`
Scroll smoothly to a specific card.

```javascript
window.animatedCards.scrollToCard(0);  // First card
window.animatedCards.scrollToCard(2);  // Third card
```

#### `updateCard(index, data)`
Update card content dynamically.

```javascript
window.animatedCards.updateCard(0, {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  title: 'New Title',
  description: 'New description text',
  buttonText: 'Updated Button'
});
```

#### `addCard(data)`
Add a new card dynamically.

```javascript
window.animatedCards.addCard({
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  title: 'New Card',
  description: 'Card description goes here',
  buttonText: 'Click Me'
});
```

#### `getActiveCardIndex()`
Get the currently visible card index.

```javascript
const activeIndex = window.animatedCards.getActiveCardIndex();
console.log(activeIndex);  // 0, 1, 2, 3, or 4
```

#### `destroy()`
Clean up and remove event listeners.

```javascript
window.animatedCards.destroy();
```

---

## 🎨 Customization

### **CSS Variables**

Edit these in `animated-cards.css` to customize:

```css
:root {
  --card-width: 280px;                    /* Card width (responsive) */
  --card-height: 380px;                   /* Card height */
  --card-gap: 16px;                       /* Gap between cards */
  --animation-duration: 0.6s;             /* Entrance animation duration */
  --animation-delay-step: 0.1s;           /* Delay between card animations */
  --transition-smooth: cubic-bezier(...); /* Entrance easing */
  --transition-ease: cubic-bezier(...);   /* Interaction easing */
}
```

### **Change Card Colors**

In `animated-cards.ejs`, modify the gradient:

```ejs
<div class="card-image" style="background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);"></div>
```

### **Modify Card Content**

Edit the card structure in `animated-cards.ejs`:

```ejs
<div class="card card-item" data-index="0">
  <div class="card-image" style="..."></div>
  <div class="card-content">
    <h3 class="card-title">Your Title</h3>
    <p class="card-description">Your description</p>
    <button class="card-button">Your Button</button>
  </div>
  <div class="card-shine"></div>
</div>
```

### **Button Click Handler**

The `handleButtonClick` method logs card info. Customize by editing:

```javascript
// In animated-cards.js, find:
handleButtonClick(button, card) {
  // Add your custom logic here
  console.log('Card button clicked:', card.querySelector('.card-title').textContent);
}
```

---

## 📱 Mobile Considerations

### **Touch Optimization**
- Cards disable hover states on touch devices
- Press effect uses `pointerdown/pointerup` for compatibility
- `-webkit-overflow-scrolling: touch` for smooth momentum scrolling
- Responsive sizes automatically adjust

### **Performance**
- Hardware-accelerated animations (`transform`, `opacity`)
- Debounced scroll indicator updates (100ms)
- Efficient event delegation
- CSS animations (better than JS for performance)

### **Dark Mode**
The component automatically respects `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles applied automatically */
}
```

---

## 🔧 Integration Examples

### **Example 1: Use in Dashboard**

```ejs
<!-- views/admin/dashboard.ejs -->
<div class="dashboard-section">
  <h2>Featured Products</h2>
  <%- include('../partials/animated-cards') %>
</div>
```

### **Example 2: Update Cards with API Data**

```javascript
// Fetch and update cards
async function loadProducts() {
  const response = await fetch('/api/products');
  const products = await response.json();
  
  products.forEach((product, index) => {
    window.animatedCards.updateCard(index, {
      title: product.name,
      description: product.description,
      background: `url(${product.image})`,
      buttonText: 'View'
    });
  });
}

// Call after cards are ready
window.addEventListener('load', loadProducts);
```

### **Example 3: Custom Event Handling**

```javascript
// Add custom click handler to cards
document.querySelectorAll('.card-button').forEach((btn, index) => {
  btn.addEventListener('click', () => {
    const cardIndex = btn.closest('.card').dataset.index;
    console.log('Button clicked on card:', cardIndex);
    // Your custom logic here
  });
});
```

---

## 🎬 Animation Breakdown

### **Entrance Animation (0.6s)**
```
Timeline:
0ms    → 600ms
[Fade & Slide-up]
```

Curve: `cubic-bezier(0.34, 1.56, 0.64, 1)` (smooth spring effect)

### **Staggered Delays**
```
Card 1: 0ms
Card 2: 100ms
Card 3: 200ms
Card 4: 300ms
Card 5: 400ms
```

### **Press Effect (Instant)**
```
Scale: 1 → 0.96
Shadow: Elevated → Reduced
Transition: 0.3s ease
```

### **Hover Effect (Desktop)**
```
Translation: 0 → -12px (vertical)
Shadow: Elevated → More Elevated
Opacity: 0.9 → 1 (image)
```

---

## ⚡ Performance Tips

1. **Use Horizontal Scroll Instead of Grid**
   - Better on mobile
   - Touch-friendly
   - Better performance

2. **Lazy Load Card Images**
   ```javascript
   // Add to card-image divs
   loading="lazy"
   ```

3. **Limit Active Animations**
   - Only 5 cards shown at once
   - Others render but not visible
   - Better memory usage

4. **Respect Motion Preferences**
   - `prefers-reduced-motion` automatically handled
   - Animations disabled for users who prefer reduced motion

---

## 🐛 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| IE 11 | ⚠️ Partial (no animations) |

---

## 🚨 Troubleshooting

### **Cards not animating?**
1. Check if `animated-cards.css` is included
2. Verify `animated-cards.js` is loaded
3. Check browser console for errors
4. Ensure `prefers-reduced-motion` is not enabled

### **Scroll not working?**
1. Verify container has proper overflow settings
2. Check if cards have `scroll-snap-align`
3. Test on actual touch device (desktop scroll works differently)

### **Indicators not updating?**
1. Check if scroll indicators exist in HTML
2. Verify JavaScript is loaded
3. Check console for JavaScript errors

### **Press effect not visible?**
1. Test on touch device or use device emulation
2. Check CSS `pressed` class styling
3. Verify `pointerdown` events are firing

---

## 📚 File Reference

### **animated-cards.css** (340+ lines)
- Entrance animations (@keyframes)
- Card styling (shadow, border-radius)
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Accessibility features
- Scroll indicator styles

### **animated-cards.js** (280+ lines)
- AnimatedCards class
- Event handlers (press, scroll, indicators)
- Utility methods (scroll, update, add cards)
- Ripple effect animation
- Auto-initialization

### **animated-cards.ejs** (Reusable)
- 5 sample cards with gradients
- Scroll indicators
- Proper semantic HTML
- Data attributes for JavaScript

### **demo-animated-cards.html** (Complete demo)
- Live demo with controls
- Feature showcase
- Interactive buttons
- Dark mode support
- Mobile responsive

---

## 💡 Tips & Tricks

1. **Add Images to Cards**
   ```ejs
   <div class="card-image" style="background: url('/path/to/image.jpg'); background-size: cover;">
   </div>
   ```

2. **Change Animation Speed**
   ```css
   :root {
     --animation-duration: 0.8s;  /* Slower */
     --animation-delay-step: 0.15s;  /* Larger stagger */
   }
   ```

3. **Custom Gradient Generator**
   Visit: https://cssgradient.io/ for custom gradients

4. **Add to Multiple Pages**
   ```ejs
   <%- include('../partials/animated-cards') %>
   ```

5. **Disable Animation for Testing**
   ```css
   .card {
     animation: none;
   }
   ```

---

## 📄 License & Attribution

Free to use and modify for any project.

---

## 🎯 Next Steps

1. ✅ Include CSS and JS in your layout
2. ✅ Add the EJS partial to your views
3. ✅ Test on different devices
4. ✅ Customize colors and content
5. ✅ Integrate with your data/API

Enjoy your modern animated cards! 🚀
