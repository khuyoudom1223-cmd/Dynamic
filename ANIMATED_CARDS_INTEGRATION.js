// Integration examples for Animated Cards in Express/EJS

// ============================================
// EXAMPLE 1: Simple Route to Demo Page
// ============================================

// Add to routes/web.js or index.js
app.get('/animated-cards-demo', (req, res) => {
  res.sendFile('public/demo-animated-cards.html', { root: __dirname });
});

// ============================================
// EXAMPLE 2: Use in Existing EJS View
// ============================================

/*
In views/home.ejs or any view:

<!DOCTYPE html>
<html>
<head>
  <title>Home</title>
  <link rel="stylesheet" href="/css/animated-cards.css">
</head>
<body>
  <%- include('./partials/navbar') %>
  
  <div class="container">
    <h1>Welcome</h1>
    <%- include('./partials/animated-cards') %>
  </div>
  
  <script src="/js/animated-cards.js"></script>
</body>
</html>
*/

// ============================================
// EXAMPLE 3: Dynamic Cards with Product Data
// ============================================

app.get('/products-showcase', async (req, res) => {
  try {
    const products = await Product.find().limit(5);
    
    res.render('showcase', {
      products: products,
      title: 'Featured Products'
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

/*
Then in views/showcase.ejs:

<link rel="stylesheet" href="/css/animated-cards.css">

<div class="animated-cards-container">
  <div class="cards-scroll-wrapper">
    <% products.forEach((product, index) => { %>
      <div class="card card-item" data-index="<%= index %>">
        <div class="card-image" 
             style="background: url('<%= product.image %>'); 
                    background-size: cover;">
        </div>
        <div class="card-content">
          <h3 class="card-title"><%= product.name %></h3>
          <p class="card-description"><%= product.description %></p>
          <button class="card-button" 
                  onclick="viewProduct('<%= product._id %>')">
            View Product
          </button>
        </div>
        <div class="card-shine"></div>
      </div>
    <% }); %>
  </div>

  <div class="scroll-indicators">
    <% for (let i = 0; i < products.length; i++) { %>
      <button class="indicator-dot <% if (i === 0) { %>active<% } %>" 
              data-slide="<%= i %>"></button>
    <% } %>
  </div>
</div>

<script src="/js/animated-cards.js"></script>
<script>
  function viewProduct(productId) {
    window.location.href = '/product/' + productId;
  }
</script>
*/

// ============================================
// EXAMPLE 4: API Endpoint for Dynamic Loading
// ============================================

app.get('/api/featured-products', async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ views: -1 })
      .limit(5)
      .select('name description image');

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
Frontend usage in any view:

<div class="animated-cards-container" id="featuredCards">
  <div class="cards-scroll-wrapper"></div>
  <div class="scroll-indicators"></div>
</div>

<script src="/js/animated-cards.js"></script>
<script>
  async function loadFeaturedProducts() {
    try {
      const response = await fetch('/api/featured-products');
      const products = await response.json();
      
      const wrapper = document.querySelector('.cards-scroll-wrapper');
      const indicators = document.querySelector('.scroll-indicators');
      
      wrapper.innerHTML = '';
      indicators.innerHTML = '';
      
      products.forEach((product, index) => {
        // Create card
        const card = document.createElement('div');
        card.className = 'card card-item';
        card.dataset.index = index;
        card.innerHTML = `
          <div class="card-image" style="background: url('${product.image}'); background-size: cover;"></div>
          <div class="card-content">
            <h3 class="card-title">${product.name}</h3>
            <p class="card-description">${product.description}</p>
            <button class="card-button" onclick="viewProduct('${product._id}')">
              View Product
            </button>
          </div>
          <div class="card-shine"></div>
        `;
        wrapper.appendChild(card);
        
        // Create indicator
        const dot = document.createElement('button');
        dot.className = `indicator-dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.slide = index;
        indicators.appendChild(dot);
      });
      
      // Re-initialize cards component
      window.animatedCards = new AnimatedCards('#featuredCards');
      
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }
  
  // Load on page load
  window.addEventListener('load', loadFeaturedProducts);
</script>
*/

// ============================================
// EXAMPLE 5: Layout/Master Template Integration
// ============================================

/*
In views/layout.ejs:

<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/animated-cards.css">
</head>
<body>
  <%- include('./partials/navbar') %>
  
  <main>
    <%- body %>
  </main>
  
  <%- include('./partials/footer') %>
  
  <script src="/js/animated-cards.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>

Then any view automatically has animated cards support!
*/

// ============================================
// EXAMPLE 6: Custom Styling per Page
// ============================================

/*
views/special-cards.ejs:

<style>
  :root {
    --card-width: 300px;
    --card-height: 400px;
    --animation-duration: 0.8s;
    --animation-delay-step: 0.15s;
  }
  
  .card-button {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  }
</style>

<link rel="stylesheet" href="/css/animated-cards.css">

<%- include('./partials/animated-cards') %>

<script src="/js/animated-cards.js"></script>
*/

// ============================================
// EXAMPLE 7: Event Tracking Integration
// ============================================

/*
<script>
  // Track card interactions with analytics
  document.addEventListener('click', (e) => {
    const button = e.target.closest('.card-button');
    if (!button) return;
    
    const card = button.closest('.card');
    const title = card.querySelector('.card-title').textContent;
    const index = card.dataset.index;
    
    // Send to analytics
    if (window.gtag) {
      gtag('event', 'card_click', {
        card_title: title,
        card_index: index
      });
    }
    
    // Or send to your own analytics
    fetch('/api/analytics/card-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardTitle: title,
        cardIndex: index,
        timestamp: new Date().toISOString()
      })
    });
  });
</script>
*/

// ============================================
// EXAMPLE 8: Responsive Sections
// ============================================

app.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    
    res.render('categories', {
      categories: categories,
      title: 'Shop by Category'
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

/*
views/categories.ejs:

<link rel="stylesheet" href="/css/animated-cards.css">

<div class="page-container">
  <h1>Shop by Category</h1>
  
  <div class="animated-cards-container">
    <div class="cards-scroll-wrapper">
      <% categories.forEach((category, index) => { %>
        <div class="card card-item" data-index="<%= index %>">
          <div class="card-image" 
               style="background: url('<%= category.image %>'); 
                      background-size: cover;
                      background-position: center;">
          </div>
          <div class="card-content">
            <h3 class="card-title"><%= category.name %></h3>
            <p class="card-description">
              <%= category.productCount %> Products
            </p>
            <button class="card-button" 
                    onclick="window.location='/category/<%= category._id %>'">
              Browse
            </button>
          </div>
          <div class="card-shine"></div>
        </div>
      <% }); %>
    </div>
    
    <div class="scroll-indicators">
      <% for (let i = 0; i < categories.length; i++) { %>
        <button class="indicator-dot" data-slide="<%= i %>"></button>
      <% } %>
    </div>
  </div>
</div>

<script src="/js/animated-cards.js"></script>
*/

// ============================================
// EXAMPLE 9: Middleware Setup (Optional)
// ============================================

// Middleware to inject animated cards assets into response headers
app.use((req, res, next) => {
  res.locals.hasAnimatedCards = true;
  res.locals.cssAssets = ['/css/animated-cards.css'];
  res.locals.jsAssets = ['/js/animated-cards.js'];
  next();
});

/*
Then in layout.ejs:
<% if (hasAnimatedCards) { %>
  <% cssAssets.forEach(css => { %>
    <link rel="stylesheet" href="<%= css %>">
  <% }); %>
<% } %>

...

<% if (hasAnimatedCards) { %>
  <% jsAssets.forEach(js => { %>
    <script src="<%= js %>"></script>
  <% }); %>
<% } %>
*/

// ============================================
// EXAMPLE 10: Complete Standalone Page
// ============================================

app.get('/shop', async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    const categories = await Category.find();
    
    res.render('shop', {
      products: products,
      categories: categories,
      title: 'Shop'
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

/*
views/shop.ejs:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/animated-cards.css">
</head>
<body>
  <%- include('./partials/navbar') %>
  
  <div class="container">
    <h1><%= title %></h1>
    
    <section>
      <h2>Featured Categories</h2>
      <%- include('./partials/animated-cards') %>
    </section>
  </div>
  
  <%- include('./partials/footer') %>
  
  <script src="/js/animated-cards.js"></script>
</body>
</html>
*/

module.exports = {
  examples: 'See comments above for integration examples'
};
