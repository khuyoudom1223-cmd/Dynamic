/**
 * KHQR Checkout Logic
 * Handles QR generation, polling, and UI state management.
 */

class KHQRCheckout {
  constructor() {
    this.pollingInterval = null;
    this.timeoutId = null;
    this.transactionId = null;
    this.isPolling = false;
    this.init();
    
    // Add cleanup listener
    window.addEventListener('beforeunload', () => this.stopPolling());
  }

  init() {
    // Create Modal HTML structure if it doesn't exist
    if (!document.getElementById('khqr-modal-container-v2')) {
      const modalHtml = `
        <div id="khqr-modal-container-v2" class="khqr-modal-overlay">
          <div class="khqr-modal-v2">
            <button class="khqr-btn-close-v2" onclick="khqrCheckout.closeModal()" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="khqr-header-v2">
              <div class="khqr-logo-container">
                <img src="/logo/khqr-premium.png" class="khqr-logo-v2" alt="KHQR Premium">
              </div>
              <h3 class="khqr-title-v2">Bakong KHQR Payment</h3>
            </div>
            <div id="khqr-content">
               <div class="khqr-loader-container">
                 <div class="khqr-spinner-v2"></div>
                 <p style="margin-top: 1.5rem; color: #64748b; font-weight: 500;">Generating Secure QR...</p>
               </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  async startPayment(productId, amount, btnElement = null) {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.classList.add('btn-loading');
    }

    this.showModal();
    this.updateContent(`
      <div class="khqr-loader-container">
        <div class="khqr-spinner-v2"></div>
        <p style="margin-top: 1.5rem; color: #64748b; font-weight: 500;">Initializing Payment...</p>
      </div>
    `);

    try {
      const response = await fetch('/api/generate-khqr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, amount: amount })
      });

      const result = await response.json();

      if (result.status === 'success') {
        this.transactionId = result.transaction_id;
        this.displayQR(result.qr_code, amount);
        this.startPolling();
        this.startTimeout();
      } else {
        throw new Error(result.message || 'Failed to generate KHQR');
      }
    } catch (error) {
      console.error('KHQR Error:', error);
      const isNetworkError = !navigator.onLine || error.message.includes('fetch');
      this.updateContent(`
        <div style="padding: 1rem 0;">
          <div style="background: #fef2f2; width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #ef4444;">
            <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 style="margin: 0; color: #1e293b; font-weight: 800;">Payment Failed</h3>
          <p style="margin: 0.5rem 0 1.5rem; color: #64748b; font-size: 0.95rem; line-height: 1.5;">
            ${isNetworkError ? 'Please check your internet connection and try again.' : error.message}
          </p>
          <button class="btn-retry-v2" onclick="khqrCheckout.closeModal()">Try Again</button>
        </div>
      `);
      this.reenableButtons();
    }
  }

  displayQR(qrCodeData, amount) {
    this.updateContent(`
      <div class="khqr-payment-info">
        <p class="khqr-price-v2">$${parseFloat(amount).toFixed(2)}</p>
        <div class="khqr-qr-wrapper">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}" alt="KHQR Code">
        </div>
        <p class="khqr-status-v2">Scan this KHQR to pay</p>
        <div class="khqr-waiting-v2">
          <div class="khqr-pulse"></div>
          <span>Waiting for payment...</span>
        </div>
      </div>
    `);
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/check-payment?transaction_id=${this.transactionId}`);
        const result = await response.json();

        if (result.status === 'SUCCESS') {
          this.handleSuccess();
        } else if (result.status === 'FAILED' || result.status === 'EXPIRED') {
          this.handleFailure(result.status);
        } else if (result.status === 'error') {
          throw new Error(result.message || 'Invalid transaction');
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (error.message.includes('Invalid transaction')) {
          this.handleFailure('Error: ' + error.message);
        }
      }
    }, 4000); 
  }

  handleSuccess() {
    this.stopPolling();
    this.updateContent(`
      <div style="padding: 1rem 0;">
        <div style="background: #f0fdf4; width: 80px; height: 80px; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #10b981;">
          <svg style="width: 40px; height: 40px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 style="margin: 0; color: #1e293b; font-weight: 800; font-size: 1.5rem;">Payment Success!</h3>
        <p style="margin: 0.5rem 0 0; color: #64748b; font-weight: 500;">Redirecting to your order...</p>
      </div>
    `);
    
    setTimeout(() => {
      window.location.href = '/orders?success=Payment+Received';
    }, 2500);
  }

  handleFailure(status) {
    this.stopPolling();
    this.updateContent(`
      <div style="padding: 1rem 0;">
        <div style="background: #fef2f2; width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #ef4444;">
          <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 style="margin: 0; color: #1e293b; font-weight: 800;">Payment ${status}</h3>
        <p style="margin: 0.5rem 0 1.5rem; color: #64748b;">The payment session has ended or failed.</p>
        <button class="btn-retry-v2" onclick="khqrCheckout.closeModal()">Close</button>
      </div>
    `);
    
    this.reenableButtons();
  }

  startTimeout() {
    this.timeoutId = setTimeout(() => {
      if (this.isPolling) {
        this.stopPolling();
        this.updateContent(`
          <div style="padding: 1rem 0;">
             <div style="background: #fffbeb; width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #f59e0b;">
              <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 style="margin: 0; color: #1e293b; font-weight: 800;">Session Expired</h3>
            <p style="margin: 0.5rem 0 1.5rem; color: #64748b;">For your security, this session has timed out.</p>
            <button class="btn-retry-v2" onclick="khqrCheckout.closeModal()">Close</button>
          </div>
        `);
        
        this.reenableButtons();
      }
    }, 300000); 
  }


  reenableButtons() {
    const buttons = document.querySelectorAll('.btn-buy-khqr');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    });
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isPolling = false;
  }

  showModal() {
    document.getElementById('khqr-modal-container-v2').classList.add('active');
  }

  closeModal() {
    this.stopPolling();
    document.getElementById('khqr-modal-container-v2').classList.remove('active');
    this.reenableButtons();
  }

  updateContent(html) {
    document.getElementById('khqr-content').innerHTML = html;
  }
}

// Global instance
window.khqrCheckout = new KHQRCheckout();
