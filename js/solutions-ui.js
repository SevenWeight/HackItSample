/* ============================================
   SOLUTION SUPPLIERS - UI Logic (Redesigned)
   Sidebar filters, factsheet cards, sorting
   ============================================ */

// === State ===
var filteredSolutions = [];
var activeSolutionFilters = {
    outcome: [],
    challenge: [],
    connection: [],
    country: [],
    search: ''
};
var solutionsInitialized = false;
var currentSort = 'id';

// Challenge code labels
var challengeLabels = {
    'WFC': 'Workforce Challenges',
    'AI': 'Accessibility & Infrastructure',
    'DC': 'Demographic Challenges',
    'DI': 'Digitalization & Innovation',
    'EFS': 'Economic & Financial Sustainability',
    'PP': 'Prevention & Promotion',
    'SD': 'Standardization & Quality',
    'APC': 'Administrative & Promotive Challenges'
};

// === Bootstrap ===
// The database is the only content of the site: build it on page load.

document.addEventListener('DOMContentLoaded', function () {
    initSolutionsDB();
});

// === Initialization ===

function initSolutionsDB() {
    if (solutionsInitialized) return;
    solutionsInitialized = true;

    filteredSolutions = solutionsData.slice();

    // Populate country filter from data
    buildCountryFilter();

    // Compute initial filter counts
    updateFilterCounts();

    renderSolutionCards();

    // Search with debounce
    var searchInput = document.getElementById('solutions-search');
    if (searchInput) {
        var debounceTimeout;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(function() {
                activeSolutionFilters.search = e.target.value.toLowerCase();
                applyAndRender();
            }, 300);
        });
    }

    // Modal close
    window.addEventListener('click', function(e) {
        var modal = document.getElementById('solutions-modal');
        if (e.target === modal) {
            closeSolutionModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSolutionModal();
        }
    });
}

// Build country filter items dynamically
function buildCountryFilter() {
    var countryCounts = {};
    solutionsData.forEach(function(s) {
        var c = s.providerCountry || s.receiverCountry || '';
        if (c && c !== 'N/A') {
            // Handle multi-country entries — take first country
            var primary = c.split(',')[0].trim();
            countryCounts[primary] = (countryCounts[primary] || 0) + 1;
        }
    });

    // Sort by count descending
    var countries = Object.keys(countryCounts).sort(function(a, b) {
        return countryCounts[b] - countryCounts[a];
    });

    var container = document.getElementById('filter-panel-country-body');
    if (!container) return;

    // Keep the description that's already there
    var desc = container.querySelector('.solutions-filter-panel-desc');
    container.innerHTML = '';
    if (desc) container.appendChild(desc);

    countries.forEach(function(country) {
        var item = document.createElement('div');
        item.className = 'solutions-filter-item';
        item.setAttribute('data-filter', 'country');
        item.setAttribute('data-value', country);
        item.onclick = function() { toggleSolutionFilter('country', country, this); };
        item.innerHTML =
            '<div class="solutions-filter-item-left">' +
                '<span class="solutions-filter-item-name">' + escapeHtml(country) + '</span>' +
            '</div>' +
            '<span class="solutions-filter-item-count" id="count-country-' + escapeHtml(country).replace(/\s/g, '_') + '">' + countryCounts[country] + '</span>';
        container.appendChild(item);
    });
}

// === Filter Logic ===

function toggleFilterPanel(panelId) {
    var panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.toggle('collapsed');
    }
}

function toggleSolutionFilter(filterType, value, element) {
    var arr = activeSolutionFilters[filterType];
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
        element.classList.remove('active');
    } else {
        arr.push(value);
        element.classList.add('active');
    }
    applyAndRender();
}

function clearAllSolutionFilters() {
    activeSolutionFilters.outcome = [];
    activeSolutionFilters.challenge = [];
    activeSolutionFilters.connection = [];
    activeSolutionFilters.country = [];
    activeSolutionFilters.search = '';

    // Remove active class from all filter items
    var items = document.querySelectorAll('.solutions-filter-item');
    items.forEach(function(item) {
        item.classList.remove('active');
    });

    // Clear search
    var searchInput = document.getElementById('solutions-search');
    if (searchInput) searchInput.value = '';

    applyAndRender();
}

function removeFilter(filterType, value) {
    var arr = activeSolutionFilters[filterType];
    var index = arr.indexOf(value);
    if (index > -1) arr.splice(index, 1);

    // Remove active class from the corresponding sidebar item
    var items = document.querySelectorAll('.solutions-filter-item[data-filter="' + filterType + '"][data-value="' + value + '"]');
    items.forEach(function(item) { item.classList.remove('active'); });

    applyAndRender();
}

