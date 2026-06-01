import { createManagedRefreshableAd } from '@playanext/playa-yield-sdk';
import { t, initLanguage, setStoredLanguage, LANGUAGES, getCurrentLanguage } from './i18n';

interface Card {
  id: string;
  content: string;
  labels: string[];
  pinned: boolean;
  order: number;
  createdAt: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

let cards: Card[] = [];
let categories: Category[] = [];
let searchQuery = '';
let activeCategory = 'all';
let isManageMode = false;
let isEditMode = false;
let selectedCardIds: Set<string> = new Set();

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

function getColorByName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

async function sendMessage(action: string, data?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function loadCards(): Promise<void> {
  const response = await sendMessage('getCards');
  cards = ((response as { cards?: Card[] })?.cards || []).filter(Boolean);
  cards.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.order - b.order;
  });
  renderCards();
}

async function loadCategories(): Promise<void> {
  const response = await sendMessage('getCategories');
  categories = ((response as { categories?: Category[] })?.categories || []);
  renderCategoryTabs();
}

function renderCategoryTabs(): void {
  const container = document.getElementById('category-tabs');
  if (!container) return;

  let html = `
    <span class="category-tab ${activeCategory === 'all' ? 'active' : ''}" data-category="all">${t('categoryAll')}</span>
    <span class="category-tab ${activeCategory === 'uncategorized' ? 'active' : ''}" data-category="uncategorized">${t('categoryUncategorized')}</span>
  `;

  categories.forEach((cat) => {
    const isActive = activeCategory === cat.id;
    html += `
      <span class="category-tab ${isActive ? 'active' : ''}" data-category="${cat.id}">
        <span class="cat-dot" style="background: ${cat.color};"></span>
        ${cat.name}
        ${isManageMode && cat.id !== 'all' && cat.id !== 'uncategorized' ? `<span class="delete-cat" data-id="${cat.id}">×</span>` : ''}
      </span>
    `;
  });

  html += `
    <span class="category-tab add-btn" id="add-category-btn">+</span>
    <span class="category-tab manage-btn" id="manage-category-btn">${isManageMode ? '✓' : '⚙️'}</span>
  `;

  container.innerHTML = html;

  document.querySelectorAll('.category-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const deleteBtn = target.closest('.delete-cat') as HTMLElement | null;
      if (deleteBtn) {
        deleteCategory(deleteBtn.dataset.id || '');
        return;
      }

      if (target.id === 'add-category-btn') {
        addCategory();
        return;
      }

      if (target.id === 'manage-category-btn') {
        isManageMode = !isManageMode;
        renderCategoryTabs();
        return;
      }

      const tabEl = target.closest('.category-tab') as HTMLElement | null;
      if (!tabEl) return;
      const category = tabEl.dataset.category;
      if (category) {
        activeCategory = category;
        renderCategoryTabs();
        renderCards();
      }
    });
  });
}

function addCategory(): void {
  const name = prompt(t('promptCategoryName'));
  if (!name || name.trim().length === 0) return;
  if (name.length > 10) {
    alert(t('alertCategoryNameTooLong'));
    return;
  }

  const newCategory: Category = {
    id: Date.now().toString(),
    name: name.trim(),
    color: getColorByName(name)
  };

  categories.push(newCategory);
  sendMessage('saveCategories', { categories });
  renderCategoryTabs();
}

async function deleteCategory(id: string): Promise<void> {
  if (id === 'all' || id === 'uncategorized') {
    alert(t('alertCannotDeleteDefault'));
    return;
  }

  if (!confirm(t('confirmDeleteCategory'))) {
    return;
  }

  categories = categories.filter(c => c.id !== id);
  await sendMessage('saveCategories', { categories });

  cards.forEach(card => {
    card.labels = card.labels.filter(label => label !== id);
  });
  await sendMessage('saveCards', { cards });

  if (activeCategory === id) {
    activeCategory = 'all';
  }

  renderCategoryTabs();
  renderCards();
}

