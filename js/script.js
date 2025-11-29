/* ========== GLOBAL VARIABLES ========== */

let allAnimeData = [];
let watchlist = [];
const JIKAN_API_BASE = "https://api.jikan.moe/v4";
const ANN_API_BASE = "https://cdn.animenewsnetwork.com/encyclopedia/api.xml";

/* ========== LOCAL STORAGE FUNCTIONS ========== */

// Load watchlist from local storage on page load
function loadWatchlist() {
  const stored = localStorage.getItem("animeWatchlist");
  if (stored) {
    watchlist = JSON.parse(stored);
  }
}

// Save watchlist to local storage
function saveWatchlist() {
  localStorage.setItem("animeWatchlist", JSON.stringify(watchlist));
}

/* ========== INITIALIZATION ========== */

document.addEventListener("DOMContentLoaded", () => {
  loadWatchlist();
  initializePageElements();
  initializeMobileMenu();
  createSakuraPetals();
});

// Initialize page-specific elements
function initializePageElements() {
  const searchForm = document.getElementById("searchForm");
  const watchlistItems = document.getElementById("watchlistItems");
  const newsItems = document.getElementById("newsItems");
  const clearWatchlistBtn = document.getElementById("clearWatchlistBtn");

  // Search page initialization
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearchSubmit);
    const genreFilter = document.getElementById("genreFilter");
    const statusFilter = document.getElementById("statusFilter");
    const scoreFilter = document.getElementById("scoreFilter");
    const typeFilter = document.getElementById("typeFilter");

    if (genreFilter) genreFilter.addEventListener("change", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    if (scoreFilter) scoreFilter.addEventListener("change", applyFilters);
    if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  }

  // Watchlist page initialization
  if (watchlistItems) {
    displayWatchlist();
    loadRecommendationsForWatchlist();
  }

  if (clearWatchlistBtn) {
    clearWatchlistBtn.addEventListener("click", clearAllWatchlist);
  }

  // News page initialization
  if (newsItems) {
    loadAnimeNews();
  }

  // Anime detail page initialization
  const animeDetail = document.getElementById("animeDetail");
  if (animeDetail) {
    loadAnimeDetail();
  }

  // Upcoming anime detail page initialization
  const newsDetail = document.getElementById("newsDetail");
  if (newsDetail) {
    loadUpcomingAnimeDetail();
  }
}

/* ========== MOBILE MENU FUNCTIONALITY ========== */

// Initialize mobile menu hamburger functionality
function initializeMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector(".nav-menu");

  if (hamburger && navMenu) {
    // Toggle menu on hamburger click
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    // Close menu when clicking on a nav link
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      const isClickInsideNav =
        navMenu.contains(event.target) || hamburger.contains(event.target);
      if (!isClickInsideNav && navMenu.classList.contains("active")) {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
      }
    });
  }
}

/* ========== SEARCH FUNCTIONALITY ========== */

// Handle search form submission
function handleSearchSubmit(event) {
  event.preventDefault();

  const searchInput = document.getElementById("searchInput");
  const searchError = document.getElementById("searchError");

  // Get search query (optional now)
  const query = searchInput.value.trim();

  searchError.textContent = "";
  performSearch(query);
}

// Perform search using Fetch API
async function performSearch(query) {
  const loadingSpinner = document.getElementById("loadingSpinner");
  const searchResults = document.getElementById("searchResults");

  if (loadingSpinner) {
    loadingSpinner.classList.remove("hidden");
  }

  try {
    // Build search URL - if no query, get seasonal anime
    let searchUrl;
    if (query) {
      searchUrl = `${JIKAN_API_BASE}/anime?q=${encodeURIComponent(
        query
      )}&limit=25`;
    } else {
      // If no search query, show current season anime
      searchUrl = `${JIKAN_API_BASE}/seasons/now?limit=25`;
    }

    // Fetch anime data from Jikan API
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await response.json();
    allAnimeData = data.data || [];

    if (loadingSpinner) {
      loadingSpinner.classList.add("hidden");
    }

    displaySearchResults(allAnimeData);
  } catch (error) {
    console.error("Error fetching anime:", error);
    if (searchResults) {
      searchResults.innerHTML =
        '<p class="error">Error loading anime. Please try again.</p>';
    }
    if (loadingSpinner) {
      loadingSpinner.classList.add("hidden");
    }
  }
}

