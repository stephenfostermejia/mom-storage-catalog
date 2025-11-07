// Household Archive Catalog - Main Application
// Version: 1.0.0

class CatalogApp {
    constructor() {
        this.items = [];
        this.filteredItems = [];
        this.allBoxes = new Set();
        this.allCategories = new Set();
        this.allPeople = new Set();
        this.editMode = false;
        this.localEdits = this.loadLocalEdits();
        this.catalogVersion = '';
        this.lastUpdated = '';

        this.init();
    }

    async init() {
        await this.loadCatalogData();
        this.setupEventListeners();
        this.updateFilters();
        this.renderItems();
        this.updateStats();
        this.applyURLParams();
    }

    async loadCatalogData() {
        try {
            // Load base catalog
            const baseResponse = await fetch('data/items.base.json');
            const baseData = await baseResponse.json();

            this.items = baseData.items || [];
            this.catalogVersion = baseData.catalog_version || '1.0.0';

            // Load updates index
            try {
                const updatesIndexResponse = await fetch('data/updates_index.json');
                const updatesIndex = await updatesIndexResponse.json();

                // Load and merge each delta file
                for (const deltaFile of updatesIndex.deltas || []) {
                    try {
                        const deltaResponse = await fetch(`data/updates/${deltaFile}`);
                        const delta = await deltaResponse.json();
                        this.mergeDelta(delta);
                    } catch (err) {
                        console.warn(`Could not load delta: ${deltaFile}`, err);
                    }
                }

                this.lastUpdated = updatesIndex.last_updated || 'N/A';
            } catch (err) {
                console.warn('No updates index found, using base data only');
                this.lastUpdated = baseData.catalog_version || 'N/A';
            }

            // Apply local edits
            this.applyLocalEdits();

            // Extract unique values for filters
            this.items.forEach(item => {
                this.allBoxes.add(item.box_id);
                this.allCategories.add(item.category);
                if (item.people) {
                    item.people.forEach(person => this.allPeople.add(person));
                }
            });

        } catch (error) {
            console.error('Error loading catalog data:', error);
            this.showError('Failed to load catalog data. Please check that data files exist.');
        }
    }

    mergeDelta(delta) {
        // Add new items
        if (delta.added) {
            this.items.push(...delta.added);
        }

        // Update existing items
        if (delta.updated) {
            delta.updated.forEach(update => {
                const itemIndex = this.items.findIndex(item => item.id === update.id);
                if (itemIndex !== -1) {
                    // Merge the updates
                    Object.assign(this.items[itemIndex], update.set || {});

                    // Append box history if provided
                    if (update.box_history_append) {
                        this.items[itemIndex].box_history = this.items[itemIndex].box_history || [];
                        this.items[itemIndex].box_history.push(...update.box_history_append);
                    }
                }
            });
        }

        // Remove items
        if (delta.removed) {
            delta.removed.forEach(itemId => {
                const itemIndex = this.items.findIndex(item => item.id === itemId);
                if (itemIndex !== -1) {
                    this.items.splice(itemIndex, 1);
                }
            });
        }
    }

    loadLocalEdits() {
        try {
            const edits = localStorage.getItem('catalog_edits');
            return edits ? JSON.parse(edits) : { edited: [] };
        } catch (err) {
            console.error('Error loading local edits:', err);
            return { edited: [] };
        }
    }

    saveLocalEdits() {
        try {
            localStorage.setItem('catalog_edits', JSON.stringify(this.localEdits));
        } catch (err) {
            console.error('Error saving local edits:', err);
        }
    }

    applyLocalEdits() {
        this.localEdits.edited.forEach(edit => {
            const item = this.items.find(i => i.id === edit.id);
            if (item) {
                Object.assign(item, edit.set);
                item._edited = true; // Mark as edited
            }
        });
    }