function processVariables(content: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const weekdaysShort = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekdaysFull = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekdayIndex = now.getDay();

  content = content.replace(/\{\{year\}\}/g, String(year));
  content = content.replace(/\{\{month\}\}/g, month);
  content = content.replace(/\{\{day\}\}/g, day);
  content = content.replace(/\{\{hour\}\}/g, hours);
  content = content.replace(/\{\{minute\}\}/g, minutes);
  content = content.replace(/\{\{weekday\}\}/g, weekdaysShort[weekdayIndex]);
  content = content.replace(/\{\{weekday_cn\}\}/g, weekdaysFull[weekdayIndex]);
  content = content.replace(/\{\{date\}\}/g, `${year}-${month}-${day}`);
  content = content.replace(/\{\{time\}\}/g, `${hours}:${minutes}:${seconds}`);
  content = content.replace(/\{\{random_int\}\}/g, String(generateRandomInt()));
  content = content.replace(/\{\{random_int_1_3\}\}/g, String(generateRandomInt(1, 3)));
  content = content.replace(/\{\{random_phone\}\}/g, generateRandomPhone());
  content = content.replace(/\{\{random_letters[_:](\d+)\}\}/g, (_, n) => generateRandomLetters(parseInt(n)));
  content = content.replace(/\{\{random_hex[_:](\d+)\}\}/g, (_, n) => generateRandomHex(parseInt(n)));
  content = content.replace(/\{\{random_digits[_:](\d+)\}\}/g, (_, n) => generateRandomDigits(parseInt(n)));
  content = content.replace(/\{\{uuid\}\}/g, generateUUID());

  return content;
}