// Display search results with DOM manipulation
function displaySearchResults(animeList) {
  const searchResults = document.getElementById("searchResults");

  if (!searchResults) return;

  if (animeList.length === 0) {
    searchResults.innerHTML = "<p>No anime found. Try a different search.</p>";
    return;
  }

  searchResults.innerHTML = "";

  // Use array method to create anime cards
  animeList.forEach((anime) => {
    const card = createAnimeCard(anime);
    searchResults.appendChild(card);
  });
}

// Create anime card element
function createAnimeCard(anime) {
  const card = document.createElement("div");
  card.className = "anime-card";

  const imageUrl = anime.images?.jpg?.image_url || "images/placeholder.jpg";
  const title = anime.title_english || anime.title || "Unknown Title";
  const episodes = anime.episodes || "N/A";
  const rating = anime.score || "N/A";

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="anime-card-image">
    <div class="anime-card-content">
      <h3 class="anime-card-title">${title}</h3>
      <p class="anime-card-info">Episodes: ${episodes}</p>
      <p class="anime-card-rating">Rating: ${rating}/10</p>
      <button class="anime-card-button" data-anime-id="${
        anime.mal_id
      }" data-anime-title="${title}">
        ${isInWatchlist(anime.mal_id) ? "Remove" : "Add to Watchlist"}
      </button>
    </div>
  `;

  // Event listener for watchlist button
  card.querySelector(".anime-card-button").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleWatchlist(anime);
  });

  // Event listener for card click to view details
  card.addEventListener("click", () => {
    viewAnimeDetail(anime.mal_id);
  });

  return card;
}

/* ========== FILTER FUNCTIONALITY ========== */

// Apply filters to search results
function applyFilters() {
  const genreFilter = document.getElementById("genreFilter")?.value || "";
  const statusFilter = document.getElementById("statusFilter")?.value || "";
  const typeFilter = document.getElementById("typeFilter")?.value || "";
  const scoreFilter = parseFloat(
    document.getElementById("scoreFilter")?.value || 0
  );

  // Use array filter method for filtering logic
  const filtered = allAnimeData.filter((anime) => {
    const matchesGenre =
      !genreFilter ||
      (anime.genres &&
        anime.genres.some(
          (g) => g.name.toLowerCase() === genreFilter.toLowerCase()
        ));

    const matchesStatus =
      !statusFilter ||
      (anime.status &&
        anime.status.toLowerCase().includes(statusFilter.toLowerCase()));

    const matchesType =
      !typeFilter ||
      (anime.type && anime.type.toLowerCase() === typeFilter.toLowerCase());

    const matchesScore = !scoreFilter || anime.score >= scoreFilter;

    return matchesGenre && matchesStatus && matchesType && matchesScore;
  });

  displaySearchResults(filtered);
}

/* ========== WATCHLIST FUNCTIONS ========== */

// Check if anime is in watchlist
function isInWatchlist(animeId) {
  return watchlist.some((item) => item.mal_id === animeId);
}

// Toggle anime in watchlist
function toggleWatchlist(anime) {
  if (isInWatchlist(anime.mal_id)) {
    removeFromWatchlist(anime.mal_id);
  } else {
    addToWatchlist(anime);
  }
}

// Add anime to watchlist
function addToWatchlist(anime) {
  if (!isInWatchlist(anime.mal_id)) {
    watchlist.push({
      mal_id: anime.mal_id,
      title: anime.title,
      image: anime.images?.jpg?.image_url || "images/placeholder.jpg",
      score: anime.score || "N/A",
      genres: anime.genres || [],
      streaming: anime.streaming || [],
    });
    saveWatchlist();
    updateButtonStates();
  }
}

// Remove anime from watchlist
function removeFromWatchlist(animeId) {
  watchlist = watchlist.filter((item) => item.mal_id !== animeId);
  saveWatchlist();
  updateButtonStates();
  displayWatchlist();
}

// Update button states across pages
function updateButtonStates() {
  document.querySelectorAll(".anime-card-button").forEach((btn) => {
    const animeId = parseInt(btn.dataset.animeId);
    btn.textContent = isInWatchlist(animeId) ? "Remove" : "Add to Watchlist";
  });
}

// Display watchlist on watchlist page
function displayWatchlist() {
  const watchlistItems = document.getElementById("watchlistItems");
  const emptyMessage = document.getElementById("emptyMessage");

  if (!watchlistItems) return;

  if (watchlist.length === 0) {
    watchlistItems.classList.add("hidden");
    if (emptyMessage) emptyMessage.classList.remove("hidden");
    return;
  }

  watchlistItems.classList.remove("hidden");
  if (emptyMessage) emptyMessage.classList.add("hidden");

  watchlistItems.innerHTML = "";

  // Map watchlist items to DOM elements
  watchlist.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "watchlist-item";
    itemElement.style.cursor = "pointer";

    // Get streaming services if available
    const streamingHTML = getStreamingServicesHTML(item.streaming);

    itemElement.innerHTML = `
      <img src="${item.image}" alt="${item.title}" onerror="this.src='images/placeholder.jpg'">
      <div class="watchlist-item-content">
        <h3 class="watchlist-item-title">${item.title}</h3>
        <p class="watchlist-item-rating">⭐ ${item.score}/10</p>
        ${streamingHTML}
        <button class="remove-from-watchlist-btn" data-anime-id="${item.mal_id}">
          Remove from Watchlist
        </button>
      </div>
    `;

    // Add click handler to navigate to detail page
    itemElement.addEventListener("click", (e) => {
      // Don't navigate if clicking the remove button
      if (!e.target.classList.contains("remove-from-watchlist-btn")) {
        viewAnimeDetail(item.mal_id);
      }
    });

    itemElement
      .querySelector(".remove-from-watchlist-btn")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromWatchlist(item.mal_id);
      });

    watchlistItems.appendChild(itemElement);
  });
}

// Clear all watchlist items
function clearAllWatchlist() {
  if (confirm("Are you sure you want to clear your entire watchlist?")) {
    watchlist = [];
    saveWatchlist();
    displayWatchlist();
    loadRecommendationsForWatchlist();
  }
}

// Get streaming services HTML
function getStreamingServicesHTML(streaming) {
  if (!streaming || streaming.length === 0) {
    return '<p class="streaming-info">Streaming: Not available</p>';
  }

  const streamingNames = streaming
    .slice(0, 2)
    .map((s) => s.name)
    .join(", ");
  const moreCount = streaming.length > 2 ? ` +${streaming.length - 2}` : "";

  return `<p class="streaming-info">📺 ${streamingNames}${moreCount}</p>`;
}

/* ========== ANIME DETAIL PAGE ========== */

// Get anime ID from URL parameter
function getAnimeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("id"));
}

// Fetch and display anime detail
async function loadAnimeDetail() {
  const animeId = getAnimeIdFromUrl();
  const animeDetail = document.getElementById("animeDetail");

  if (!animeId || !animeDetail) return;

  try {
    const response = await fetch(`${JIKAN_API_BASE}/anime/${animeId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch anime details");
    }

    const data = await response.json();
    const anime = data.data;

    // DOM manipulation to create detail view
    animeDetail.innerHTML = createDetailView(anime);

    // Add event listeners to detail buttons
    const addBtn = document.querySelector(".add-detail-btn");
    const removeBtn = document.querySelector(".remove-detail-btn");

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        addToWatchlist(anime);
        updateDetailButtons(anime.mal_id);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        removeFromWatchlist(anime.mal_id);
        updateDetailButtons(anime.mal_id);
      });
    }

    updateDetailButtons(anime.mal_id);
  } catch (error) {
    console.error("Error loading anime detail:", error);
    animeDetail.innerHTML =
      "<p>Error loading anime details. Please try again.</p>";
  }
}

