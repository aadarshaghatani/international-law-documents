// ================================
// International Law Library PWA
// ================================

document.addEventListener('DOMContentLoaded', function() {

// --- Global State ---
let documentsIndex = [];        // loaded from docs.json
let currentDoc = null;          // currently displayed document data
let currentDocPath = null;      // path of current document (for favorites)
let allDocsData = {};           // cache for fetched document JSON
let favorites = [];             // array of document paths that are favorited

// Load favorites from localStorage
try {
    const stored = localStorage.getItem('lawlib-favorites');
    if (stored) favorites = JSON.parse(stored);
} catch (e) {
    console.warn('Could not load favorites from localStorage', e);
}

// --- DOM Elements ---
const menuToggle = document.getElementById('menuToggle');
// --- TOC Elements ---
const tocButton = document.getElementById('tocButton');
const tocPanel = document.getElementById('tocPanel');
const tocClose = document.getElementById('tocClose');
const tocContent = document.getElementById('tocContent');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebar = document.getElementById('sidebar');
const categoryList = document.getElementById('categoryList');
const content = document.getElementById('content');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// ================================
// Initialization
// ================================
async function init() {
    await loadIndex();
    renderAllCategories();      // renders both favorites and regular categories
    setupEventListeners();
    setPlaceholder();           // set initial placeholder
}

// Set placeholder based on whether a document is open
function setPlaceholder() {
    if (currentDoc) {
        searchInput.placeholder = 'Search in this document...';
    } else {
        searchInput.placeholder = 'Search all documents...';
    }
}

// Load docs.json (list of all documents)
async function loadIndex() {
    try {
        const response = await fetch('docs.json');
        documentsIndex = await response.json();
        console.log('Loaded docs.json with', documentsIndex.length, 'documents');
    } catch (error) {
        console.error('Failed to load document index:', error);
        if (content) content.innerHTML = `<p class="error">Error loading document list. Please refresh.</p>`;
    }
}

// Set up all event listeners
function setupEventListeners() {
    if (tocButton) {
        tocButton.addEventListener('click', openTOC);
    }
    if (tocClose) {
        tocClose.addEventListener('click', closeTOC);
    }

    // Sidebar buttons
    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    } else {
        console.warn('menuToggle not found');
    }
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    } else {
        console.warn('sidebarClose not found');
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    } else {
        console.warn('sidebarOverlay not found');
    }

    // Search
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                if (currentDoc) {
                    performLocalSearch(query);
                } else {
                    performSearch(query);
                }
            }
        });
    } else {
        console.warn('searchBtn not found');
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    if (currentDoc) {
                        performLocalSearch(query);
                    } else {
                        performSearch(query);
                    }
                }
            }
        });
    } else {
        console.warn('searchInput not found');
    }
}

// ================================
// Sidebar Controls
// ================================
function openSidebar() {
    document.body.classList.add('sidebar-visible');
}

function closeSidebar() {
    document.body.classList.remove('sidebar-visible');
}

function openTOC() {
    if (tocPanel) tocPanel.classList.add('open');
}

function closeTOC() {
    if (tocPanel) tocPanel.classList.remove('open');
}

// ================================
// Favorites Management
// ================================
function toggleFavorite(path) {
    const index = favorites.indexOf(path);
    if (index === -1) {
        favorites.push(path);
    } else {
        favorites.splice(index, 1);
    }
    try {
        localStorage.setItem('lawlib-favorites', JSON.stringify(favorites));
    } catch (e) {
        console.warn('Could not save favorites to localStorage', e);
    }
    renderFavoritesCategory();
    if (currentDoc && currentDocPath === path) {
        updateFavoriteButton(path);
    }
}

function updateFavoriteButton(path) {
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
        const isFav = favorites.includes(path);
        favBtn.textContent = isFav ? '★' : '☆';
        favBtn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
    }
}