function generateRandomInt(min = 0, max = 99999999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomPhone(): string {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '182', '183', '188'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${suffix}`;
}

function generateRandomLetters(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomDigits(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function fillInput(text: string): Promise<void> {
  const processedText = processVariables(text);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'fillText', text: processedText }, () => {
      if (!chrome.runtime.lastError) {
        showToast(t('toastFillSuccess'));
      }
    });
  }
  chrome.storage.session.set({ lastFilledText: processedText });
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toast.classList.remove('show');
  toast.textContent = message;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toastTimeout = null;
  }, 2000);
}

function renderCards(): void {
  const container = document.getElementById('card-list');
  if (!container) return;

  let filtered = cards;

  if (activeCategory === 'uncategorized') {
    filtered = cards.filter(c => c.labels.length === 0);
  } else if (activeCategory !== 'all') {
    filtered = cards.filter(c => c.labels.includes(activeCategory));
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(c => c.content.toLowerCase().includes(query));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>${t('emptyStateNoCards')}</h3>
        <p>${t('emptyStateHint')}</p>
        <div class="empty-state-actions">
          <button class="empty-state-btn" id="empty-state-add-btn">${t('emptyStateAddFirst')}</button>
          <a href="help.html" target="_blank" class="empty-state-link">${t('emptyStateLearnMore')}</a>
        </div>
      </div>`;
    container.querySelector('#empty-state-add-btn')?.addEventListener('click', showAddCardModal);
    return;
  }

  container.innerHTML = filtered.map(card => {
    const labelHtml = card.labels.map(labelId => {
      const cat = categories.find(c => c.id === labelId);
      if (!cat) return '';
      return `<span class="label" style="background: ${cat.color}33; color: ${cat.color}; border-color: ${cat.color};">${cat.name}</span>`;
    }).join('');

    const isSelected = selectedCardIds.has(card.id);

    return `
      <div class="card ${isSelected ? 'selected' : ''} ${isEditMode ? 'edit-mode' : ''}" data-id="${card.id}">
        ${isEditMode ? `<input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''} data-id="${card.id}">` : ''}
        <span class="card-content">${escapeHtml(card.content)}</span>
        ${labelHtml}
        ${!isEditMode ? `
        <span class="card-actions">
          <span class="action-btn pin-btn" data-id="${card.id}">${card.pinned ? '📌' : '⬆️'}</span>
          <span class="action-btn edit-btn" data-id="${card.id}">✏️</span>
          <span class="action-btn delete-btn" data-id="${card.id}">🗑️</span>
        </span>
        ` : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.card-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLInputElement;
      const cardId = target.dataset.id || '';
      if (target.checked) {
        selectedCardIds.add(cardId);
      } else {
        selectedCardIds.delete(cardId);
      }
      updateBatchDeleteButton();
      updateSelectAllCheckbox();
    });
  });

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const checkbox = target.closest('.card-checkbox') as HTMLInputElement;
      if (checkbox) {
        return;
      }
      const actionBtn = target.closest('.action-btn') as HTMLElement | null;
      const cardEl = card as HTMLElement;
      
      if (actionBtn) {
        const id = actionBtn.dataset.id || '';
        if (actionBtn.classList.contains('edit-btn')) {
          editCard(id);
        } else if (actionBtn.classList.contains('delete-btn')) {
          deleteCard(id);
        } else if (actionBtn.classList.contains('pin-btn')) {
          togglePin(id);
        }
        return;
      }

      const cardId = cardEl.dataset.id || '';
      const cardData = cards.find(c => c.id === cardId);
      if (cardData) {
        fillInput(cardData.content);
      }
    });
  });

  if (!isEditMode) {
    let draggedCardId: string | null = null;

    document.querySelectorAll('.card').forEach(card => {
      const cardEl = card as HTMLElement;
      cardEl.draggable = true;

      cardEl.addEventListener('dragstart', (e) => {
        draggedCardId = cardEl.dataset.id || null;
        cardEl.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });

      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        document.querySelectorAll('.card.drag-over').forEach(c => c.classList.remove('drag-over'));
        draggedCardId = null;
      });

      cardEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
      });

      cardEl.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (cardEl.dataset.id !== draggedCardId) {
          cardEl.classList.add('drag-over');
        }
      });

      cardEl.addEventListener('dragleave', () => {
        cardEl.classList.remove('drag-over');
      });

      cardEl.addEventListener('drop', (e) => {
        e.preventDefault();
        cardEl.classList.remove('drag-over');
        if (!draggedCardId || draggedCardId === cardEl.dataset.id) return;

        const fromIndex = cards.findIndex(c => c.id === draggedCardId);
        const toIndex = cards.findIndex(c => c.id === cardEl.dataset.id);
        if (fromIndex === -1 || toIndex === -1) return;

        const [moved] = cards.splice(fromIndex, 1);
        cards.splice(toIndex, 0, moved);
        cards.forEach((c, i) => c.order = i);
        sendMessage('saveCards', { cards });
        renderCards();
      });
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showAddCardModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>${t('modalAddTitle')}</h3>
      <textarea id="new-card-content" placeholder="${t('textareaPlaceholder')}"></textarea>
      <div id="category-selector"></div>
      <button id="save-card-btn">${t('btnSave')}</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.close-modal')?.addEventListener('click', () => modal.remove());

  renderCategorySelector('new-card-content');

  document.getElementById('save-card-btn')?.addEventListener('click', async () => {
    const content = (document.getElementById('new-card-content') as HTMLTextAreaElement)?.value;
    if (!content || content.trim().length === 0) return;

    const selectedLabels = Array.from(document.querySelectorAll('.category-check.selected'))
      .map(el => (el as HTMLElement).dataset.id || '');

    const newCard: Card = {
      id: Date.now().toString(),
      content: content.trim(),
      labels: selectedLabels,
      pinned: false,
      order: cards.length,
      createdAt: Date.now()
    };

    await sendMessage('saveCard', { card: newCard });
    loadCards();
    modal.remove();
  });
}

function renderCategorySelector(textareaId: string): void {
  const container = document.getElementById('category-selector');
  if (!container) return;

  let html = `<div class="category-check" data-id="">${t('categoryNone')}</div>`;
  categories.forEach(cat => {
    html += `<div class="category-check" data-id="${cat.id}" style="border-color: ${cat.color}; color: ${cat.color};">${cat.name}</div>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.category-check').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
    });
  });
}