function applyAndRender() {
    applySolutionFilters();
    updateFilterCounts();
    renderActiveFilterTags();
    renderSolutionCards();
}

// === Filter Application ===

function applySolutionFilters() {
    filteredSolutions = solutionsData.filter(function(solution) {
        // Search
        if (activeSolutionFilters.search) {
            var term = activeSolutionFilters.search;
            var text = (
                (solution.title || '') + ' ' +
                (solution.subtitle || '') + ' ' +
                (solution.providerOrganization || '') + ' ' +
                (solution.receiverOrganization || '') + ' ' +
                (solution.receiverDescription || '') + ' ' +
                (solution.challengeDescription || '') + ' ' +
                (solution.providerDescription || '') + ' ' +
                (solution.providerCountry || '') + ' ' +
                (solution.receiverCountry || '')
            ).toLowerCase();
            if (text.indexOf(term) === -1) return false;
        }

        // Outcome
        if (activeSolutionFilters.outcome.length > 0) {
            var hasOutcome = solution.outcomes && solution.outcomes.some(function(o) {
                return activeSolutionFilters.outcome.indexOf(o) > -1;
            });
            if (!hasOutcome) return false;
        }

        // Challenge
        if (activeSolutionFilters.challenge.length > 0) {
            var hasChallenge = solution.challenges && solution.challenges.some(function(c) {
                return activeSolutionFilters.challenge.indexOf(c) > -1;
            });
            if (!hasChallenge) return false;
        }

        // Connection
        if (activeSolutionFilters.connection.length > 0) {
            var conn = (solution.connection || '').toLowerCase();
            var matchConn = activeSolutionFilters.connection.some(function(c) {
                return conn.indexOf(c) > -1;
            });
            if (!matchConn) return false;
        }

        // Country
        if (activeSolutionFilters.country.length > 0) {
            var solCountry = (solution.providerCountry || solution.receiverCountry || '');
            var matchCountry = activeSolutionFilters.country.some(function(c) {
                return solCountry.indexOf(c) > -1;
            });
            if (!matchCountry) return false;
        }

        return true;
    });

    // Apply sort
    sortFiltered();
}

function sortSolutions(sortBy) {
    currentSort = sortBy;
    sortFiltered();
    renderSolutionCards();
}

function sortFiltered() {
    if (currentSort === 'title') {
        filteredSolutions.sort(function(a, b) {
            return (a.title || '').localeCompare(b.title || '');
        });
    } else if (currentSort === 'country') {
        filteredSolutions.sort(function(a, b) {
            var ca = a.providerCountry || a.receiverCountry || '';
            var cb = b.providerCountry || b.receiverCountry || '';
            return ca.localeCompare(cb);
        });
    }
    // 'id' = default order, already in data order
}

// === Filter Counts ===

function updateFilterCounts() {
    // Count how many currently filtered solutions have each outcome/challenge/etc.
    var counts = {
        outcome: {},
        challenge: {},
        connection: { local: 0, expansion: 0 },
        country: {}
    };

    solutionsData.forEach(function(s) {
        // We count against ALL data (not filtered) so users see total available
        if (s.outcomes) s.outcomes.forEach(function(o) {
            counts.outcome[o] = (counts.outcome[o] || 0) + 1;
        });
        if (s.challenges) s.challenges.forEach(function(c) {
            counts.challenge[c] = (counts.challenge[c] || 0) + 1;
        });
        var conn = (s.connection || '').toLowerCase();
        if (conn.indexOf('local') > -1) counts.connection.local++;
        else counts.connection.expansion++;

        var country = (s.providerCountry || s.receiverCountry || '').split(',')[0].trim();
        if (country) counts.country[country] = (counts.country[country] || 0) + 1;
    });

    // Update DOM count badges
    ['CAREavan', 'STEMlab', 'PolicyParley'].forEach(function(o) {
        var el = document.getElementById('count-outcome-' + o);
        if (el) el.textContent = counts.outcome[o] || 0;
    });

    ['WFC', 'AI', 'DC', 'DI', 'EFS', 'PP', 'SD', 'APC'].forEach(function(c) {
        var el = document.getElementById('count-challenge-' + c);
        if (el) el.textContent = counts.challenge[c] || 0;
    });

    var localEl = document.getElementById('count-connection-local');
    if (localEl) localEl.textContent = counts.connection.local;
    var expEl = document.getElementById('count-connection-expansion');
    if (expEl) expEl.textContent = counts.connection.expansion;

    // Country counts
    Object.keys(counts.country).forEach(function(c) {
        var el = document.getElementById('count-country-' + c.replace(/\s/g, '_'));
        if (el) el.textContent = counts.country[c];
    });
}