// ================================
// Render Categories (including Favorites)
// ================================
function renderAllCategories() {
    if (!categoryList) {
        console.error('Category list element not found!');
        return;
    }

    let html = '';

    // 1. Favorites category (always at the top)
    html += renderFavoritesCategoryHTML();

    // 2. Group remaining documents by category
    const categories = {};
    documentsIndex.forEach(doc => {
        const cat = doc.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(doc);
    });

    for (const [catName, docs] of Object.entries(categories)) {
        html += `<div class="category">`;
        html += `<h3 class="category-header">${catName}</h3>`;
        html += `<ul class="documents">`;
        docs.forEach(doc => {
            html += `<li data-path="${doc.path}" data-title="${doc.title}">${doc.title}${doc.year ? ` (${doc.year})` : ''}</li>`;
        });
        html += `</ul>`;
        html += `</div>`;
    }

    categoryList.innerHTML = html;

    // Attach category header click listeners
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = header.closest('.category');
            category.classList.toggle('collapsed');
        });
    });

    // Attach document click listeners
    document.querySelectorAll('.documents li').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            const title = item.dataset.title;
            loadDocument(path, title);
            if (window.innerWidth < 768) closeSidebar();
        });
    });
}

function renderFavoritesCategoryHTML() {
    const favDocs = documentsIndex.filter(doc => favorites.includes(doc.path));
    let html = `<div class="category" id="favorites-category">`;
    html += `<h3 class="category-header">⭐ Favorites (${favDocs.length})</h3>`;
    html += `<ul class="documents">`;
    if (favDocs.length === 0) {
        html += `<li class="empty-favorites">No favorites yet</li>`;
    } else {
        favDocs.forEach(doc => {
            html += `<li data-path="${doc.path}" data-title="${doc.title}">${doc.title}${doc.year ? ` (${doc.year})` : ''}</li>`;
        });
    }
    html += `</ul>`;
    html += `</div>`;
    return html;
}

function renderFavoritesCategory() {
    const favCategory = document.getElementById('favorites-category');
    if (favCategory) {
        favCategory.outerHTML = renderFavoritesCategoryHTML();
    } else {
        renderAllCategories();
        return;
    }
    const newFavCategory = document.getElementById('favorites-category');
    if (newFavCategory) {
        const header = newFavCategory.querySelector('.category-header');
        if (header) {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                newFavCategory.classList.toggle('collapsed');
            });
        }
        newFavCategory.querySelectorAll('.documents li').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                const title = item.dataset.title;
                loadDocument(path, title);
                if (window.innerWidth < 768) closeSidebar();
            });
        });
    }
}

// ================================
// Load and Display a Document
// ================================
async function loadDocument(path, title) {
    if (!content) {
        console.error('Content element missing!');
        return;
    }
    content.innerHTML = '<p>Loading document...</p>';

    try {
        let docData;
        if (allDocsData[path]) {
            docData = allDocsData[path];
        } else {
            const response = await fetch(path);
            docData = await response.json();
            allDocsData[path] = docData;
        }

        currentDoc = docData;
        currentDocPath = path;
        renderDocument(docData, title, path);
        buildTOC(docData);
        setPlaceholder();  // update placeholder to "Search in this document..."
    } catch (error) {
        console.error('Error loading document:', error);
        content.innerHTML = '<p class="error">Failed to load document. Please try again.</p>';
    }
}

// Function to return to the full document view (e.g., after local search)
function showFullDocument() {
    if (currentDoc && currentDocPath) {
        renderDocument(currentDoc, currentDoc.title, currentDocPath);
        buildTOC(currentDoc);
    }
}

