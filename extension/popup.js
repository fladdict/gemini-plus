// Popup script for Chrome Extension
// This script runs when the popup is opened

document.addEventListener('DOMContentLoaded', function() {
  
  // Header menu functionality
  const menuToggle = document.getElementById('menuToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const restoreMenusBtn = document.getElementById('restoreMenusBtn');
  const exportCSVBtn = document.getElementById('exportCSVBtn');
  const importCSVBtn = document.getElementById('importCSVBtn');
  const csvFileInput = document.getElementById('csvFileInput');
  
  // Tree and Editor functionality
  const treeList = document.getElementById('treeList');
  const addFolderBtn = document.getElementById('addFolderBtn');
  const addMenuBtn = document.getElementById('addMenuBtn');
  const addSeparatorBtn = document.getElementById('addSeparatorBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const editorTitle = document.getElementById('editorTitle');
  const noSelection = document.getElementById('noSelection');
  const menuEditor = document.getElementById('menuEditor');
  const folderEditor = document.getElementById('folderEditor');
  
  // Editor form elements
  const editMenuTitle = document.getElementById('editMenuTitle');
  const editMenuPrompt = document.getElementById('editMenuPrompt');
  const editFolderName = document.getElementById('editFolderName');
  const editFolderDescription = document.getElementById('editFolderDescription');
  
  // State management
  let menuStructure = [];
  let selectedItem = null;
  let isEditing = false;
  let originalData = null;
  
  // Default menu structure (loaded from background script)
  let defaultMenuStructure = null;
  
  // CSV Manager instance
  let csvManager = null;

  // Template examples
  const templates = {
    summary: {
      title: 'テキスト要約',
      prompt: '以下のテキストを分かりやすく要約してください：\n\n{$TEXT}'
    },
    translate: {
      title: '日本語翻訳',
      prompt: '以下のテキストを自然な日本語に翻訳してください：\n\n{$TEXT}'
    },
    proofread: {
      title: '文章校正',
      prompt: '以下のテキストの文章を校正し、改善点を提案してください：\n\n{$TEXT}'
    },
    explain: {
      title: '内容解説',
      prompt: '以下のテキストについて、分かりやすく解説してください：\n\n{$TEXT}'
    }
  };
  
  // Load default menu structure from background script
  chrome.runtime.sendMessage({ action: 'getDefaultMenuStructure' }, function(response) {
    if (response && response.defaultMenuStructure) {
      defaultMenuStructure = response.defaultMenuStructure;
    } else {
      console.error('Failed to load default menu structure:', response?.error);
      // Fallback structure
      defaultMenuStructure = [
        {
          id: 'custom-folder',
          type: 'folder',
          name: 'カスタム',
          description: 'ユーザー定義のメニュー',
          expanded: true,
          items: []
        }
      ];
    }
    
    // Initialize CSV Manager
    csvManager = new CSVManager();
    
    // Load menu structure from storage
    chrome.storage.sync.get(['menuStructure'], function(result) {
      if (result.menuStructure) {
        menuStructure = result.menuStructure;
      } else {
        // This should not happen as background.js sets the default structure
        // But just in case, use fallback structure
        menuStructure = JSON.parse(JSON.stringify(defaultMenuStructure));
      }
      
      renderTree();
    });
  });
  
  // Header menu functionality
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
  });
  
  // Restore default menus functionality
  restoreMenusBtn.addEventListener('click', () => {
    if (confirm('初期メニューを復元しますか？削除された初期メニューが再追加されます。')) {
      restoreDefaultMenus();
      dropdownMenu.style.display = 'none';
    }
  });
  
  // CSV Export functionality
  exportCSVBtn.addEventListener('click', () => {
    try {
      const result = csvManager.exportToCSV(menuStructure);
      if (result.success) {
        showStatus(`${result.count}個のメニューをエクスポートしました`, '#4CAF50');
        console.log('CSV exported:', result.filename);
      }
    } catch (error) {
      showStatus('エクスポートに失敗しました: ' + error.message, '#f44336');
      console.error('CSV export error:', error);
    }
    dropdownMenu.style.display = 'none';
  });
  
  // CSV Import functionality
  importCSVBtn.addEventListener('click', () => {
    csvFileInput.click();
    dropdownMenu.style.display = 'none';
  });
  
  // File input change handler
  csvFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const importResult = await csvManager.importFromCSV(file);
      
      if (importResult.success) {
        const integrationResult = csvManager.integrateMenus(
          menuStructure, 
          importResult.menus,
          {
            targetFolderName: 'インポート',
            createNewFolder: true,
            overwriteExisting: false
          }
        );
        
        if (integrationResult.success) {
          renderTree();
          saveStructure();
          showStatus(`${integrationResult.count}個のメニューをインポートしました`, '#4CAF50');
          console.log('CSV imported successfully:', integrationResult);
        } else {
          showStatus('インポートに失敗しました: ' + integrationResult.error, '#f44336');
        }
      } else {
        showStatus('CSVファイルの読み込みに失敗しました: ' + importResult.error, '#f44336');
      }
    } catch (error) {
      showStatus('インポートエラー: ' + error.message, '#f44336');
      console.error('CSV import error:', error);
    }
    
    // Reset file input
    csvFileInput.value = '';
  });
  
  // Function to restore default menus
  function restoreDefaultMenus() {
    if (!defaultMenuStructure) {
      console.error('デフォルトメニュー構造が読み込まれていません');
      showStatus('復元に失敗しました：デフォルトメニューが読み込まれていません');
      return;
    }
    
    console.log('初期メニュー復元開始');
    console.log('現在のmenuStructure:', menuStructure);
    
    // Find preset folder or create if missing
    let presetFolder = menuStructure.find(item => item.id === 'preset-folder');
    let restoredCount = 0;
    
    if (!presetFolder) {
      console.log('プリセットフォルダが存在しないため作成');
      // Create preset folder if it doesn't exist
      presetFolder = JSON.parse(JSON.stringify(defaultMenuStructure[0]));
      menuStructure.unshift(presetFolder);
      restoredCount += presetFolder.items.length;
    } else {
      console.log('プリセットフォルダが存在、欠損メニューをチェック');
      // Check each default menu item and add if missing
      const defaultPresetFolder = defaultMenuStructure[0];
      if (defaultPresetFolder && defaultPresetFolder.items) {
        defaultPresetFolder.items.forEach(defaultItem => {
          const exists = presetFolder.items.find(item => item.id === defaultItem.id);
          if (!exists) {
            console.log('欠損メニューを復元:', defaultItem.title || defaultItem.type);
            presetFolder.items.push(JSON.parse(JSON.stringify(defaultItem)));
            restoredCount++;
          }
        });
      }
    }
    
    // Ensure custom folder exists
    let customFolder = menuStructure.find(item => item.id === 'custom-folder');
    if (!customFolder) {
      console.log('カスタムフォルダが存在しないため作成');
      const defaultCustomFolder = defaultMenuStructure.find(item => item.id === 'custom-folder');
      if (defaultCustomFolder) {
        customFolder = JSON.parse(JSON.stringify(defaultCustomFolder));
        menuStructure.push(customFolder);
      }
    }
    
    console.log('復元したメニュー数:', restoredCount);
    console.log('復元後のmenuStructure:', menuStructure);
    
    // Save and refresh
    saveStructure();
    renderTree();
    showStatus(restoredCount > 0 ? `${restoredCount}個のメニューを復元しました` : '復元が必要なメニューはありませんでした');
  }
  
  // Tree management functions
  function renderTree() {
    treeList.innerHTML = '';
    menuStructure.forEach(folder => renderTreeItem(folder, 0));
  }
  
  function renderTreeItem(item, depth) {
    const div = document.createElement('div');
    div.className = `tree-item ${item.type}`;
    div.style.marginLeft = `${depth * 20}px`;
    div.setAttribute('data-id', item.id);
    div.setAttribute('data-type', item.type);
    div.draggable = true;
    
    if (item.type === 'folder') {
      const toggle = item.expanded ? '▼' : '▶';
      div.innerHTML = `
        <span class="tree-toggle">${toggle}</span>
        <span class="tree-icon">📁</span>
        <span>${item.name}</span>
      `;
      
      div.addEventListener('click', (e) => {
        if (e.target.className === 'tree-toggle') {
          toggleFolder(item.id);
        } else {
          selectItem(item);
        }
      });
      
      treeList.appendChild(div);
      
      if (item.expanded && item.items) {
        item.items.forEach(subItem => renderTreeItem(subItem, depth + 1));
      }
    } else if (item.type === 'separator') {
      div.innerHTML = `<div class="separator-line"></div>`;
      div.addEventListener('click', () => selectItem(item));
      treeList.appendChild(div);
    } else {
      div.innerHTML = `
        <span class="tree-icon">📄</span>
        <span>${item.title}</span>
      `;
      
      div.addEventListener('click', () => selectItem(item));
      treeList.appendChild(div);
    }
    
    // Add drag and drop events
    setupDragAndDrop(div, item);
  }
  
  // Drag and drop functionality
  let draggedItem = null;
  let draggedElement = null;
  
  function setupDragAndDrop(element, item) {
    element.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedElement = element;
      element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      draggedItem = null;
      draggedElement = null;
    });
    
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (draggedItem && draggedItem.id !== item.id) {
        element.classList.add('drag-over');
      }
    });
    
    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      
      if (!draggedItem || draggedItem.id === item.id) return;
      
      // Handle the drop
      handleDrop(draggedItem, item);
    });
  }
  
  function handleDrop(draggedItem, targetItem) {
    // Remove dragged item from its current location
    removeItemFromStructure(draggedItem.id);
    
    if (targetItem.type === 'folder') {
      // Drop into folder
      if (!targetItem.items) targetItem.items = [];
      targetItem.items.push(draggedItem);
      targetItem.expanded = true;
    } else {
      // Drop next to item - find parent folder and insert after target
      const parentFolder = findParentFolder(targetItem.id);
      if (parentFolder) {
        const targetIndex = parentFolder.items.findIndex(item => item.id === targetItem.id);
        parentFolder.items.splice(targetIndex + 1, 0, draggedItem);
      } else {
        // Target is at root level
        const targetIndex = menuStructure.findIndex(item => item.id === targetItem.id);
        if (draggedItem.type === 'folder') {
          menuStructure.splice(targetIndex + 1, 0, draggedItem);
        } else {
          // Can't drop menu at root level, add to default folder
          let defaultFolder = menuStructure.find(f => f.id === 'default-folder');
          if (!defaultFolder) {
            defaultFolder = {
              id: 'default-folder',
              type: 'folder',
              name: 'デフォルト',
              description: '基本的なメニュー',
              expanded: true,
              items: []
            };
            menuStructure.push(defaultFolder);
          }
          defaultFolder.items.push(draggedItem);
        }
      }
    }
    
    renderTree();
    saveStructure();
    showStatus('アイテムを移動しました', '#4CAF50');
  }
  
  function toggleFolder(folderId) {
    const folder = findItemById(folderId);
    if (folder) {
      folder.expanded = !folder.expanded;
      renderTree();
      saveStructure();
    }
  }
  
  function findItemById(id) {
    for (const item of menuStructure) {
      if (item.id === id) return item;
      if (item.items) {
        const found = findInItems(item.items, id);
        if (found) return found;
      }
    }
    return null;
  }
  
  function findInItems(items, id) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.items) {
        const found = findInItems(item.items, id);
        if (found) return found;
      }
    }
    return null;
  }
  
  function selectItem(item) {
    if (isEditing && hasUnsavedChanges()) {
      if (!confirm('未保存の変更があります。破棄しますか？')) {
        return;
      }
    }
    
    // Clear previous selection
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
    
    // Select current item
    const element = document.querySelector(`[data-id="${item.id}"]`);
    if (element) element.classList.add('selected');
    
    selectedItem = item;
    loadItemInEditor(item);
  }
  
  function loadItemInEditor(item) {
    hideAllEditors();
    
    if (item.type === 'folder') {
      editorTitle.textContent = `フォルダ: ${item.name}`;
      editFolderName.value = item.name || '';
      editFolderDescription.value = item.description || '';
      folderEditor.classList.add('active');
    } else if (item.type === 'separator') {
      editorTitle.textContent = '分割線';
      // Separators don't need an editor, just show delete button
      noSelection.innerHTML = `
        <p>分割線が選択されています</p>
        <p style="font-size: 12px; color: #666;">
          分割線はメニューを視覚的に区切るために使用されます。<br>
          ドラッグして位置を変更したり、削除ボタンで削除できます。
        </p>
      `;
      noSelection.style.display = 'block';
    } else {
      editorTitle.textContent = `メニュー: ${item.title}`;
      editMenuTitle.value = item.title || '';
      editMenuPrompt.value = item.prompt || '';
      menuEditor.classList.add('active');
    }
    
    // Show delete button
    deleteBtn.style.display = 'inline-block';
    
    originalData = JSON.stringify(item);
    isEditing = false;
    updateEditorButtons();
  }
  
  function hideAllEditors() {
    noSelection.style.display = 'none';
    noSelection.innerHTML = `
      左のツリーからメニューを選択するか、<br>
      新しいメニューを作成してください
    `;
    menuEditor.classList.remove('active');
    folderEditor.classList.remove('active');
  }
  
  function hasUnsavedChanges() {
    if (!selectedItem || !originalData) return false;
    return JSON.stringify(getCurrentFormData()) !== originalData;
  }
  
  function getCurrentFormData() {
    if (!selectedItem) return null;
    
    if (selectedItem.type === 'folder') {
      return {
        ...selectedItem,
        name: editFolderName.value,
        description: editFolderDescription.value
      };
    } else if (selectedItem.type === 'separator') {
      // Separators don't have editable data
      return selectedItem;
    } else {
      return {
        ...selectedItem,
        title: editMenuTitle.value,
        prompt: editMenuPrompt.value
      };
    }
  }
  
  function updateEditorButtons() {
    // Hide save/cancel buttons for separators
    if (selectedItem && selectedItem.type === 'separator') {
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      isEditing = false;
      return;
    }
    
    // Show buttons for other items
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    const hasChanges = hasUnsavedChanges();
    saveBtn.disabled = !hasChanges;
    cancelBtn.disabled = !hasChanges;
    isEditing = hasChanges;
  }
  
  // Event listeners
  addFolderBtn.addEventListener('click', () => createNewFolder());
  addMenuBtn.addEventListener('click', () => createNewMenu());
  addSeparatorBtn.addEventListener('click', () => createNewSeparator());
  saveBtn.addEventListener('click', () => saveCurrentItem());
  cancelBtn.addEventListener('click', () => cancelEdit());
  deleteBtn.addEventListener('click', () => deleteCurrentItem());
  
  // Form change listeners
  editMenuTitle.addEventListener('input', () => {
    updateEditorButtons();
  });
  editMenuPrompt.addEventListener('input', () => {
    updateEditorButtons();
  });
  editFolderName.addEventListener('input', updateEditorButtons);
  editFolderDescription.addEventListener('input', updateEditorButtons);
  
  // Template button event listeners
  document.querySelectorAll('.template-btn').forEach(button => {
    button.addEventListener('click', function() {
      const templateKey = this.getAttribute('data-template');
      const template = templates[templateKey];
      
      if (template) {
        editMenuTitle.value = template.title;
        editMenuPrompt.value = template.prompt;
        updateEditorButtons();
      }
    });
  });
  
  function createNewFolder() {
    const newFolder = {
      id: 'folder-' + Date.now(),
      type: 'folder',
      name: '新しいフォルダ',
      description: '',
      expanded: true,
      items: []
    };
    
    menuStructure.push(newFolder);
    renderTree();
    selectItem(newFolder);
    saveStructure();
  }
  
  function createNewMenu() {
    let targetFolder = null;
    
    // If a folder is selected, add to that folder
    if (selectedItem && selectedItem.type === 'folder') {
      targetFolder = selectedItem;
    } else if (selectedItem && selectedItem.type === 'menu') {
      // If a menu is selected, find its parent folder
      targetFolder = findParentFolder(selectedItem.id);
    }
    
    // If no folder found, use default folder
    if (!targetFolder) {
      targetFolder = menuStructure.find(f => f.id === 'default-folder');
      if (!targetFolder) {
        targetFolder = {
          id: 'default-folder',
          type: 'folder',
          name: 'デフォルト',
          description: '基本的なメニュー',
          expanded: true,
          items: []
        };
        menuStructure.push(targetFolder);
      }
    }
    
    const newMenu = {
      id: 'menu-' + Date.now(),
      type: 'menu',
      title: '新しいメニュー',
      prompt: '{$TEXT}'
    };
    
    // Ensure folder has items array
    if (!targetFolder.items) {
      targetFolder.items = [];
    }
    
    // Expand the folder to show new menu
    targetFolder.expanded = true;
    
    targetFolder.items.push(newMenu);
    renderTree();
    selectItem(newMenu);
    saveStructure();
  }
  
  function findParentFolder(itemId) {
    for (const folder of menuStructure) {
      if (folder.type === 'folder' && folder.items) {
        const found = folder.items.find(item => item.id === itemId);
        if (found) return folder;
      }
    }
    return null;
  }
  
  function createNewSeparator() {
    let targetFolder = null;
    
    // If a folder is selected, add to that folder
    if (selectedItem && selectedItem.type === 'folder') {
      targetFolder = selectedItem;
    } else if (selectedItem) {
      // If an item is selected, find its parent folder
      targetFolder = findParentFolder(selectedItem.id);
    }
    
    // If no folder found, use default folder
    if (!targetFolder) {
      targetFolder = menuStructure.find(f => f.id === 'default-folder');
      if (!targetFolder) {
        targetFolder = {
          id: 'default-folder',
          type: 'folder',
          name: 'デフォルト',
          description: '基本的なメニュー',
          expanded: true,
          items: []
        };
        menuStructure.push(targetFolder);
      }
    }
    
    const newSeparator = {
      id: 'separator-' + Date.now(),
      type: 'separator'
    };
    
    // Ensure folder has items array
    if (!targetFolder.items) {
      targetFolder.items = [];
    }
    
    // Expand the folder to show new separator
    targetFolder.expanded = true;
    
    targetFolder.items.push(newSeparator);
    renderTree();
    selectItem(newSeparator);
    saveStructure();
  }
  
  function saveCurrentItem() {
    if (!selectedItem) return;
    
    const formData = getCurrentFormData();
    Object.assign(selectedItem, formData);
    
    originalData = JSON.stringify(selectedItem);
    isEditing = false;
    updateEditorButtons();
    
    renderTree();
    saveStructure();
    
    showStatus('保存しました', '#4CAF50');
  }
  
  function cancelEdit() {
    if (selectedItem && originalData) {
      const original = JSON.parse(originalData);
      Object.assign(selectedItem, original);
      loadItemInEditor(selectedItem);
    }
  }
  
  
  function saveStructure() {
    chrome.storage.sync.set({ menuStructure: menuStructure }, function() {
      // Convert structure to customMenus format for backward compatibility
      const customMenus = extractMenusFromStructure();
      chrome.storage.sync.set({ customMenus: customMenus }, function() {
        chrome.runtime.sendMessage({ action: 'refreshMenus' });
      });
    });
  }
  
  function extractMenusFromStructure() {
    const menus = [];
    
    function extractFromItems(items) {
      items.forEach(item => {
        if (item.type === 'menu') {
          menus.push({
            id: item.id,
            title: item.title,
            prompt: item.prompt
          });
        } else if (item.type === 'folder' && item.items) {
          extractFromItems(item.items);
        }
      });
    }
    
    extractFromItems(menuStructure);
    return menus;
  }
  
  function deleteCurrentItem() {
    if (!selectedItem) return;
    
    let itemType, itemName, confirmMessage;
    
    if (selectedItem.type === 'separator') {
      itemType = '分割線';
      itemName = '';
      confirmMessage = '分割線を削除しますか？';
    } else if (selectedItem.type === 'folder') {
      itemType = 'フォルダ';
      itemName = selectedItem.name;
      confirmMessage = `「${itemName}」${itemType}を削除しますか？`;
    } else {
      itemType = 'メニュー';
      itemName = selectedItem.title;
      confirmMessage = `「${itemName}」${itemType}を削除しますか？`;
    }
    
    // Check if folder has items
    if (selectedItem.type === 'folder' && selectedItem.items && selectedItem.items.length > 0) {
      confirmMessage += `\n\n警告: このフォルダには ${selectedItem.items.length} 個のアイテムが含まれています。これらも一緒に削除されます。`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Find and remove the item
    const removed = removeItemFromStructure(selectedItem.id);
    
    if (removed) {
      // Clear editor
      selectedItem = null;
      hideAllEditors();
      deleteBtn.style.display = 'none';
      noSelection.style.display = 'block';
      
      // Update tree and save
      renderTree();
      saveStructure();
      showStatus(`${itemType}を削除しました`, '#4CAF50');
    }
  }
  
  function removeItemFromStructure(itemId) {
    // Check top level
    const index = menuStructure.findIndex(item => item.id === itemId);
    if (index !== -1) {
      menuStructure.splice(index, 1);
      return true;
    }
    
    // Check nested items
    for (const folder of menuStructure) {
      if (folder.items) {
        const itemIndex = folder.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          folder.items.splice(itemIndex, 1);
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Initialize editor preview
  
  // Status message helper (disabled)
  function showStatus(message, color) {
    // Status display removed - function kept for compatibility
    console.log('Status:', message);
  }
});