// === Active Filter Tags ===

function renderActiveFilterTags() {
    var container = document.getElementById('solutions-active-filters');
    if (!container) return;

    var html = '';
    var types = ['outcome', 'challenge', 'connection', 'country'];
    types.forEach(function(type) {
        activeSolutionFilters[type].forEach(function(val) {
            html += '<span class="solutions-active-tag">' +
                escapeHtml(val) +
                ' <span class="solutions-active-tag-remove" onclick="removeFilter(\'' + type + '\',\'' + escapeHtml(val) + '\')">&times;</span>' +
            '</span>';
        });
    });

    container.innerHTML = html;
}

// === Card Rendering ===

function renderSolutionCards() {
    var container = document.getElementById('solutions-cards-grid');
    var noResults = document.getElementById('solutions-no-results');
    var activeCountEl = document.getElementById('solutions-active-count');
    var resultsCountEl = document.getElementById('solutions-results-count');

    if (!container) return;

    var total = solutionsData.length;
    var count = filteredSolutions.length;

    if (activeCountEl) activeCountEl.textContent = count;
    if (resultsCountEl) resultsCountEl.innerHTML = 'Showing <strong>' + count + '</strong> of ' + total + ' solution suppliers';

    if (count === 0) {
        container.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        return;
    }

    if (noResults) noResults.style.display = 'none';

    var fragment = document.createDocumentFragment();
    filteredSolutions.forEach(function(solution) {
        fragment.appendChild(createSolutionCard(solution));
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function createSolutionCard(solution) {
    var card = document.createElement('div');
    card.className = 'solutions-card';

    // Connection badge
    var connectionClass = (solution.connection || '').toLowerCase().indexOf('local') > -1 ? 'local' : 'expansion';
    var connectionText = connectionClass === 'local' ? 'Local' : 'Expansion';

    // Outcome tags
    var outcomeTags = '';
    if (solution.outcomes && solution.outcomes.length) {
        outcomeTags = solution.outcomes.map(function(o) {
            return '<span class="solutions-tag outcome-' + o.toLowerCase() + '">' + o + '</span>';
        }).join('');
    }

    // Challenge tags (max 3 on card, show overflow)
    var challengeTags = '';
    if (solution.challenges && solution.challenges.length) {
        challengeTags = solution.challenges.slice(0, 3).map(function(c) {
            return '<span class="solutions-tag challenge">' + c + '</span>';
        }).join('');
        if (solution.challenges.length > 3) {
            challengeTags += '<span class="solutions-tag challenge">+' + (solution.challenges.length - 3) + '</span>';
        }
    }

    // Organization & country
    var orgName = solution.providerOrganization || solution.receiverOrganization || 'N/A';
    var country = solution.providerCountry || solution.receiverCountry || 'N/A';

    // Duration
    var duration = solution.duration || '';

    // Scope
    var scope = solution.scope || '';

    // Description excerpt — use first paragraph (before first |), truncate at 180 chars
    var description = solution.receiverDescription || solution.challengeDescription || '';
    // Take only the first paragraph (before first pipe separator)
    var pipeIndex = description.indexOf('|');
    if (pipeIndex > -1) {
        description = description.substring(0, pipeIndex).trim();
    }
    if (description.length > 180) {
        description = description.substring(0, 180) + '...';
    }

    // Website field
    var hasWebsite = solution.webpage && solution.webpage !== '' && solution.webpage !== 'N/A';

    card.innerHTML =
        '<div class="solutions-card-header">' +
            '<h3 class="solutions-card-title">' + escapeHtml(solution.title) + '</h3>' +
            '<span class="solutions-connection-badge ' + connectionClass + '">' + connectionText + '</span>' +
        '</div>' +
        '<div class="solutions-card-body">' +
            '<div class="solutions-card-row">' +
                '<div class="solutions-card-field">' +
                    '<span class="solutions-card-label">Organization</span>' +
                    '<span class="solutions-card-value">' + escapeHtml(orgName) + '</span>' +
                '</div>' +
                '<div class="solutions-card-field">' +
                    '<span class="solutions-card-label">Country</span>' +
                    '<span class="solutions-card-value">' + escapeHtml(country) + '</span>' +
                '</div>' +
            '</div>' +
            (duration || scope ?
            '<div class="solutions-card-row">' +
                (duration ? '<div class="solutions-card-field"><span class="solutions-card-label">Duration</span><span class="solutions-card-value">' + escapeHtml(duration) + '</span></div>' : '') +
                (scope ? '<div class="solutions-card-field"><span class="solutions-card-label">Scope</span><span class="solutions-card-value">' + escapeHtml(scope) + '</span></div>' : '') +
            '</div>' : '') +
            (hasWebsite ?
            '<div class="solutions-card-row">' +
                '<div class="solutions-card-field full">' +
                    '<span class="solutions-card-label">Website</span>' +
                    '<span class="solutions-card-value"><a href="' + escapeHtml(solution.webpage) + '" target="_blank" rel="noopener">' + escapeHtml(solution.webpage) + '</a></span>' +
                '</div>' +
            '</div>' : '') +
            (description ?
            '<div class="solutions-card-row">' +
                '<div class="solutions-card-field full">' +
                    '<span class="solutions-card-label">Description</span>' +
                    '<span class="solutions-card-value">' + escapeHtml(description) + '</span>' +
                '</div>' +
            '</div>' : '') +
            '<div class="solutions-card-tags">' + outcomeTags + challengeTags + '</div>' +
        '</div>' +
        '<div class="solutions-card-actions">' +
            '<button class="solutions-btn-primary" onclick="openSolutionModal(' + solution.id + ')">Full Details</button>' +
            (hasWebsite ? '<a href="' + escapeHtml(solution.webpage) + '" target="_blank" rel="noopener" class="solutions-btn-secondary">Visit Site</a>' : '') +
        '</div>';

    return card;
}

// === Modal ===

function openSolutionModal(id) {
    var solution = solutionsData.find(function(s) { return s.id === id; });
    if (!solution) return;

    var modal = document.getElementById('solutions-modal');
    var modalBody = document.getElementById('solutions-modal-body');
    if (!modal || !modalBody) return;

    // Outcome tags
    var outcomeTags = '';
    if (solution.outcomes && solution.outcomes.length) {
        outcomeTags = solution.outcomes.map(function(o) {
            return '<span class="solutions-tag outcome-' + o.toLowerCase() + '">' + o + '</span>';
        }).join(' ');
    }

    // Challenge tags with full labels
    var challengeTags = '';
    if (solution.challenges && solution.challenges.length) {
        challengeTags = solution.challenges.map(function(c) {
            var label = challengeLabels[c] || c;
            return '<span class="solutions-tag challenge">' + c + ' — ' + label + '</span>';
        }).join(' ');
    }

    // Relevancy list
    var relevancyHtml = '';
    if (solution.relevancy && solution.relevancy.length) {
        relevancyHtml = '<ul style="margin:0;padding-left:1.2rem;list-style:disc;">' +
            solution.relevancy.map(function(r) { return '<li>' + escapeHtml(r) + '</li>'; }).join('') +
            '</ul>';
    }

    var mainResultsHtml = formatLongText(solution.mainResultsSummary);
    var chalDescHtml = formatLongText(solution.challengeDescription);
    var receiverDescHtml = formatLongText(solution.receiverDescription);
    var providerDescHtml = formatLongText(solution.providerDescription);
    var receiverOrgHtml = formatLongText(solution.receiverOrganization);

    modalBody.innerHTML =
        '<div class="solutions-modal-header">' +
            '<button class="solutions-modal-close" onclick="closeSolutionModal()" aria-label="Close">&times;</button>' +
            '<h2 class="solutions-modal-title">' + escapeHtml(solution.title) + '</h2>' +
            (solution.subtitle ? '<p class="solutions-modal-subtitle">' + escapeHtml(solution.subtitle) + '</p>' : '') +
        '</div>' +
        '<div class="solutions-modal-body-inner">' +

            // General Information
            '<div class="solutions-detail-section">' +
                '<h3 class="solutions-detail-section-title">General Information</h3>' +
                '<div class="solutions-detail-grid">' +
                    detailItem('Associated PP', solution.associatedPP) +
                    detailItem('Duration', solution.duration) +
                    detailItem('Connection', (solution.connection || '').toLowerCase().indexOf('local') > -1 ? 'Local Zone' : 'Expansion Zone') +
                    detailItem('Scope', solution.scope) +
                    detailItem('Language', solution.language) +
                    detailItem('Funding Type', solution.fundingType) +
                    detailItem('Funding Name', solution.fundingName, true) +
                    (solution.webpage ? detailItem('Website', '<a href="' + escapeHtml(solution.webpage) + '" target="_blank" rel="noopener" style="color:#538257;word-break:break-all;">' + escapeHtml(solution.webpage) + '</a>', true, true) : '') +
                '</div>' +
                '<div style="margin-top:14px; display:flex; flex-wrap:wrap; gap:6px;">' + outcomeTags + ' ' + challengeTags + '</div>' +
            '</div>' +

            // Solution Receiver
            '<div class="solutions-detail-section">' +
                '<h3 class="solutions-detail-section-title">Solution Receiver</h3>' +
                '<div class="solutions-detail-grid">' +
                    '<div class="solutions-detail-item full-width"><div class="solutions-detail-label">Organization</div><div class="solutions-detail-text">' + receiverOrgHtml + '</div></div>' +
                    detailItem('Type', solution.receiverType) +
                    detailItem('Country', solution.receiverCountry) +
                    detailItem('City', solution.receiverCity) +
                '</div>' +
                (solution.receiverDescription ?
                    '<div style="margin-top:16px;">' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Description</div>' +
                        '<div class="solutions-detail-text">' + receiverDescHtml + '</div>' +
                    '</div>' : '') +
            '</div>' +

            // Solution Provider
            '<div class="solutions-detail-section">' +
                '<h3 class="solutions-detail-section-title">Solution Provider</h3>' +
                '<div class="solutions-detail-grid">' +
                    detailItem('Organization', solution.providerOrganization) +
                    detailItem('Type', solution.providerType) +
                    detailItem('Country', solution.providerCountry) +
                    detailItem('City', solution.providerCity) +
                '</div>' +
                (solution.providerDescription ?
                    '<div style="margin-top:16px;">' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Description</div>' +
                        '<div class="solutions-detail-text">' + providerDescHtml + '</div>' +
                    '</div>' : '') +
            '</div>' +

            // H&C Challenge & Results
            '<div class="solutions-detail-section">' +
                '<h3 class="solutions-detail-section-title">H&amp;C Challenge &amp; Results</h3>' +
                (solution.challengeDescription ?
                    '<div style="margin-bottom:20px;">' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Challenge Description</div>' +
                        '<div class="solutions-detail-text">' + chalDescHtml + '</div>' +
                    '</div>' : '') +
                (solution.mainResultsSummary ?
                    '<div>' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Main Results</div>' +
                        '<div class="solutions-detail-text">' + mainResultsHtml + '</div>' +
                    '</div>' : '') +
            '</div>' +

            // Additional Information
            (solution.thirdParties || (solution.relevancy && solution.relevancy.length) || solution.connectionDetail ?
            '<div class="solutions-detail-section">' +
                '<h3 class="solutions-detail-section-title">Additional Information</h3>' +
                (solution.thirdParties ?
                    '<div style="margin-bottom:16px;">' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Third Parties</div>' +
                        '<div class="solutions-detail-text">' + formatLongText(solution.thirdParties) + '</div>' +
                    '</div>' : '') +
                (solution.connectionDetail ?
                    '<div style="margin-bottom:16px;">' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Connection Detail</div>' +
                        '<div class="solutions-detail-text">' + formatLongText(solution.connectionDetail) + '</div>' +
                    '</div>' : '') +
                (relevancyHtml ?
                    '<div>' +
                        '<div class="solutions-detail-label" style="margin-bottom:8px;">Relevancy for HACK-IT-NET</div>' +
                        '<div style="font-size:0.9rem;color:#444;line-height:1.8;">' + relevancyHtml + '</div>' +
                    '</div>' : '') +
            '</div>' : '') +

        '</div>';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSolutionModal() {
    var modal = document.getElementById('solutions-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// === Utility Functions ===

function escapeHtml(text) {
    if (!text) return '';
    var str = String(text);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function detailItem(label, value, fullWidth, isHtml) {
    if (!value) return '';
    var cls = fullWidth ? 'solutions-detail-item full-width' : 'solutions-detail-item';
    var displayValue = isHtml ? value : escapeHtml(value);
    return '<div class="' + cls + '">' +
        '<div class="solutions-detail-label">' + escapeHtml(label) + '</div>' +
        '<div class="solutions-detail-value">' + displayValue + '</div>' +
    '</div>';
}

// Format pipe-separated text into HTML paragraphs for readability
function formatLongText(text) {
    if (!text) return '';
    var escaped = escapeHtml(text);
    // Split on pipe separators (with optional surrounding whitespace)
    var parts = escaped.split(/\s*\|\s*/);
    if (parts.length <= 1) {
        return '<p>' + escaped + '</p>';
    }
    return parts.map(function(p) {
        var trimmed = p.trim();
        return trimmed ? '<p>' + trimmed + '</p>' : '';
    }).join('');
}
