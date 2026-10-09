/* Amazo Publishers — site behaviour
   Progressive enhancement only: every section is readable with JS disabled. */
(function () {
  'use strict';

  var onReady = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  onReady(function () {
    
    function showToast(message) {
      var toast = document.createElement('div');
      toast.textContent = message;
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.background = '#10b981';
      toast.style.color = '#fff';
      toast.style.padding = '12px 24px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      toast.style.zIndex = '9999';
      toast.style.fontWeight = '500';
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      
      document.body.appendChild(toast);
      
      // trigger reflow
      toast.offsetHeight;
      
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 4000);
    }

    /* ---------- Header state, reading progress, back-to-top ----------
       All three key off the same scroll position, so they share one
       rAF-throttled listener rather than three competing ones. */
    var header   = document.querySelector('.site-header');
    var progress = document.querySelector('.scroll-progress');
    var toTop    = document.querySelector('.to-top');

    var onScroll = function () {
      var y = window.scrollY || document.documentElement.scrollTop;

      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (toTop)  toTop.classList.toggle('is-visible', y > 600);

      if (progress) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        progress.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
      }
    };

    var ticking = false;
    var queueScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll, { passive: true });

    if (toTop) {
      toTop.addEventListener('click', function () {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    }

    /* ---------- Mobile nav ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        nav.classList.toggle('is-open', !open);
      });
    }

    var isMobile = function () {
      return window.matchMedia('(max-width: 1180px)').matches;
    };

    /* ---------- Dropdown ("Other Services") ---------- */
    var dropdowns = Array.prototype.slice.call(document.querySelectorAll('.nav__item--has-panel'));

    var closeAll = function (except) {
      dropdowns.forEach(function (item) {
        if (item === except) return;
        item.classList.remove('is-open');
        var t = item.querySelector('.nav__link');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    };

    dropdowns.forEach(function (item) {
      var trigger = item.querySelector('.nav__link');
      if (!trigger) return;

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        var open = item.classList.contains('is-open');
        closeAll(item);
        item.classList.toggle('is-open', !open);
        trigger.setAttribute('aria-expanded', String(!open));
      });

      // Hover only on pointer devices with room for it
      item.addEventListener('mouseenter', function () {
        if (isMobile()) return;
        closeAll(item);
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });
      item.addEventListener('mouseleave', function () {
        if (isMobile()) return;
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav__item--has-panel')) closeAll(null);
    });

    /* ---------- Mega menu tabs ----------
       The panel ships with the first category shown and the rest marked
       hidden, so the menu is complete and readable with no JS at all. This
       only adds the switching: pointer devices swap on hover so the list
       follows the cursor, everything swaps on click, and the arrow keys walk
       the rail the way a tablist is expected to. */
    Array.prototype.forEach.call(document.querySelectorAll('.mega'), function (mega) {
      var tabs = Array.prototype.slice.call(mega.querySelectorAll('.mega__tab'));
      var panels = Array.prototype.slice.call(mega.querySelectorAll('.mega__panel'));
      if (tabs.length < 2) return;

      var show = function (i, focusTab) {
        tabs.forEach(function (t, n) {
          var on = n === i;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p, n) {
          p.classList.toggle('is-active', n === i);
          if (n === i) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
        });
        if (focusTab) tabs[i].focus();
      };

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function (e) { e.preventDefault(); show(i); });
        tab.addEventListener('mouseenter', function () { if (!isMobile()) show(i); });
        tab.addEventListener('focus', function () { show(i); });
        tab.addEventListener('keydown', function (e) {
          var step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1
                   : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          show((i + step + tabs.length) % tabs.length, true);
        });
      });

      /* Reopening the menu should not leave whichever category the cursor
         last brushed past still showing. */
      var item = mega.closest('.nav__item');
      if (item) item.addEventListener('mouseleave', function () { if (!isMobile()) show(0); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAll(null);
      if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        toggle.focus();
      }
    });

    /* ---------- FAQ accordion ---------- */
    Array.prototype.forEach.call(document.querySelectorAll('.faq__q'), function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq__item');
        var open = item.classList.contains('is-open');
        // Close siblings for a single-open accordion
        Array.prototype.forEach.call(item.parentNode.children, function (sib) {
          sib.classList.remove('is-open');
          var b = sib.querySelector('.faq__q');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('is-open', !open);
        btn.setAttribute('aria-expanded', String(!open));
      });
    });

    /* ---------- Genre tabs ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    if (tabs.length) {
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var target = tab.getAttribute('data-genre');
          tabs.forEach(function (t) {
            var on = t === tab;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', String(on));
          });
          Array.prototype.forEach.call(document.querySelectorAll('.book'), function (book) {
            var genre = book.getAttribute('data-genre');
            book.style.display = (target === 'all' || genre === target) ? '' : 'none';
          });
        });
      });
    }

    /* ---------- Count-up stats ---------- */
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1400;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        // easeOutCubic
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    /* ---------- Reveal on scroll + counters ---------- */
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || reduced) {
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
        el.classList.add('is-in');
      });
      counters.forEach(function (el) {
        var s = el.getAttribute('data-suffix') || '';
        el.textContent = parseFloat(el.getAttribute('data-count')).toLocaleString() + s;
      });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add('is-in');
          if (el.hasAttribute('data-count')) runCount(el);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

      /* Stagger across each visual row. Grouping by offsetTop means a 4-up
         grid cascades 0/70/140/210 and then restarts on the next row, rather
         than running one delay counter down the whole document. */
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
        var siblings = Array.prototype.filter.call(
          el.parentNode ? el.parentNode.children : [],
          function (n) { return n.classList && n.classList.contains('reveal'); }
        );
        var row = siblings.filter(function (n) { return n.offsetTop === el.offsetTop; });
        var pos = row.indexOf(el);
        el.style.transitionDelay = Math.min(pos, 5) * 70 + 'ms';
        io.observe(el);
      });
      counters.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Entry popup ----------
       Opens once per browsing session, after the delay set on the element.
       Anything that dismisses it records the fact, so it does not reappear
       on every page the visitor clicks through to.

       That "once per session" rule makes the popup hard to review — once you
       have closed it, it will not come back until you open a new tab. Append
       #popup (or ?popup) to the URL to force it open and ignore the flag.
       The hash form is the reliable one: some static servers rewrite clean
       URLs and drop the query string before the page ever sees it. */
    var modal = document.getElementById('entry-modal');
    var forcePopup = /[?&]popup\b/.test(window.location.search) ||
                     /^#popup\b/.test(window.location.hash);
    if (modal && (forcePopup || !sessionStorage.getItem('amazo-modal-seen'))) {
      var panel = modal.querySelector('.modal__panel');
      var lastFocus = null;

      var openModal = function () {
        lastFocus = document.activeElement;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        /* Force a reflow, then flip the class synchronously. Deferring this to
           requestAnimationFrame would leave the panel at opacity 0 with the
           page scroll locked in any tab where rAF is throttled. */
        void modal.offsetHeight;
        modal.classList.add('is-open');
        var first = modal.querySelector('input, textarea, button');
        if (first) first.focus();
      };

      var closeModal = function () {
        sessionStorage.setItem('amazo-modal-seen', '1');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        window.setTimeout(function () { modal.hidden = true; }, 320);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      };

      Array.prototype.forEach.call(modal.querySelectorAll('[data-modal-close]'), function (el) {
        el.addEventListener('click', closeModal);
      });

      document.addEventListener('keydown', function (e) {
        if (modal.hidden) return;
        if (e.key === 'Escape' || e.keyCode === 27) { closeModal(); return; }
        if (e.key !== 'Tab') return;

        /* Keep tabbing inside the dialog while it is open. */
        var items = panel.querySelectorAll('a[href], button, input, textarea, select');
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });

      /* Submitting counts as dismissing — the mail client takes over from here. */
      var modalForm = modal.querySelector('form');
      if (modalForm) {
        modalForm.addEventListener('submit', function () {
          sessionStorage.setItem('amazo-modal-seen', '1');
        });
      }

      /* `|| 6000` would be wrong here: a configured delay of 0 is falsy and
         would silently become six seconds. Only fall back on a genuinely
         unusable value. */
      var delay = parseInt(modal.getAttribute('data-delay'), 10);
      if (isNaN(delay) || delay < 0) delay = 6000;

      /* With no delay the modal opens before the first paint, so there is no
         "closed" frame to fade from — and a transition that never starts
         leaves the panel at opacity 0 while the page scroll is already
         locked, which looks like a frozen page. Open instantly instead. */
      if (delay === 0) {
        modal.classList.add('modal--instant');
        openModal();
      } else {
        window.setTimeout(openModal, delay);
      }
    }

    /* ---------- Pre-select the service from ?service= ----------
       Every service page CTA links to contact.html?service=<Title>, so the
       enquiry form should open with that option already chosen. */
    var serviceSelect = document.querySelector('#service');
    if (serviceSelect && window.location.search) {
      var wanted = decodeURIComponent(
        (window.location.search.match(/[?&]service=([^&]*)/) || [])[1] || ''
      ).replace(/\+/g, ' ');

      if (wanted) {
        Array.prototype.forEach.call(serviceSelect.options, function (opt) {
          if (opt.value === wanted) serviceSelect.value = opt.value;
        });
      }
    }

    /* ---------- Contact / lead forms ----------
       The forms POST to data-endpoint, which sends through Resend. Two things
       make that fall back rather than fail:

         - the endpoint is not deployed yet (a static host 404s the path), or
         - it is deployed but RESEND_API_KEY is not set, and answers 503.

       Either way the mail client opens as it did before, so the site keeps
       collecting enquiries throughout the switch-over. A 4xx other than 404
       is the visitor's own input coming back and is shown as written. */
    var setStatus = function (form, text, kind) {
      var el = form.querySelector('.form-status');
      if (!el) return;
      el.textContent = text;
      el.classList.remove('is-error', 'is-success');
      if (kind) el.classList.add('is-' + kind);
      el.classList.add('is-visible');
    };



    Array.prototype.forEach.call(document.querySelectorAll('[data-mailto-form]'), function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        var phoneInput = form.querySelector('[name="phone"]');
        if (phoneInput) {
          var phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/;
          if (!phoneRegex.test(phoneInput.value.trim())) {
            setStatus(form, 'Please enter a valid phone number.', 'error');
            phoneInput.focus();
            return;
          }
        }

        var endpoint = form.getAttribute('data-endpoint');
        if (!endpoint) return;

        var data = new FormData(form);
        var get = function (k) { return (data.get(k) || '').toString().trim(); };
        var payload = {
          fields: {
            source: { stringValue: "amazo" },
            name: { stringValue: get('name') },
            email: { stringValue: get('email') },
            phone: { stringValue: get('phone') },
            message: { stringValue: get('message') + (get('service') ? "\\nService: " + get('service') : "") },
            createdAt: { timestampValue: new Date().toISOString() }
          }
        };

        var submit = form.querySelector('button[type=submit]');
        if (submit) submit.disabled = true;
        setStatus(form, 'Sending…');

        var firebaseEndpoint = 'https://firestore.googleapis.com/v1/projects/e-book-portal-15733/databases/(default)/documents/amazo?key=AIzaSyCjFdNgu4fKrXj5jWa0MlMi3EwnX22WLq8';

        window.fetch(firebaseEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (res.ok) {
            form.reset();
            showToast('Your query sent successfully!');
            setStatus(form, 'Thank you — your enquiry is on its way. We reply within one business day.', 'success');
          } else {
            setStatus(form, 'Something went wrong. Please try again later.', 'error');
          }
        }).catch(function () {
          setStatus(form, 'Network error. Please check your connection and try again.', 'error');
        }).then(function () {
          if (submit) submit.disabled = false;
        });
      });
    });

    /* ---------- Hero clip ----------
       The clip autoplays from the markup so it starts without waiting on
       this file. All that is left here is honouring a reduced-motion
       preference: pause it and show controls, so the clip is still
       reachable for anyone who wants it rather than simply gone. */
    (function () {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      Array.prototype.forEach.call(document.querySelectorAll('.author-media video'), function (v) {
        v.autoplay = false;
        v.loop = false;
        v.controls = true;
        v.pause();
      });
    })();

    /* ---------- Footer year ---------- */
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = new Date().getFullYear();
    });
  });
})();
