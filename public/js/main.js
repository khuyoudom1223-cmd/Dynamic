// Navigation & Menu Logic
const menuTrigger = document.getElementById("menu-trigger");
const mainNav = document.getElementById("main-nav-links");
const menuBackdrop = document.getElementById("menu-backdrop");

function toggleMenu() {
  if (!mainNav || !menuBackdrop) return;
  const isOpen = mainNav.classList.toggle("is-open");
  menuBackdrop.classList.toggle("is-open");
  document.body.style.overflow = isOpen ? "hidden" : "";
}

if (menuTrigger) {
  menuTrigger.addEventListener("click", toggleMenu);
}

if (menuBackdrop) {
  menuBackdrop.addEventListener("click", toggleMenu);
}

// Close menu on link click
document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    if (mainNav && mainNav.classList.contains("is-open")) {
      toggleMenu();
    }
  });
});

// Theme Toggling logic (also used by inline scripts)
window.toggleTheme = function() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const target = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', target);
  localStorage.setItem('theme', target);
};

// Set initial theme if not already set by inline script
if (!document.documentElement.getAttribute('data-theme')) {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Active Link Highlighting
function highlightActiveLinks() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.main-nav a, .mobile-nav-item, .footer-nav a');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });
}

highlightActiveLinks();

// Chart Logic
const chartCanvas = document.getElementById("ordersChart");
if (chartCanvas && window.Chart) {
  const source = chartCanvas.getAttribute("data-chart");
  const dataObject = source ? JSON.parse(source) : {};
  const labels = Object.keys(dataObject).length ? Object.keys(dataObject) : ["pending", "paid", "cancelled"];
  const values = labels.map((label) => Number(dataObject[label] || 0));

  new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#0f766e", "#16a34a", "#f97316"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      }
    }
  });
}

// Status Helpers
const statusSelects = document.querySelectorAll("[data-status-select]");
if (statusSelects.length > 0) {
  const allowedStatuses = ["pending", "paid", "cancelled"];

  const updateStatusSelectClass = (selectElement) => {
    const nextStatus = String(selectElement.value || "").toLowerCase();
    allowedStatuses.forEach((status) => {
      selectElement.classList.remove(`status-select-${status}`);
    });

    if (allowedStatuses.includes(nextStatus)) {
      selectElement.classList.add(`status-select-${nextStatus}`);
    }
  };

  statusSelects.forEach((selectElement) => {
    updateStatusSelectClass(selectElement);
    selectElement.addEventListener("change", () => updateStatusSelectClass(selectElement));
  });
}

// Scroll Progress Bar Logic
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress-container';
progressBar.innerHTML = '<div class="scroll-progress-bar" id="scroll-bar"></div>';
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const scrollBar = document.getElementById('scroll-bar');
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  if (scrollBar) scrollBar.style.width = scrolled + "%";
});

// Reveal on Scroll Logic
const revealElements = document.querySelectorAll('.card, .recommended-card, .section-head, .hero-content');
revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.1 });

revealElements.forEach(el => revealObserver.observe(el));