function editCard(id: string): void {
  const card = cards.find(c => c.id === id);
  if (!card) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>${t('modalEditTitle')}</h3>
      <textarea id="edit-card-content">${escapeHtml(card.content)}</textarea>
      <div id="edit-category-selector"></div>
      <button id="update-card-btn">${t('btnUpdate')}</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.close-modal')?.addEventListener('click', () => modal.remove());

  const selector = document.createElement('div');
  selector.id = 'edit-category-selector';
  let html = `<div class="category-check ${card.labels.length === 0 ? 'selected' : ''}" data-id="">${t('categoryNone')}</div>`;
  categories.forEach(cat => {
    const isSelected = card.labels.includes(cat.id);
    html += `<div class="category-check ${isSelected ? 'selected' : ''}" data-id="${cat.id}" style="border-color: ${cat.color}; color: ${cat.color};">${cat.name}</div>`;
  });
  selector.innerHTML = html;
  document.querySelector('.modal-content')?.appendChild(selector);

  selector.querySelectorAll('.category-check').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
    });
  });

  document.getElementById('update-card-btn')?.addEventListener('click', async () => {
    const content = (document.getElementById('edit-card-content') as HTMLTextAreaElement)?.value;
    if (!content || content.trim().length === 0) return;

    const selectedLabels = Array.from(document.querySelectorAll('#edit-category-selector .category-check.selected'))
      .map(el => (el as HTMLElement).dataset.id || '')
      .filter(Boolean);

    card.content = content.trim();
    card.labels = selectedLabels;

    await sendMessage('updateCard', { card });
    loadCards();
    modal.remove();
  });
}

async function deleteCard(id: string): Promise<void> {
  if (!confirm(t('confirmDeleteCard'))) return;
  await sendMessage('deleteCard', { id });
  loadCards();
}

async function togglePin(id: string): Promise<void> {
  const card = cards.find(c => c.id === id);
  if (card) {
    card.pinned = !card.pinned;
    await sendMessage('updateCard', { card });
    loadCards();
  }
}

async function exportData(): Promise<void> {
  const response = await sendMessage('exportData');
  const data = response as { cards: Card[]; categories: Category[] };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quickpaste-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(): Promise<void> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.cards || !Array.isArray(data.cards)) {
        alert(t('alertInvalidBackup'));
        return;
      }

      const response = await sendMessage('exportData');
      const existing = response as { cards: Card[]; categories: Category[] };

      const result = await showImportConfirmDialog();
      if (result.canceled) {
        return;
      }

      if (result.overwrite) {
        await sendMessage('importData', { cards: data.cards, categories: data.categories });
      } else {
        const mergedCards = [...existing.cards, ...data.cards];
        const existingCatIds = new Set(existing.categories.map((c: Category) => c.id));
        const newCategories = data.categories?.filter((c: Category) => !existingCatIds.has(c.id)) || [];
        const mergedCategories = [...existing.categories, ...newCategories];
        await sendMessage('importData', { cards: mergedCards, categories: mergedCategories });
      }

      loadCards();
      loadCategories();
      alert(t('alertImportSuccess'));
    } catch {
      alert(t('alertImportFailed'));
    }
  };
  input.click();
}

