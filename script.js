// Mobile menu functions (global scope for onclick handlers)
function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');
  if (mobileMenu) {
    mobileMenu.classList.remove('active');
    if (menuIcon) menuIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.getElementById('carousel');
  const scrollLeftBtn = document.getElementById('scrollLeft');
  const scrollRightBtn = document.getElementById('scrollRight');
  const featuredImageCard = document.getElementById('featuredImageCard');
  const imageModal = document.getElementById('imageModal');
  const closeImageModal = document.getElementById('closeImageModal');
  const protectedWrapper = document.querySelector('.protected-image-wrapper');
  const body = document.body;
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');

  // Mobile menu toggle
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function () {
      mobileMenu.classList.toggle('active');
      menuIcon.classList.toggle('hidden');
      closeIcon.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (event) {
      if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        closeMobileMenu();
      }
    });
  }

  // Dynamic scroll amount based on viewport
  function getScrollAmount() {
    return window.innerWidth < 640 ? 250 : 280;
  }

  // Load More functionality for mobile
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  const showLessBtn = document.getElementById('showLessBtn');
  const showLessContainer = document.getElementById('showLessContainer');
  let currentVisibleCount = 4;

  if (loadMoreBtn && showLessBtn && carousel) {
    const allCards = carousel.querySelectorAll(':scope > div > div');
    const totalCards = allCards.length;

    // Initial check if button should be visible
    function updateLoadMoreButton() {
      if (window.innerWidth >= 640) {
        // Desktop: hide buttons, show all cards
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (showLessContainer) showLessContainer.classList.add('hidden');
        allCards.forEach(card => card.classList.remove('show-card'));
      } else {
        // Mobile: show appropriate button
        if (currentVisibleCount >= totalCards) {
          // All cards visible: hide Load More, show Show Less
          if (loadMoreContainer) loadMoreContainer.style.display = 'none';
          if (showLessContainer) showLessContainer.classList.remove('hidden');
        } else if (currentVisibleCount > 4) {
          // Some cards expanded: show both buttons
          if (loadMoreContainer) loadMoreContainer.style.display = 'flex';
          if (showLessContainer) showLessContainer.classList.remove('hidden');
        } else {
          // Initial state: show only Load More
          if (loadMoreContainer) loadMoreContainer.style.display = 'flex';
          if (showLessContainer) showLessContainer.classList.add('hidden');
        }
      }
    }

    loadMoreBtn.addEventListener('click', function () {
      // Show next 4 cards
      const cardsToShow = Array.from(allCards).slice(currentVisibleCount, currentVisibleCount + 4);
      cardsToShow.forEach(card => {
        card.classList.add('show-card');
      });
      currentVisibleCount += 4;

      // Update button visibility
      updateLoadMoreButton();

      // Smooth scroll to first newly shown card
      if (cardsToShow.length > 0) {
        cardsToShow[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    showLessBtn.addEventListener('click', function () {
      // Hide all cards beyond the first 4
      allCards.forEach((card, index) => {
        if (index >= 4) {
          card.classList.remove('show-card');
        }
      });
      currentVisibleCount = 4;

      // Update button visibility
      updateLoadMoreButton();

      // Scroll to Featured Collections section
      const featuredSection = document.getElementById('featuredCollections');
      if (featuredSection) {
        featuredSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Update on resize
    window.addEventListener('resize', updateLoadMoreButton);
    updateLoadMoreButton();
  }

  if (carousel && scrollLeftBtn && scrollRightBtn) {
    // スクロール位置をチェックしてボタンの状態を更新
    function updateButtonStates() {
      const isAtStart = carousel.scrollLeft <= 0;
      const isAtEnd = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth;

      scrollLeftBtn.disabled = isAtStart;
      scrollRightBtn.disabled = isAtEnd;
    }

    // 左スクロールボタン
    scrollLeftBtn.addEventListener('click', function () {
      carousel.scrollBy({
        left: -getScrollAmount(),
        behavior: 'smooth'
      });
    });

    // 右スクロールボタン
    scrollRightBtn.addEventListener('click', function () {
      carousel.scrollBy({
        left: getScrollAmount(),
        behavior: 'smooth'
      });
    });

    // スクロール時にボタン状態を更新
    carousel.addEventListener('scroll', updateButtonStates);

    // 初期状態を設定
    updateButtonStates();
  }

  function openModal() {
    if (!imageModal) return;
    imageModal.classList.remove('hidden');
    body.classList.add('overflow-hidden');
  }

  function closeModal() {
    if (!imageModal) return;
    imageModal.classList.add('hidden');
    body.classList.remove('overflow-hidden');
  }

  if (featuredImageCard) {
    featuredImageCard.addEventListener('click', openModal);
    featuredImageCard.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal();
      }
    });
  }

  if (closeImageModal) {
    closeImageModal.addEventListener('click', closeModal);
  }

  if (imageModal) {
    imageModal.addEventListener('click', function (event) {
      if (event.target === imageModal) {
        closeModal();
      }
    });
    imageModal.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });
  }

  if (protectedWrapper) {
    protectedWrapper.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });
  }

  window.addEventListener('resize', () => {
    if (carousel && scrollLeftBtn && scrollRightBtn) {
      const isAtStart = carousel.scrollLeft <= 0;
      const isAtEnd = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth;
      scrollLeftBtn.disabled = isAtStart;
      scrollRightBtn.disabled = isAtEnd;
    }
  });
});