// Full renderDocument with all content
function renderDocument(doc, title, docPath) {
    if (!content) return;

    let html = `<div class="document-view">`;
    html += `<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">`;
    html += `<h2>${doc.title || title}</h2>`;
    const isFav = favorites.includes(docPath);
    html += `<button id="favoriteBtn" class="favorite-btn" data-path="${docPath}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '★' : '☆'}</button>`;
    html += `</div>`;

    // Extract year from date field if available
    if (doc.date) {
        const year = doc.date.split('-')[0];
        html += `<p class="doc-year">Adopted: ${year}</p>`;
    } else if (doc.year) {
        html += `<p class="doc-year">Adopted: ${doc.year}</p>`;
    }

    // Check if document uses the new structure (with content)
    if (doc.content) {
        // Render preamble as a special chapter
        if (doc.content.preamble) {
            html += `<div class="chapter" id="preamble" data-chapter-index="preamble">`;
            html += `<h3 class="chapter-header">Preamble</h3>`;
            html += `<div class="articles">`;
            const preambleParagraphs = doc.content.preamble.split('\n').filter(p => p.trim() !== '');
            preambleParagraphs.forEach((para, idx) => {
                html += `<div class="article">`;
                html += `<h4>Paragraph ${idx+1}</h4>`;
                html += `<p>${para}</p>`;
                html += `</div>`;
            });
            html += `</div>`;
            html += `</div>`;
        }

        // Render articles
        if (doc.content.articles && doc.content.articles.length > 0) {
            html += `<div class="chapter" data-chapter-index="articles">`;
            html += `<h3 class="chapter-header">Articles</h3>`;
            html += `<div class="articles">`;
            doc.content.articles.forEach(article => {
                const articleId = `article-${article.number}`;
                html += `<div class="article" id="${articleId}">`;
                const articleTitle = article.heading ? `${article.number}. ${article.heading}` : `Article ${article.number}`;
                html += `<h4>${articleTitle}</h4>`;
                const paragraphs = article.text.split('\n').filter(p => p.trim() !== '');
                paragraphs.forEach(p => {
                    html += `<p>${p}</p>`;
                });
                html += `</div>`;
            });
            html += `</div>`;
            html += `</div>`;
        }
    }
    // Fallback to old chapters structure if present
    else if (doc.chapters && doc.chapters.length > 0) {
        doc.chapters.forEach((chapter, index) => {
            const chapterId = `chapter-${index}`;
            html += `<div class="chapter" id="${chapterId}" data-chapter-index="${index}">`;
            html += `<h3 class="chapter-header">`;
            if (chapter.chapterNumber) {
                html += `${chapter.chapterNumber}${chapter.title ? ': ' + chapter.title : ''}`;
            } else if (chapter.title) {
                html += chapter.title;
            } else {
                html += `Chapter`;
            }
            html += `</h3>`;
            html += `<div class="articles">`;
            if (chapter.articles && chapter.articles.length > 0) {
                chapter.articles.forEach((article, aIdx) => {
                    const articleId = `chapter-${index}-article-${aIdx}`;
                    html += `<div class="article" id="${articleId}">`;
                    if (article.article) html += `<h4>${article.article}</h4>`;
                    const paragraphs = article.text.split('\n').filter(p => p.trim() !== '');
                    paragraphs.forEach(p => {
                        html += `<p>${p}</p>`;
                    });
                    html += `</div>`;
                });
            }
            html += `</div>`;
            html += `</div>`;
        });
    } else if (doc.text) {
        html += `<p>${doc.text}</p>`;
    } else {
        html += `<p>No content available.</p>`;
    }

    html += `</div>`; // end document-view
    content.innerHTML = html;

    // Add favorite button listener
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            const path = favBtn.dataset.path;
            toggleFavorite(path);
        });
    }

    // Add click listeners for chapter collapse/expand
    document.querySelectorAll('.chapter-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const chapterDiv = header.closest('.chapter');
            chapterDiv.classList.toggle('collapsed');
        });
    });
}

// ================================
// Table of Contents (unchanged)
// ================================
function buildTOC(doc) {
    if (!tocContent) return;
    let html = '';

    if (doc.content) {
        if (doc.content.preamble) {
            html += `<div class="toc-item chapter" data-target="preamble">Preamble</div>`;
        }
        if (doc.content.articles && doc.content.articles.length > 0) {
            doc.content.articles.forEach((article, idx) => {
                const articleId = `article-${article.number}`;
                html += `<div class="toc-item article" data-target="${articleId}">Article ${article.number}${article.heading ? ': ' + article.heading : ''}</div>`;
            });
        }
    } else if (doc.chapters) {
        doc.chapters.forEach((chapter, index) => {
            const chapterId = `chapter-${index}`;
            html += `<div class="toc-item chapter" data-target="${chapterId}">${chapter.chapterNumber || 'Chapter'}${chapter.title ? ': ' + chapter.title : ''}</div>`;
            if (chapter.articles) {
                chapter.articles.forEach((article, aIdx) => {
                    const articleId = `chapter-${index}-article-${aIdx}`;
                    html += `<div class="toc-item article" data-target="${articleId}">${article.article || 'Article'}</div>`;
                });
            }
        });
    }

    tocContent.innerHTML = html;

    document.querySelectorAll('.toc-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.dataset.target;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                closeTOC();
            }
        });
    });
}