    addLocalEdit(itemId, field, value) {
        let editEntry = this.localEdits.edited.find(e => e.id === itemId);

        if (!editEntry) {
            editEntry = { id: itemId, set: {} };
            this.localEdits.edited.push(editEntry);
        }

        editEntry.set[field] = value;
        this.localEdits.timestamp = new Date().toISOString();

        this.saveLocalEdits();

        // Update item in memory
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            item[field] = value;
            item._edited = true;
        }
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterItems();
        });

        document.getElementById('clearSearch').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.filterItems();
        });

        // Filters
        document.getElementById('boxFilter').addEventListener('change', () => this.filterItems());
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterItems());
        document.getElementById('peopleFilter').addEventListener('change', () => this.filterItems());
        document.getElementById('sortBy').addEventListener('change', () => this.filterItems());

        // Edit mode
        document.getElementById('toggleEditMode').addEventListener('click', () => {
            this.editMode = !this.editMode;
            this.toggleEditMode();
        });

        // Export edits
        document.getElementById('exportEdits').addEventListener('click', () => {
            this.exportEdits();
        });

        // Close modal on outside click
        document.getElementById('itemModal').addEventListener('click', (e) => {
            if (e.target.id === 'itemModal') {
                this.closeModal();
            }
        });

        // Modal close button
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
    }

    updateFilters() {
        // Populate box filter
        const boxFilter = document.getElementById('boxFilter');
        Array.from(this.allBoxes).sort().forEach(box => {
            const option = document.createElement('option');
            option.value = box;
            option.textContent = box;
            boxFilter.appendChild(option);
        });

        // Populate category filter
        const categoryFilter = document.getElementById('categoryFilter');
        Array.from(this.allCategories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // Populate people filter
        const peopleFilter = document.getElementById('peopleFilter');
        Array.from(this.allPeople).sort().forEach(person => {
            const option = document.createElement('option');
            option.value = person;
            option.textContent = person;
            peopleFilter.appendChild(option);
        });
    }

    filterItems() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const boxFilter = document.getElementById('boxFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const peopleFilter = document.getElementById('peopleFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        // Filter items
        this.filteredItems = this.items.filter(item => {
            // Search filter
            if (searchTerm) {
                const searchableText = [
                    item.item_name,
                    item.description,
                    item.notes,
                    item.category,
                    item.box_id,
                    item.box_friendly,
                    ...(item.captions || []),
                    ...(item.people || []),
                    ...(item.tags || []),
                    item.pub?.publication_name,
                    ...(item.pub?.names_mentioned || [])
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Box filter
            if (boxFilter && item.box_id !== boxFilter) {
                return false;
            }

            // Category filter
            if (categoryFilter && item.category !== categoryFilter) {
                return false;
            }

            // People filter
            if (peopleFilter && (!item.people || !item.people.includes(peopleFilter))) {
                return false;
            }

            return true;
        });

        // Sort items
        this.sortItems(sortBy);

        // Update URL params
        this.updateURLParams({ searchTerm, boxFilter, categoryFilter, peopleFilter, sortBy });

        this.renderItems();
        this.updateStats();
    }

    sortItems(sortBy) {
        switch (sortBy) {
            case 'date-desc':
                this.filteredItems.sort((a, b) => (b.date_found || '').localeCompare(a.date_found || ''));
                break;
            case 'date-asc':
                this.filteredItems.sort((a, b) => (a.date_found || '').localeCompare(b.date_found || ''));
                break;
            case 'name-asc':
                this.filteredItems.sort((a, b) => a.item_name.localeCompare(b.item_name));
                break;
            case 'name-desc':
                this.filteredItems.sort((a, b) => b.item_name.localeCompare(a.item_name));
                break;
            case 'box-asc':
                this.filteredItems.sort((a, b) => a.box_id.localeCompare(b.box_id));
                break;
        }
    }

    renderItems() {
        const grid = document.getElementById('catalogGrid');
        const noResults = document.getElementById('noResults');

        if (this.filteredItems.length === 0) {
            grid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        noResults.style.display = 'none';
        grid.innerHTML = '';

        this.filteredItems.forEach(item => {
            const card = this.createItemCard(item);
            grid.appendChild(card);
        });
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        if (this.editMode) card.classList.add('edit-mode');
        if (item._edited) card.classList.add('edited');

        const imageUrl = item.image_files && item.image_files[0]
            ? `img/${item.image_files[0].thumb}`
            : 'img/placeholder.jpg';

        const people = item.people ? item.people.map(p =>
            `<span class="tag people-tag">${this.escapeHtml(p)}</span>`
        ).join('') : '';

        const tags = item.tags ? item.tags.map(t =>
            `<span class="tag">${this.escapeHtml(t)}</span>`
        ).join('') : '';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${this.escapeHtml(item.item_name)}" class="item-image" loading="lazy"
                 onerror="this.src='img/placeholder.jpg'">
            <div class="item-content">
                <div class="item-header">
                    <div>
                        <div class="item-name">${this.escapeHtml(item.item_name)}</div>
                        <div class="item-category">${this.escapeHtml(item.category)}</div>
                    </div>
                    <div class="box-badge">${this.escapeHtml(item.box_id)}</div>
                </div>
                <div class="item-description">${this.escapeHtml(item.description || '')}</div>
                <div class="item-meta">
                    ${people}
                    ${tags}
                </div>
            </div>
        `;

        card.addEventListener('click', () => this.showItemDetails(item));

        return card;
    }

    showItemDetails(item) {
        const modal = document.getElementById('itemModal');
        const modalBody = document.getElementById('modalBody');

        const images = item.image_files ? item.image_files.map(img =>
            `<img src="img/${img.full}" alt="${this.escapeHtml(item.item_name)}" class="modal-image"
                 onerror="this.src='img/placeholder.jpg'">`
        ).join('') : '';

        const people = item.people ? item.people.join(', ') : 'None';
        const tags = item.tags ? item.tags.join(', ') : 'None';

        const boxHistory = item.box_history ? item.box_history.map(h => `
            <div class="history-entry">
                <strong>${this.escapeHtml(h.box_id)}</strong><br>
                From: ${h.from || 'N/A'} → To: ${h.to || 'Present'}
            </div>
        `).join('') : '<p>No history available</p>';

        const pubSection = item.pub ? `
            <div class="detail-section">
                <div class="detail-label">Publication</div>
                <div class="detail-value">
                    <strong>${this.escapeHtml(item.pub.publication_name || 'N/A')}</strong><br>
                    Issue: ${this.escapeHtml(item.pub.date_of_issue || 'N/A')},
                    Page: ${this.escapeHtml(item.pub.page_number || 'N/A')}<br>
                    Names: ${this.escapeHtml((item.pub.names_mentioned || []).join(', ') || 'None')}
                </div>
            </div>
        ` : '';

        modalBody.innerHTML = `
            ${images}

            <div class="detail-section">
                <div class="detail-label">Item Name</div>
                <div class="detail-value editable-field" data-field="item_name" data-id="${item.id}">
                    ${this.escapeHtml(item.item_name)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Box Location</div>
                <div class="detail-value editable-field" data-field="box_id" data-id="${item.id}">
                    <strong>${this.escapeHtml(item.box_id)}</strong> - ${this.escapeHtml(item.box_friendly || '')}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Category</div>
                <div class="detail-value editable-field" data-field="category" data-id="${item.id}">
                    ${this.escapeHtml(item.category)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Description</div>
                <div class="detail-value editable-field" data-field="description" data-id="${item.id}">
                    ${this.escapeHtml(item.description || '')}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Notes</div>
                <div class="detail-value editable-field" data-field="notes" data-id="${item.id}">
                    ${this.escapeHtml(item.notes || '')}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">People</div>
                <div class="detail-value editable-field" data-field="people" data-id="${item.id}">
                    ${this.escapeHtml(people)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Tags</div>
                <div class="detail-value">${this.escapeHtml(tags)}</div>
            </div>

            ${pubSection}

            <div class="detail-section">
                <div class="detail-label">Box History</div>
                <div class="box-history">
                    ${boxHistory}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Quantity</div>
                <div class="detail-value">${item.quantity || 1}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Date Found</div>
                <div class="detail-value">${this.escapeHtml(item.date_found || 'N/A')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Item ID</div>
                <div class="detail-value"><code>${this.escapeHtml(item.id)}</code></div>
            </div>
        `;

        // Setup edit functionality if in edit mode
        if (this.editMode) {
            this.setupInlineEditing(modalBody);
        }

        modal.style.display = 'flex';
    }

    setupInlineEditing(container) {
        const editableFields = container.querySelectorAll('.editable-field');

        editableFields.forEach(field => {
            field.style.cursor = 'pointer';
            field.title = 'Click to edit';

            field.addEventListener('click', (e) => {
                if (field.querySelector('input, textarea')) return; // Already editing

                const fieldName = field.dataset.field;
                const itemId = field.dataset.id;
                const currentValue = field.textContent.trim();

                const isMultiline = fieldName === 'description' || fieldName === 'notes';
                const input = document.createElement(isMultiline ? 'textarea' : 'input');
                input.className = isMultiline ? 'edit-textarea' : 'edit-input';
                input.value = currentValue;

                field.innerHTML = '';
                field.appendChild(input);
                field.classList.add('editing');
                input.focus();

                const saveEdit = () => {
                    const newValue = input.value.trim();
                    if (newValue && newValue !== currentValue) {
                        this.addLocalEdit(itemId, fieldName, newValue);
                        field.textContent = newValue;
                        this.updateStats();
                    } else {
                        field.textContent = currentValue;
                    }
                    field.classList.remove('editing');
                };

                input.addEventListener('blur', saveEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !isMultiline) {
                        e.preventDefault();
                        input.blur();
                    } else if (e.key === 'Escape') {
                        field.textContent = currentValue;
                        field.classList.remove('editing');
                    }
                });
            });
        });
    }

    closeModal() {
        document.getElementById('itemModal').style.display = 'none';
    }

    toggleEditMode() {
        const btn = document.getElementById('toggleEditMode');
        const exportBtn = document.getElementById('exportEdits');

        if (this.editMode) {
            btn.innerHTML = '<span id="editModeIcon">✏️</span> Disable Edit Mode';
            btn.style.background = '#f7b924';
            exportBtn.style.display = 'inline-block';
        } else {
            btn.innerHTML = '<span id="editModeIcon">✏️</span> Enable Edit Mode';
            btn.style.background = '';
            exportBtn.style.display = 'none';
        }

        this.updateStats();
        this.renderItems();
    }

    exportEdits() {
        const exportData = {
            ...this.localEdits,
            catalog_version: this.catalogVersion,
            export_date: new Date().toISOString(),
            editor: 'Mom'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mom_edits_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert(`Exported ${this.localEdits.edited.length} edit(s)!`);
    }

    updateStats() {
        const totalItems = this.items.length;
        const filteredCount = this.filteredItems.length;
        const editedCount = this.localEdits.edited.length;

        const itemCountEl = document.getElementById('itemCount');
        itemCountEl.textContent = filteredCount === totalItems
            ? `Showing all ${totalItems} items`
            : `Showing ${filteredCount} of ${totalItems} items`;

        const editStatusEl = document.getElementById('editStatus');
        if (this.editMode && editedCount > 0) {
            editStatusEl.textContent = `${editedCount} edit(s) pending export`;
        } else {
            editStatusEl.textContent = '';
        }

        document.getElementById('catalogVersion').textContent = this.catalogVersion;
        document.getElementById('lastUpdated').textContent = this.lastUpdated;
    }

    updateURLParams(params) {
        const url = new URL(window.location);

        Object.keys(params).forEach(key => {
            if (params[key]) {
                url.searchParams.set(key, params[key]);
            } else {
                url.searchParams.delete(key);
            }
        });

        window.history.replaceState({}, '', url);
    }

    applyURLParams() {
        const url = new URL(window.location);

        const searchTerm = url.searchParams.get('searchTerm');
        const boxFilter = url.searchParams.get('boxFilter');
        const categoryFilter = url.searchParams.get('categoryFilter');
        const peopleFilter = url.searchParams.get('peopleFilter');
        const sortBy = url.searchParams.get('sortBy');

        if (searchTerm) document.getElementById('searchInput').value = searchTerm;
        if (boxFilter) document.getElementById('boxFilter').value = boxFilter;
        if (categoryFilter) document.getElementById('categoryFilter').value = categoryFilter;
        if (peopleFilter) document.getElementById('peopleFilter').value = peopleFilter;
        if (sortBy) document.getElementById('sortBy').value = sortBy;

        if (searchTerm || boxFilter || categoryFilter || peopleFilter) {
            this.filterItems();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const grid = document.getElementById('catalogGrid');
        grid.innerHTML = `<div class="no-results"><p>${message}</p></div>`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CatalogApp();
});
