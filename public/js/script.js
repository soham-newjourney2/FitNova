/* ============================================================
   FitNova — script.js
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Navbar Scroll Effect
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  // 2. Mobile Menu Toggle
  const ham = document.getElementById('ham');
  const mobileNav = document.getElementById('mobileNav');
  
  if (ham && mobileNav) {
    ham.addEventListener('click', () => {
      ham.classList.toggle('open');
      mobileNav.classList.toggle('open');
      const expanded = ham.getAttribute('aria-expanded') === 'true';
      ham.setAttribute('aria-expanded', !expanded);
    });
  }

  // 3. 3D Image Slider
  const track = document.querySelector('.slider3d-track');
  const slides = document.querySelectorAll('.s3d');
  const dotsContainer = document.getElementById('sdots');
  
  if (slides.length > 0 && dotsContainer) {
    let currentSlide = 0;
    const totalSlides = slides.length;
    
    // Create dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'sdot';
      if (i === currentSlide) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
    
    const dots = document.querySelectorAll('.sdot');
    
    function updateSlider() {
      // Reset all classes
      slides.forEach(s => s.className = 's3d hidden');
      dots.forEach(d => d.className = 'sdot');
      
      // Set active dot
      if(dots[currentSlide]) dots[currentSlide].classList.add('active');
      
      // Set slides classes
      slides[currentSlide].className = 's3d active';
      
      const prev = (currentSlide - 1 + totalSlides) % totalSlides;
      const next = (currentSlide + 1) % totalSlides;
      
      slides[prev].className = 's3d prev';
      slides[next].className = 's3d next';
    }
    
    function goToSlide(i) {
      currentSlide = i;
      updateSlider();
    }
    
    // Auto advance slider
    setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlider();
    }, 4000);
    
    // Initial call
    updateSlider();
  }

  // 4. Intersection Observer for Animations (Features & Stats)
  const fcards = document.querySelectorAll('.fcard');
  const statsWrap = document.querySelector('.stats-inner');
  const statNumbers = document.querySelectorAll('.sn');
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px"
  };
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('fcard')) {
           entry.target.classList.add('vis');
           obs.unobserve(entry.target);
        } else if (entry.target === statsWrap) {
           statNumbers.forEach((stat, i) => {
             // Animate stats
             setTimeout(() => {
                stat.classList.add('vis');
                const val = stat.getAttribute('data-v');
                if (val) {
                  stat.textContent = val;
                }
             }, i * 150);
           });
           obs.unobserve(entry.target);
        }
      }
    });
  }, observerOptions);
  
  fcards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    observer.observe(card);
  });
  
  if (statsWrap) {
    observer.observe(statsWrap);
  }

  // 5. Mini Activity Chart Mock
  const actMini = document.getElementById('actMini');
  if (actMini) {
    const heights = [30, 60, 40, 80, 50, 20, 90];
    heights.forEach((h, i) => {
      const bar = document.createElement('div');
      bar.classList.add('abar');
      if (i < 4) bar.classList.add('on'); // First 4 are green based on HTML done/today states
      bar.style.height = `${h}%`;
      actMini.appendChild(bar);
    });
  }

});