// ================================
// Global Search (across all documents)
// ================================
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function performSearch(query) {
    if (!query.trim()) {
        alert('Please enter a search term.');
        return;
    }

    if (!content) return;
    content.innerHTML = '<p>Searching all documents...</p>';

    const results = [];
    let processed = 0;

    for (const doc of documentsIndex) {
        try {
            let docData;
            if (allDocsData[doc.path]) {
                docData = allDocsData[doc.path];
            } else {
                const response = await fetch(doc.path);
                docData = await response.json();
                allDocsData[doc.path] = docData;
            }

            processed++;

            const fullText = JSON.stringify(docData).toLowerCase();
            const queryLower = query.toLowerCase();
            if (fullText.includes(queryLower)) {
                const matches = [];
                let matchCount = 0;

                if (docData.content) {
                    if (docData.content.preamble && docData.content.preamble.toLowerCase().includes(queryLower)) {
                        matchCount += (docData.content.preamble.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
                        matches.push({
                            location: 'Preamble',
                            snippet: extractSnippet(docData.content.preamble, query)
                        });
                    }
                    if (docData.content.articles) {
                        docData.content.articles.forEach(article => {
                            if (article.text && article.text.toLowerCase().includes(queryLower)) {
                                matchCount += (article.text.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
                                matches.push({
                                    location: `Article ${article.number}`,
                                    snippet: extractSnippet(article.text, query)
                                });
                            }
                        });
                    }
                } else if (docData.chapters) {
                    docData.chapters.forEach(chapter => {
                        if (chapter.articles) {
                            chapter.articles.forEach(article => {
                                if (article.text && article.text.toLowerCase().includes(queryLower)) {
                                    matchCount += (article.text.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
                                    matches.push({
                                        location: article.article || 'Article',
                                        snippet: extractSnippet(article.text, query)
                                    });
                                }
                            });
                        }
                    });
                }

                if (matches.length === 0) {
                    matches.push({ location: 'Document metadata', snippet: 'Found in metadata' });
                    matchCount = 1;
                }

                results.push({
                    title: docData.title || doc.title,
                    path: doc.path,
                    matches: matches.slice(0, 3),
                    matchCount: matchCount
                });
            }

            if (processed % 5 === 0 && content) {
                content.innerHTML = `<p>Searched ${processed}/${documentsIndex.length} documents...</p>`;
            }
        } catch (e) {
            console.warn(`Error searching ${doc.path}:`, e);
        }
    }

    results.sort((a, b) => b.matchCount - a.matchCount);
    displaySearchResults(results, query);
}

// Helper to extract a snippet around the search term (with highlighting)
function extractSnippet(text, query) {
    const lowerText = text.toLowerCase();
    const idx = lowerText.indexOf(query.toLowerCase());
    if (idx === -1) return text.substring(0, 200) + '...';
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + query.length + 40);
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';

    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, 'gi');
    snippet = snippet.replace(regex, match => `<mark>${match}</mark>`);

    return snippet;
}

function displaySearchResults(results, query) {
    if (!content) return;
    if (results.length === 0) {
        content.innerHTML = `<p>No results found for "<strong>${query}</strong>".</p>`;
        return;
    }

    let html = `<h2>Search Results for "${query}"</h2>`;
    html += `<p>Found in ${results.length} document${results.length > 1 ? 's' : ''} (sorted by relevance):</p>`;
    html += `<div class="search-results">`;

    results.forEach(result => {
        html += `<div class="search-result-item" data-path="${result.path}">`;
        html += `<h3>${result.title} <span class="match-count">(${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''})</span></h3>`;
        result.matches.forEach(match => {
            if (match.location) {
                html += `<p><strong>${match.location}</strong></p>`;
            }
            html += `<p class="snippet">${match.snippet}</p>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    content.innerHTML = html;

    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            const docInfo = documentsIndex.find(d => d.path === path);
            if (docInfo) {
                loadDocument(path, docInfo.title);
            }
        });
    });
}

// ================================
// Local Search (within current document)
// ================================
// ================================
// Local Search (within current document) with match navigation
// ================================
let currentMatches = [];        // stores { elementId, text } for each match
let currentMatchIndex = -1;     // index of currently highlighted match

function clearHighlights() {
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.classList.remove('search-highlight');
    });
}

function highlightMatch(index) {
    clearHighlights();
    if (index >= 0 && index < currentMatches.length) {
        const match = currentMatches[index];
        const target = document.getElementById(match.elementId);
        if (target) {
            target.classList.add('search-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        currentMatchIndex = index;
        updateMatchCounter();
    }
}

function updateMatchCounter() {
    const counterEl = document.getElementById('matchCounter');
    if (counterEl) {
        if (currentMatches.length > 0) {
            counterEl.textContent = `${currentMatchIndex + 1} of ${currentMatches.length}`;
        } else {
            counterEl.textContent = '';
        }
    }
}

function performLocalSearch(query) {
    if (!currentDoc) {
        performSearch(query);
        return;
    }

    const doc = currentDoc;
    const queryLower = query.toLowerCase();
    const matches = []; // will hold { elementId, location, snippet }

    // Search in preamble
    if (doc.content && doc.content.preamble) {
        if (doc.content.preamble.toLowerCase().includes(queryLower)) {
            matches.push({
                type: 'preamble',
                location: 'Preamble',
                elementId: 'preamble',
                snippet: extractSnippet(doc.content.preamble, query)
            });
        }
    }

    // Search in articles (new structure)
    if (doc.content && doc.content.articles) {
        doc.content.articles.forEach(article => {
            if (article.text && article.text.toLowerCase().includes(queryLower)) {
                matches.push({
                    type: 'article',
                    location: `Article ${article.number}`,
                    elementId: `article-${article.number}`,
                    snippet: extractSnippet(article.text, query)
                });
            }
        });
    }

    // Search in old chapters structure
    if (doc.chapters) {
        doc.chapters.forEach((chapter, cIdx) => {
            if (chapter.articles) {
                chapter.articles.forEach((article, aIdx) => {
                    if (article.text && article.text.toLowerCase().includes(queryLower)) {
                        matches.push({
                            type: 'article',
                            location: article.article || `Chapter ${cIdx+1} Article`,
                            elementId: `chapter-${cIdx}-article-${aIdx}`,
                            snippet: extractSnippet(article.text, query)
                        });
                    }
                });
            }
        });
    }

    // Store matches globally for navigation
    currentMatches = matches;

    if (matches.length === 0) {
        content.innerHTML = `
            <p>No matches found for "<strong>${query}</strong>" in this document.</p>
            <p><button id="backToDocBtn" class="back-btn">← Back to document</button></p>
        `;
        document.getElementById('backToDocBtn')?.addEventListener('click', showFullDocument);
        return;
    }

    // Display results list plus navigation controls
    let html = `<h2>Search Results in "${doc.title || 'this document'}" for "${query}"</h2>`;
    html += `<div class="search-controls">`;
    html += `<button id="prevMatchBtn" class="nav-btn" ${matches.length === 1 ? 'disabled' : ''}>← Previous</button>`;
    html += `<span id="matchCounter">1 of ${matches.length}</span>`;
    html += `<button id="nextMatchBtn" class="nav-btn" ${matches.length === 1 ? 'disabled' : ''}>Next →</button>`;
    html += `<button id="backToDocBtn" class="back-btn">Back to document</button>`;
    html += `</div>`;
    html += `<div class="search-results">`;
    matches.forEach((match, idx) => {
        html += `<div class="search-result-item" data-target="${match.elementId}" data-index="${idx}">`;
        html += `<h3>${match.location}</h3>`;
        html += `<p class="snippet">${match.snippet}</p>`;
        html += `</div>`;
    });
    html += `</div>`;

    content.innerHTML = html;

    // Highlight the first match
    currentMatchIndex = 0;
    setTimeout(() => {
        highlightMatch(0);
    }, 100); // slight delay to ensure DOM is ready

    // Attach event listeners
    document.querySelectorAll('.search-result-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            const idx = parseInt(item.dataset.index, 10);
            highlightMatch(idx);
        });
    });

    document.getElementById('backToDocBtn')?.addEventListener('click', showFullDocument);

    const prevBtn = document.getElementById('prevMatchBtn');
    const nextBtn = document.getElementById('nextMatchBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentMatches.length > 0) {
                let newIndex = currentMatchIndex - 1;
                if (newIndex < 0) newIndex = currentMatches.length - 1; // wrap around
                highlightMatch(newIndex);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentMatches.length > 0) {
                let newIndex = currentMatchIndex + 1;
                if (newIndex >= currentMatches.length) newIndex = 0; // wrap around
                highlightMatch(newIndex);
            }
        });
    }
}
// ================================
// Service Worker Registration
// ================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// Start the app
init();

}); // End of DOMContentLoaded