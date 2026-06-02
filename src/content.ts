let lastFocusedElement: HTMLElement | null = null;

document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    lastFocusedElement = target;
  }
});

function fillInput(text: string): boolean {
  const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  let targetElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null = activeElement;

  if (!targetElement || (targetElement.tagName !== 'INPUT' && targetElement.tagName !== 'TEXTAREA' && !targetElement.isContentEditable)) {
    targetElement = lastFocusedElement;
  }

  if (!targetElement) {
    return false;
  }

  try {
    if (targetElement.isContentEditable) {
      document.execCommand('insertText', false, text);
      return true;
    }

    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
      const inputElement = targetElement as HTMLInputElement | HTMLTextAreaElement;
      inputElement.focus();
      inputElement.select();
      document.execCommand('insertText', false, text);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const LANG_DATA: Record<string, Record<string, string>> = {
  'zh_CN': {
    'contextMenuSaveFull': '📥 收藏到 Quick Paste',
    'pickerPreview': '预览：',
    'selectCategories': '选择分类（可多选）：',
    'btnCancel': '取消',
    'btnConfirmSave': '确认收藏',
    'categoryNone': '无分类'
  },
  'en': {
    'contextMenuSaveFull': '📥 Save to Quick Paste',
    'pickerPreview': 'Preview:',
    'selectCategories': 'Select categories (multiple):',
    'btnCancel': 'Cancel',
    'btnConfirmSave': 'Confirm Save',
    'categoryNone': 'None'
  },
  'ja': {
    'contextMenuSaveFull': '📥 QuickPasteに保存',
    'pickerPreview': 'プレビュー：',
    'selectCategories': '分類を選択（複数可）：',
    'btnCancel': 'キャンセル',
    'btnConfirmSave': '保存確認',
    'categoryNone': '分類なし'
  },
  'ko': {
    'contextMenuSaveFull': '📥 QuickPaste에 저장',
    'pickerPreview': '미리보기：',
    'selectCategories': '분류 선택 (여러 개 가능)：',
    'btnCancel': '취소',
    'btnConfirmSave': '저장 확인',
    'categoryNone': '분류 없음'
  },
  'de': {
    'contextMenuSaveFull': '📥 In QuickPaste speichern',
    'pickerPreview': 'Vorschau:',
    'selectCategories': 'Kategorien auswählen (mehrfach):',
    'btnCancel': 'Abbrechen',
    'btnConfirmSave': 'Speichern bestätigen',
    'categoryNone': 'Keine'
  },
  'fr': {
    'contextMenuSaveFull': '📥 Enregistrer dans QuickPaste',
    'pickerPreview': 'Aperçu :',
    'selectCategories': 'Sélectionner les catégories (plusieurs) :',
    'btnCancel': 'Annuler',
    'btnConfirmSave': "Confirmer l'enregistrement",
    'categoryNone': 'Aucune'
  }
};

let currentLang: string | null = null;

function loadLanguage(callback: () => void): void {
  chrome.storage.local.get('quickpaste_language', (result) => {
    const storedLang = result.quickpaste_language;
    currentLang = storedLang ? String(storedLang) : chrome.i18n.getMessage('@@ui_locale') || 'en';
    callback();
  });
}

function getI18n(key: string): string {
  if (currentLang && LANG_DATA[currentLang] && LANG_DATA[currentLang][key]) {
    return LANG_DATA[currentLang][key];
  }
  return chrome.i18n.getMessage(key) || key;
}

function showCategoryPicker(text: string): void {
  loadLanguage(() => {
    const picker = document.createElement('div');
    picker.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 20px;
      z-index: 999999;
      min-width: 320px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999998;
    `;

    picker.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #333; font-size: 16px;">${getI18n('contextMenuSaveFull')}</h3>
        <span id="close-btn" style="cursor: pointer; color: #999; font-size: 20px; line-height: 1;">&times;</span>
      </div>
      <p style="margin: 0 0 12px 0; color: #666; font-size: 13px;">${getI18n('pickerPreview')}</p>
      <div style="padding: 10px; background: #f5f5f5; border-radius: 6px; margin-bottom: 16px; font-size: 13px; color: #333; word-break: break-all;">${escapeHtml(text)}</div>
      <p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">${getI18n('selectCategories')}</p>
      <div id="category-options" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;"></div>
      <div style="display: flex; gap: 10px;">
        <button id="cancel-btn" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: white; color: #666; cursor: pointer; font-size: 14px;">${getI18n('btnCancel')}</button>
        <button id="confirm-btn" style="flex: 2; padding: 10px; border: none; border-radius: 6px; background: #667eea; color: white; cursor: pointer; font-size: 14px;">${getI18n('btnConfirmSave')}</button>
      </div>
    `;

    overlay.setAttribute('data-overlay', 'true');
    document.body.appendChild(overlay);
    document.body.appendChild(picker);

    (picker.querySelector('#close-btn') as HTMLElement).addEventListener('click', () => {
      picker.remove();
      overlay.remove();
    });

    chrome.storage.local.get('categories', (result) => {
      const categories = (result.categories as { id: string; name: string; color: string }[]) || [];
      const optionsContainer = picker.querySelector('#category-options') as HTMLElement;

      let html = `<div class="category-option" data-id="" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; font-size: 13px;">${getI18n('categoryNone')}</div>`;
      categories.forEach(cat => {
        html += `<div class="category-option" data-id="${cat.id}" data-color="${cat.color}" style="padding: 6px 12px; border: 1px solid ${cat.color}; border-radius: 20px; cursor: pointer; font-size: 13px; color: ${cat.color};">${cat.name}</div>`;
      });
      optionsContainer.innerHTML = html;

      const selectedLabels: string[] = [];
      optionsContainer.querySelectorAll('.category-option').forEach(el => {
        const element = el as HTMLElement;
        el.addEventListener('click', () => {
          const id = element.dataset.id || '';
          const index = selectedLabels.indexOf(id);

          if (index === -1) {
            selectedLabels.push(id);
            element.style.background = '#667eea';
            element.style.color = 'white';
            element.style.borderColor = '#667eea';
          } else {
            selectedLabels.splice(index, 1);
            const origColor = element.dataset.color || '#999';
            element.style.background = 'transparent';
            element.style.color = origColor;
            element.style.borderColor = origColor;
          }
        });
      });

      (picker.querySelector('#cancel-btn') as HTMLElement).addEventListener('click', () => {
        picker.remove();
        overlay.remove();
      });

      (picker.querySelector('#confirm-btn') as HTMLElement).addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'saveCardFromSelection',
          text,
          labels: selectedLabels.filter(Boolean)
        });
        picker.remove();
        overlay.remove();
      });
    });
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((request: { action: string; text?: string }, sender, sendResponse) => {
  if (request.action === 'fillText' && request.text) {
    const success = fillInput(request.text);
    sendResponse({ success });
  } else if (request.action === 'showCategoryPicker' && request.text) {
    showCategoryPicker(request.text);
    sendResponse({ success: true });
  } else if (request.action === 'getSelection') {
    const selection = window.getSelection();
    sendResponse({ text: selection ? selection.toString() : '' });
    return true;
  }
});