// Create detail view HTML
function createDetailView(anime) {
  const imageUrl = anime.images?.jpg?.image_url || "images/placeholder.jpg";
  const genres = anime.genres?.map((g) => g.name).join(", ") || "Not specified";
  const studios =
    anime.studios?.map((s) => s.name).join(", ") || "Not specified";
  const status = anime.status || "Unknown";
  const episodes = anime.episodes || "Unknown";
  const aired = anime.aired?.string || "Not specified";
  const synopsis = anime.synopsis || "No synopsis available.";

  return `
    <div class="detail-container">
      <div class="detail-image">
        <img src="${imageUrl}" alt="${anime.title}">
      </div>
      <div class="detail-content">
        <h1>${anime.title}</h1>
        <div class="detail-info">
          <div class="info-item">
            <strong>Status:</strong>
            ${status}
          </div>
          <div class="info-item">
            <strong>Episodes:</strong>
            ${episodes}
          </div>
          <div class="info-item">
            <strong>Aired:</strong>
            ${aired}
          </div>
          <div class="info-item">
            <strong>Rating:</strong>
            ⭐ ${anime.score || "N/A"}/10
          </div>
          <div class="info-item">
            <strong>Genres:</strong>
            ${genres}
          </div>
          <div class="info-item">
            <strong>Studios:</strong>
            ${studios}
          </div>
        </div>
        <h2>Synopsis</h2>
        <p>${synopsis}</p>
        <div class="detail-buttons">
          <button class="add-detail-btn">Add to Watchlist</button>
          <button class="remove-detail-btn">Remove from Watchlist</button>
        </div>
      </div>
    </div>
  `;
}

