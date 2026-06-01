document.addEventListener('DOMContentLoaded', () => {
  let currentLang = 'vi'; // Default language

  const langToggleBtn = document.getElementById('lang-toggle');
  const infoBox = document.getElementById('info-box');
  const infoPlaceholder = infoBox.querySelector('.info-placeholder');
  const infoContent = infoBox.querySelector('.info-content');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const nodes = document.querySelectorAll('.node');

  // Translations object for dynamic text that is not in the DOM tags
  const textTranslations = {
    vi: {
      langBtn: 'English 🇬🇧',
      placeholder: '[Chờ lệnh] Vui lòng click chọn một Module ở trên để trích xuất Telemetry...',
    },
    en: {
      langBtn: 'Tiếng Việt 🇻🇳',
      placeholder: '[Awaiting uplink] Select a module above to inspect system telemetry details...',
    }
  };

  // Function to switch language
  function switchLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    // Translate all elements with data-vi/data-en attributes
    const translatableElements = document.querySelectorAll('[data-vi]');
    translatableElements.forEach(el => {
      const translation = el.getAttribute(`data-${lang}`);
      if (translation) {
        // If it's the download button or has nested HTML elements, we should check, but mostly they are plain text
        if (el.id === 'download-btn') {
          // Keep the icon span
          const iconSpan = el.querySelector('.download-icon');
          const textSpan = el.querySelector('span:not(.download-icon)');
          if (textSpan) {
            textSpan.textContent = textSpan.getAttribute(`data-${lang}`);
          }
        } else {
          el.textContent = translation;
        }
      }
    });

    // Update lang toggle button text
    const langBtnText = langToggleBtn.querySelector('.lang-text');
    if (langBtnText) {
      langBtnText.textContent = textTranslations[lang].langBtn;
    }

    // Update active node detail if any
    const activeNode = document.querySelector('.node.active');
    if (activeNode) {
      showNodeDetails(activeNode);
    } else {
      infoPlaceholder.textContent = textTranslations[lang].placeholder;
    }
  }

  // Toggle language button click
  langToggleBtn.addEventListener('click', () => {
    const targetLang = currentLang === 'vi' ? 'en' : 'vi';
    switchLanguage(targetLang);
  });

  // Show node details in the info box
  function showNodeDetails(node) {
    const title = node.querySelector('h3').textContent;
    const desc = node.getAttribute(`data-info-${currentLang}`);

    infoPlaceholder.classList.add('hidden');
    infoContent.classList.remove('hidden');

    infoTitle.textContent = title;
    infoDesc.textContent = desc;
  }

  // Reset details in the info box
  function resetNodeDetails() {
    // Only reset if there's no permanently active node clicked
    const hasActiveNode = Array.from(nodes).some(n => n.classList.contains('active'));
    if (!hasActiveNode) {
      infoPlaceholder.classList.remove('hidden');
      infoContent.classList.add('hidden');
      infoPlaceholder.textContent = textTranslations[currentLang].placeholder;
    }
  }

  // Attach hover and click events to nodes
  nodes.forEach(node => {
    // Hover Enter
    node.addEventListener('mouseenter', () => {
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      showNodeDetails(node);
    });

    // Hover Leave
    node.addEventListener('mouseleave', () => {
      node.classList.remove('active');
      resetNodeDetails();
    });

    // Click (for mobile support and persistent selection)
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      showNodeDetails(node);
    });
  });

  // Click outside to clear details
  document.addEventListener('click', () => {
    nodes.forEach(n => n.classList.remove('active'));
    resetNodeDetails();
  });
});
