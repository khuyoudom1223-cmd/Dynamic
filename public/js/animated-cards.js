// Animated Cards Interaction Handler

class AnimatedCards {
  constructor(containerSelector = '.animated-cards-container') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error('Animated cards container not found');
      return;
    }

    this.scrollWrapper = this.container.querySelector('.cards-scroll-wrapper');
    this.cards = this.container.querySelectorAll('.card');
    this.indicators = this.container.querySelectorAll('.indicator-dot');

    this.init();
  }

  init() {
    this.attachCardListeners();
    this.attachScrollListeners();
    this.attachIndicatorListeners();
  }

  /**
   * Attach press effect and button listeners to cards
   */
  attachCardListeners() {
    this.cards.forEach((card) => {
      // Press effect on touch/mouse down
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pressCard(card);
      });

      // Release effect on touch/mouse up
      document.addEventListener('pointerup', () => {
        this.releaseCard(card);
      });

      // Cancel press if pointer leaves
      card.addEventListener('pointerleave', () => {
        this.releaseCard(card);
      });

      // Button click handler
      const button = card.querySelector('.card-button');
      if (button) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleButtonClick(button, card);
        });
      }
    });
  }

  /**
   * Apply press effect to card
   */
  pressCard(card) {
    card.classList.add('pressed');
  }

  /**
   * Release press effect from card
   */
  releaseCard(card) {
    card.classList.remove('pressed');
  }

  /**
   * Handle button click with ripple effect
   */
  handleButtonClick(button, card) {
    // Add ripple effect
    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    ripple.style.pointerEvents = 'none';
    ripple.style.animation = 'ripple 0.6s ease-out';

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => ripple.remove(), 600);

    // Trigger action (can be customized)
    console.log('Card button clicked:', card.querySelector('.card-title').textContent);
  }

  /**
   * Update scroll indicators based on scroll position
   */
  attachScrollListeners() {
    let scrollTimeout;

    this.scrollWrapper.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        this.updateIndicators();
      }, 100);
    });

    // Initial indicator update
    this.updateIndicators();
  }

  /**
   * Update active indicator based on scroll position
   */
  updateIndicators() {
    if (this.indicators.length === 0) return;

    const scrollLeft = this.scrollWrapper.scrollLeft;
    const cardWidth =
      this.cards[0].offsetWidth + parseInt(window.getComputedStyle(this.cards[0]).gap || 16);

    // Calculate which card is most visible
    const activeIndex = Math.round(scrollLeft / cardWidth);

    this.indicators.forEach((indicator, index) => {
      if (index === activeIndex) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });
  }

  /**
   * Attach indicator click listeners
   */
  attachIndicatorListeners() {
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        this.scrollToCard(index);
      });
    });
  }

  /**
   * Smooth scroll to specific card
   */
  scrollToCard(index) {
    if (index < 0 || index >= this.cards.length) return;

    const cardWidth =
      this.cards[0].offsetWidth + parseInt(window.getComputedStyle(this.cards[0]).gap || 16);
    const scrollPosition = index * cardWidth;

    this.scrollWrapper.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });

    // Update indicators
    setTimeout(() => {
      this.updateIndicators();
    }, 300);
  }

  /**
   * Add custom card data
   */
  updateCard(index, data) {
    if (index < 0 || index >= this.cards.length) return;

    const card = this.cards[index];
    const image = card.querySelector('.card-image');
    const title = card.querySelector('.card-title');
    const description = card.querySelector('.card-description');
    const button = card.querySelector('.card-button');

    if (data.background && image) {
      image.style.background = data.background;
    }
    if (data.title && title) {
      title.textContent = data.title;
    }
    if (data.description && description) {
      description.textContent = data.description;
    }
    if (data.buttonText && button) {
      button.textContent = data.buttonText;
    }
  }

  /**
   * Add new card dynamically
   */
  addCard(data) {
    const cardHTML = `
      <div class="card card-item" data-index="${this.cards.length}">
        <div class="card-image" style="background: ${data.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}"></div>
        <div class="card-content">
          <h3 class="card-title">${data.title || 'New Card'}</h3>
          <p class="card-description">${data.description || 'Card description'}</p>
          <button class="card-button">${data.buttonText || 'Learn More'}</button>
        </div>
        <div class="card-shine"></div>
      </div>
    `;

    this.scrollWrapper.insertAdjacentHTML('beforeend', cardHTML);

    // Re-initialize
    this.cards = this.container.querySelectorAll('.card');
    this.attachCardListeners();

    // Add new indicator
    const newIndicator = document.createElement('button');
    newIndicator.className = 'indicator-dot';
    newIndicator.setAttribute('data-slide', this.indicators.length);
    this.container.querySelector('.scroll-indicators').appendChild(newIndicator);

    this.indicators = this.container.querySelectorAll('.indicator-dot');
    this.attachIndicatorListeners();
  }

  /**
   * Get current active card index
   */
  getActiveCardIndex() {
    const scrollLeft = this.scrollWrapper.scrollLeft;
    const cardWidth =
      this.cards[0].offsetWidth + parseInt(window.getComputedStyle(this.cards[0]).gap || 16);
    return Math.round(scrollLeft / cardWidth);
  }

  /**
   * Destroy instance and clean up listeners
   */
  destroy() {
    this.cards.forEach((card) => {
      card.replaceWith(card.cloneNode(true));
    });
    this.scrollWrapper.replaceWith(this.scrollWrapper.cloneNode(true));
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.animatedCards = new AnimatedCards();
  });
} else {
  window.animatedCards = new AnimatedCards();
}

// Add ripple animation keyframes if not already present
if (!document.querySelector('style[data-ripple-animation]')) {
  const style = document.createElement('style');
  style.setAttribute('data-ripple-animation', 'true');
  style.textContent = `
    @keyframes ripple {
      0% {
        width: 0;
        height: 0;
        opacity: 1;
      }
      100% {
        width: 300px;
        height: 300px;
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