// Update detail page buttons based on watchlist status
function updateDetailButtons(animeId) {
  const addBtn = document.querySelector(".add-detail-btn");
  const removeBtn = document.querySelector(".remove-detail-btn");

  if (isInWatchlist(animeId)) {
    if (addBtn) addBtn.style.display = "none";
    if (removeBtn) removeBtn.style.display = "block";
  } else {
    if (addBtn) addBtn.style.display = "block";
    if (removeBtn) removeBtn.style.display = "none";
  }
}

// Navigate to anime detail page
function viewAnimeDetail(animeId) {
  window.location.href = `anime-detail.html?id=${animeId}`;
}

/* ========== UPCOMING ANIME ========== */

// Load upcoming anime from Jikan API
async function loadAnimeNews() {
  const newsItems = document.getElementById("newsItems");
  const loadingNews = document.getElementById("loadingNews");
  const newsError = document.getElementById("newsError");

  if (!newsItems) return;

  // Show loading
  if (loadingNews) loadingNews.classList.remove("hidden");
  if (newsError) newsError.classList.add("hidden");

  try {
    // Fetch upcoming anime from Jikan API
    const response = await fetch(
      `${JIKAN_API_BASE}/top/anime?filter=upcoming&limit=25`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch upcoming anime");
    }

    const data = await response.json();
    const newsList = data.data || [];

    // Hide loading
    if (loadingNews) loadingNews.classList.add("hidden");

    // Display upcoming anime
    newsItems.innerHTML = "";
    if (newsList.length === 0) {
      newsItems.innerHTML =
        '<p class="info-text">No upcoming anime available at this time.</p>';
      return;
    }

    // Display upcoming anime items
    newsList.forEach((newsItem) => {
      const newsCard = createUpcomingAnimeCard(newsItem);
      newsItems.appendChild(newsCard);
    });
  } catch (error) {
    console.error("Error loading upcoming anime:", error);
    if (loadingNews) loadingNews.classList.add("hidden");
    if (newsError) newsError.classList.remove("hidden");
  }
}

// Create upcoming anime card from Jikan data
function createUpcomingAnimeCard(newsItem) {
  const card = document.createElement("div");
  card.className = "news-card";

  const imageUrl = newsItem.images?.jpg?.image_url || "images/placeholder.jpg";
  const title = newsItem.title_english || newsItem.title || "Unknown Title";
  const synopsis = newsItem.synopsis || "No description available.";
  const status = newsItem.status || "Upcoming";
  const season = newsItem.season
    ? `${newsItem.season} ${newsItem.year}`
    : "TBA";
  const genres = newsItem.genres?.map((g) => g.name).join(", ") || "Unknown";

  // Truncate synopsis for card
  const truncatedSynopsis =
    synopsis.length > 250 ? synopsis.substring(0, 250) + "..." : synopsis;

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="news-card-image" onerror="this.src='images/placeholder.jpg'">
    <div class="news-card-content">
      <span class="news-badge">${status}</span>
      <h3 class="news-card-title">${title}</h3>
      <p class="news-episode-info">${season} | ${genres}</p>
      <p class="news-card-description">${truncatedSynopsis}</p>
      <button class="anime-card-button" data-anime-id="${newsItem.mal_id}">
        View Details
      </button>
    </div>
  `;

  // Event listener for view details button
  card.querySelector(".anime-card-button").addEventListener("click", (e) => {
    e.stopPropagation();
    viewUpcomingAnimeDetail(newsItem.mal_id, newsItem);
  });

  // Event listener for card click
  card.addEventListener("click", () => {
    viewUpcomingAnimeDetail(newsItem.mal_id, newsItem);
  });

  return card;
}

// Navigate to upcoming anime detail page
function viewUpcomingAnimeDetail(animeId, animeData) {
  // Store anime data in sessionStorage for detail page
  sessionStorage.setItem("currentUpcomingAnime", JSON.stringify(animeData));
  window.location.href = `news-detail.html?id=${animeId}`;
}

/* ========== UPCOMING ANIME DETAIL PAGE ========== */

// Get anime ID from URL parameter
function getUpcomingAnimeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Load and display upcoming anime detail
async function loadUpcomingAnimeDetail() {
  const newsDetail = document.getElementById("newsDetail");
  const loadingDetail = document.getElementById("loadingDetail");
  const detailError = document.getElementById("detailError");

  if (!newsDetail) return;

  const animeId = getUpcomingAnimeIdFromUrl();

  if (!animeId) {
    if (loadingDetail) loadingDetail.classList.add("hidden");
    if (detailError) detailError.classList.remove("hidden");
    return;
  }

  try {
    // Try to get anime data from sessionStorage first
    const storedAnime = sessionStorage.getItem("currentUpcomingAnime");

    if (storedAnime) {
      const animeData = JSON.parse(storedAnime);

      if (loadingDetail) loadingDetail.classList.add("hidden");

      // Display anime detail
      newsDetail.innerHTML = createUpcomingAnimeDetailView(animeData);
    } else {
      // If no stored data, fetch from Jikan API
      const response = await fetch(`${JIKAN_API_BASE}/anime/${animeId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch anime details");
      }

      const data = await response.json();
      const animeData = data.data;

      if (loadingDetail) loadingDetail.classList.add("hidden");
      newsDetail.innerHTML = createUpcomingAnimeDetailView(animeData);
    }
  } catch (error) {
    console.error("Error loading upcoming anime detail:", error);
    if (loadingDetail) loadingDetail.classList.add("hidden");
    if (detailError) detailError.classList.remove("hidden");
  }
}