function showImportConfirmDialog(): Promise<{ canceled: boolean; overwrite: boolean }> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 320px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;

    const title = document.createElement('h3');
    title.textContent = t('modalImportTitle');
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
    `;

    const checkboxContainer = document.createElement('label');
    checkboxContainer.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      margin-bottom: 20px;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = `
      width: 18px;
      height: 18px;
      margin-right: 10px;
      cursor: pointer;
    `;

    const checkboxLabel = document.createElement('span');
    checkboxLabel.textContent = t('labelOverwriteData');
    checkboxLabel.style.cssText = `
      font-size: 14px;
      color: #333;
    `;

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('btnCancel');
    cancelBtn.style.cssText = `
      padding: 8px 20px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      resolve({ canceled: true, overwrite: false });
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = t('btnConfirm');
    confirmBtn.style.cssText = `
      padding: 8px 24px;
      border: none;
      border-radius: 6px;
      background: #4F46E5;
      color: white;
      cursor: pointer;
      font-size: 14px;
    `;
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      resolve({ canceled: false, overwrite: checkbox.checked });
    });

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);

    dialog.appendChild(title);
    dialog.appendChild(checkboxContainer);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

async function loadAd(): Promise<void> {
  const adContainer = document.getElementById('ad-container');
  if (!adContainer) return;

  try {
    await createManagedRefreshableAd({
      container: '#ad-container',
      placement: 'sidepanel',
      size: { width: 320, height: 50 }
    });
    adContainer.style.display = 'block';
  } catch (err) {
    console.error('[QuickPaste] PlayaYield SDK 加载失败:', (err as Error).message);
    adContainer.innerHTML = `
      <div style="padding: 8px 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="color: #666; font-size: 12px;">📢</span>
        <span style="color: #667eea; font-size: 12px;">${t('adSupportLabel')}</span>
      </div>
    `;
    adContainer.style.display = 'block';
  }
}

function showLanguageMenu(): void {
  const menu = document.createElement('div');
  menu.className = 'language-menu';
  menu.innerHTML = `
    <div class="language-menu-content">
      ${LANGUAGES.map(lang => `
        <div class="language-option" data-lang="${lang.code}">
          <span class="lang-native">${lang.nativeName}</span>
          <span class="lang-name">${lang.name}</span>
        </div>
      `).join('')}
    </div>
  `;
  document.body.appendChild(menu);

  const langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    const rect = langBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.right = `${document.body.offsetWidth - rect.right}px`;
  }

  menu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const option = target.closest('.language-option') as HTMLElement;
    if (option) {
      const lang = option.dataset.lang;
      if (lang) {
        changeLanguage(lang);
      }
    }
    menu.remove();
  });

  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target as Node) && e.target !== langBtn) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  }, true);
}

async function changeLanguage(lang: string): Promise<void> {
  await setStoredLanguage(lang);
  window.location.reload();
}

function openHelp(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
}

async function checkFirstUse(): Promise<void> {
  const firstUse = await new Promise((resolve) => {
    chrome.storage.local.get('quickpaste_first_use', (result) => {
      resolve(result['quickpaste_first_use'] !== false);
    });
  });

  if (cards.length > 0) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ 'quickpaste_first_use': false }, () => resolve());
    });
    return;
  }

  if (firstUse && cards.length === 0) {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.style.display = 'flex';

    const startBtn = document.getElementById('onboarding-start');
    const helpBtn = document.getElementById('onboarding-help');

    const dismiss = async () => {
      overlay.style.display = 'none';
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ 'quickpaste_first_use': false }, () => resolve());
      });
    };

    startBtn?.addEventListener('click', dismiss);
    helpBtn?.addEventListener('click', () => {
      openHelp();
      dismiss();
    });
  }
}

function updateBatchDeleteButton(): void {
  const btn = document.getElementById('batch-delete-btn') as HTMLButtonElement;
  const countEl = document.getElementById('selected-count');
  if (btn && countEl) {
    const count = selectedCardIds.size;
    countEl.textContent = count.toString();
    btn.disabled = count === 0;
  }
}