// Sold / 2100 インジケーターを更新するためのヘルパー関数
function updateSoldStatus(sold, supply = 2100) {
  const soldText = document.getElementById('soldText');
  const soldBar = document.getElementById('soldBar');

  if (!soldText || !soldBar) return;

  const safeSupply = supply > 0 ? supply : 1;
  const ratio = Math.max(0, Math.min(1, sold / safeSupply));

  soldText.textContent = `${sold} / ${safeSupply}`;
  soldBar.style.width = `${ratio * 100}%`;
}

// 運営ウォレットの保有数から Sold 数を算出して反映するためのヘルパー関数
function applyOperatorBalance(operatorBalance, totalSupply = 2100) {
  const safeSupply = totalSupply > 0 ? totalSupply : 1;
  const balance = Math.max(0, operatorBalance);

  // Sold = 総供給 - 運営保有数
  const sold = Math.max(0, safeSupply - balance);
  updateSoldStatus(sold, safeSupply);
}

// ---------------------------------------------------------------------------
// HyperScan(Blockscout) API を使って運営ウォレットのNFT保有数を取得し、
// Sold インジケーターに反映するための処理
// ---------------------------------------------------------------------------

// 運営ウォレットとNFTコントラクトの設定
const OPERATOR_ADDRESS = '0x56e143ca73d671a8db81879ec6082b43c8ef1320';
const CONTRACT_ADDRESS = '0x3e9452A9875d1d8f9F8B93423B49928b643f195d';
const TOTAL_SUPPLY = 2100;

/**
 * HyperScanのBlockscout APIから運営ウォレットのNFT保有数を取得
 */
async function fetchOperatorBalance() {
  try {
    const apiUrl = `https://www.hyperscan.com/api?module=account&action=tokennfttx&address=${OPERATOR_ADDRESS}&contractaddress=${CONTRACT_ADDRESS}&page=1&offset=10000&sort=desc`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === '1' && data.result && Array.isArray(data.result)) {
      const receivedTokens = data.result.filter(tx =>
        tx.to && tx.to.toLowerCase() === OPERATOR_ADDRESS.toLowerCase()
      );

      const sentTokens = data.result.filter(tx =>
        tx.from && tx.from.toLowerCase() === OPERATOR_ADDRESS.toLowerCase()
      );

      const operatorBalance = receivedTokens.length - sentTokens.length;

      if (typeof applyOperatorBalance === 'function') {
        applyOperatorBalance(operatorBalance, TOTAL_SUPPLY);
      }

      return {
        success: true,
        balance: operatorBalance,
        received: receivedTokens.length,
        sent: sentTokens.length,
        totalSupply: TOTAL_SUPPLY,
      };
    } else if (data.status === '0' && data.message === 'No transactions found') {
      if (typeof applyOperatorBalance === 'function') {
        applyOperatorBalance(0, TOTAL_SUPPLY);
      }

      return {
        success: true,
        balance: 0,
        received: 0,
        sent: 0,
        totalSupply: TOTAL_SUPPLY,
      };
    } else {
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to fetch operator balance:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ページ読み込み時に自動実行（本番: APIから実データを取得）
fetchOperatorBalance();

// デモ用に固定値で Sold を確認したい場合は、以下の行を一時的に有効化してください。
// applyOperatorBalance(2100 - 500, TOTAL_SUPPLY); // Sold = 500 / 2100