// Create upcoming anime detail view HTML
function createUpcomingAnimeDetailView(animeData) {
  const imageUrl = animeData.images?.jpg?.image_url || "images/placeholder.jpg";
  const title = animeData.title_english || animeData.title || "Unknown Title";
  const synopsis = animeData.synopsis || "No synopsis available.";
  const status = animeData.status || "Upcoming";
  const type = animeData.type || "Unknown";
  const season = animeData.season
    ? `${animeData.season} ${animeData.year}`
    : "TBA";
  const genres =
    animeData.genres?.map((g) => g.name).join(", ") || "Not specified";
  const studios =
    animeData.studios?.map((s) => s.name).join(", ") || "Not specified";
  const source = animeData.source || "Unknown";
  const rating = animeData.rating || "Not rated";
  const aired = animeData.aired?.string || "Not announced";

  return `
    <div class="detail-container">
      <div class="detail-image">
        <img src="${imageUrl}" alt="${title}" onerror="this.src='images/placeholder.jpg'">
      </div>
      <div class="detail-content">
        <div class="news-meta">
          <span class="news-badge">${status}</span>
          <span class="news-date">${season}</span>
        </div>
        <h1>${title}</h1>
        <div class="detail-info">
          <div class="info-item">
            <strong>Status:</strong>
            ${status}
          </div>
          <div class="info-item">
            <strong>Type:</strong>
            ${type}
          </div>
          <div class="info-item">
            <strong>Release:</strong>
            ${aired}
          </div>
          <div class="info-item">
            <strong>Source:</strong>
            ${source}
          </div>
          <div class="info-item">
            <strong>Genres:</strong>
            ${genres}
          </div>
          <div class="info-item">
            <strong>Studios:</strong>
            ${studios}
          </div>
          <div class="info-item">
            <strong>Rating:</strong>
            ${rating}
          </div>
        </div>
        <h2>Synopsis</h2>
        <div class="news-detail-body">
          <p>${synopsis}</p>
        </div>
        <div class="detail-buttons">
          <button class="anime-card-button" onclick="window.location.href='news.html'">
            Back to Upcoming Anime
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ========== RECOMMENDATIONS FOR WATCHLIST PAGE ========== */

// Load recommendations for watchlist page
async function loadRecommendationsForWatchlist() {
  const recommendedItems = document.getElementById("recommendedItems");
  const noRecommendations = document.getElementById("noRecommendations");
  const recommendationsSection = document.getElementById(
    "recommendationsSection"
  );

  if (!recommendedItems || !recommendationsSection) return;

  // Check if watchlist is empty
  if (watchlist.length === 0) {
    recommendationsSection.style.display = "none";
    return;
  }

  recommendationsSection.style.display = "block";
  recommendedItems.classList.remove("hidden");
  if (noRecommendations) noRecommendations.classList.add("hidden");

  try {
    // Extract genres from watchlist using array methods
    const genresFromWatchlist = extractWatchlistGenres();

    if (genresFromWatchlist.length === 0) {
      recommendedItems.innerHTML =
        '<p class="info-text">Add more anime to your watchlist for better recommendations.</p>';
      return;
    }

    // Show loading message
    recommendedItems.innerHTML =
      '<p class="info-text">Loading recommendations...</p>';

    // Fetch recommendations for top genres
    const topGenre = genresFromWatchlist[0];
    const response = await fetch(
      `${JIKAN_API_BASE}/anime?genres=${topGenre}&limit=12&order_by=score&sort=desc`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recommendations");
    }

    const data = await response.json();
    let recommendations = data.data || [];

    // Filter out anime already in watchlist
    recommendations = recommendations.filter(
      (anime) => !isInWatchlist(anime.mal_id)
    );

    // Limit to 10 recommendations
    recommendations = recommendations.slice(0, 10);

    if (recommendations.length === 0) {
      recommendedItems.innerHTML =
        '<p class="info-text">No new recommendations available at this time.</p>';
      return;
    }

    // Display recommendations
    recommendedItems.innerHTML = "";
    recommendations.forEach((anime) => {
      const card = createRecommendationCard(anime);
      recommendedItems.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading recommendations:", error);
    recommendedItems.innerHTML =
      '<p class="error">Error loading recommendations. Please try again.</p>';
  }
}

// Create recommendation card (similar to anime card but optimized for watchlist page)
function createRecommendationCard(anime) {
  const card = document.createElement("div");
  card.className = "watchlist-item recommendation-card";
  card.style.cursor = "pointer";

  const imageUrl = anime.images?.jpg?.image_url || "images/placeholder.jpg";
  const title = anime.title_english || anime.title || "Unknown Title";
  const rating = anime.score || "N/A";
  const genres =
    anime.genres
      ?.slice(0, 2)
      .map((g) => g.name)
      .join(", ") || "";

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" onerror="this.src='images/placeholder.jpg'">
    <div class="watchlist-item-content">
      <h3 class="watchlist-item-title">${title}</h3>
      <p class="watchlist-item-rating">⭐ ${rating}/10</p>
      ${genres ? `<p class="recommendation-genres">${genres}</p>` : ""}
      <button class="anime-card-button add-recommendation-btn" data-anime-id="${
        anime.mal_id
      }">
        Add to Watchlist
      </button>
    </div>
  `;

  // Click card to view details
  card.addEventListener("click", (e) => {
    if (!e.target.classList.contains("add-recommendation-btn")) {
      viewAnimeDetail(anime.mal_id);
    }
  });

  // Add to watchlist button
  card
    .querySelector(".add-recommendation-btn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      addToWatchlist(anime);
      // Refresh recommendations after adding
      loadRecommendationsForWatchlist();
    });

  return card;
}