function updateSelectAllCheckbox(): void {
  const selectAll = document.getElementById('select-all') as HTMLInputElement;
  if (!selectAll) return;
  
  const currentCards = cards.filter(c => {
    if (activeCategory === 'uncategorized') return c.labels.length === 0;
    if (activeCategory !== 'all') return c.labels.includes(activeCategory);
    return true;
  });

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    currentCards.filter(c => c.content.toLowerCase().includes(query));
  }

  const visibleIds = new Set(currentCards.map(c => c.id));
  const allSelected = visibleIds.size > 0 && [...visibleIds].every(id => selectedCardIds.has(id));
  selectAll.checked = allSelected;
}

function handleSelectAll(): void {
  const selectAll = document.getElementById('select-all') as HTMLInputElement;
  if (!selectAll) return;

  let currentCards = cards.filter(c => {
    if (activeCategory === 'uncategorized') return c.labels.length === 0;
    if (activeCategory !== 'all') return c.labels.includes(activeCategory);
    return true;
  });

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    currentCards = currentCards.filter(c => c.content.toLowerCase().includes(query));
  }

  if (selectAll.checked) {
    currentCards.forEach(c => selectedCardIds.add(c.id));
  } else {
    currentCards.forEach(c => selectedCardIds.delete(c.id));
  }
  
  updateBatchDeleteButton();
  renderCards();
}

async function handleBatchDelete(): Promise<void> {
  const count = selectedCardIds.size;
  if (count === 0) return;

  const message = t('confirmBatchDelete').replace('{count}', count.toString());
  if (!confirm(message)) return;

  for (const id of selectedCardIds) {
    await sendMessage('deleteCard', { id });
  }
  
  selectedCardIds.clear();
  updateBatchDeleteButton();
  updateSelectAllCheckbox();
  loadCards();
}

function toggleEditMode(): void {
  isEditMode = !isEditMode;
  selectedCardIds.clear();
  
  const editModeControls = document.getElementById('edit-mode-controls');
  const editModeBtn = document.getElementById('edit-mode-btn');
  
  if (editModeControls) {
    editModeControls.style.display = isEditMode ? 'flex' : 'none';
  }
  
  if (editModeBtn) {
    editModeBtn.style.display = isEditMode ? 'none' : 'flex';
  }
  
  updateBatchDeleteButton();
  renderCards();
}

function exitEditMode(): void {
  if (isEditMode) {
    toggleEditMode();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initLanguage();
  updateStaticText();
  
  await loadCategories();
  await loadCards();

  setTimeout(loadAd, 2000);

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderCards();
  });

  document.getElementById('add-btn-top')?.addEventListener('click', showAddCardModal);
  document.getElementById('add-btn')?.addEventListener('click', showAddCardModal);
  document.getElementById('add-card-btn')?.addEventListener('click', showAddCardModal);
  document.getElementById('export-btn')?.addEventListener('click', exportData);
  document.getElementById('import-btn')?.addEventListener('click', importData);
  document.getElementById('lang-btn')?.addEventListener('click', showLanguageMenu);
  document.getElementById('help-btn')?.addEventListener('click', openHelp);
  document.getElementById('select-all')?.addEventListener('change', handleSelectAll);
  document.getElementById('batch-delete-btn')?.addEventListener('click', handleBatchDelete);
  document.getElementById('edit-mode-btn')?.addEventListener('click', toggleEditMode);
  document.getElementById('cancel-edit-btn')?.addEventListener('click', exitEditMode);

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local') {
      if (changes.cards) {
        await loadCards();
      }
      if (changes.categories) {
        await loadCategories();
      }
    }
  });

  checkFirstUse();
});

function updateStaticText(): void {
  const headerTitle = document.querySelector('.header h1');
  if (headerTitle) {
    headerTitle.textContent = t('extensionName');
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const elem = el as HTMLElement;
    const key = elem.dataset.i18n;
    if (key) {
      elem.textContent = t(key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const elem = el as HTMLInputElement;
    const key = elem.dataset.i18nPlaceholder;
    if (key) {
      elem.placeholder = t(key);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const elem = el as HTMLElement;
    const key = elem.dataset.i18nTitle;
    if (key) {
      elem.title = t(key);
    }
  });
}