// Extract genres from watchlist
function extractWatchlistGenres() {
  const genreMap = {};

  // Iterate through watchlist and count genres
  watchlist.forEach((item) => {
    if (item.genres && Array.isArray(item.genres)) {
      item.genres.forEach((genre) => {
        if (genre.mal_id) {
          genreMap[genre.mal_id] = (genreMap[genre.mal_id] || 0) + 1;
        }
      });
    }
  });

  // Sort genres by frequency and return top 3 genre IDs
  return Object.entries(genreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genreId]) => genreId);
}
/* ========== RESPONSIVE DESIGN ADJUSTMENTS ========== */

// Adjust layout for smaller screens
window.addEventListener("resize", adjustLayoutForScreenSize);
function adjustLayoutForScreenSize() {
  const detailInfo = document.querySelector(".detail-info");
  if (detailInfo) {
    if (window.innerWidth < 600) {
      detailInfo.style.gridTemplateColumns = "1fr";
    } else {
      detailInfo.style.gridTemplateColumns = "1fr 1fr";
    }
  }
}
adjustLayoutForScreenSize();

/* ========== SAKURA CHERRY BLOSSOM EFFECTS ========== */

// Create floating sakura petals
function createSakuraPetals() {
  const petalsContainer = document.createElement("div");
  petalsContainer.className = "sakura-petals";

  // Create 10 petals
  for (let i = 0; i < 10; i++) {
    const petal = document.createElement("div");
    petal.className = "sakura-petal";
    petalsContainer.appendChild(petal);
  }

  document.body.appendChild(petalsContainer);

  // Create sakura branch decoration
  const branch = document.createElement("div");
  branch.className = "sakura-branch";
  document.body.appendChild(branch);
}

/* ========== END OF SCRIPT ========== */
