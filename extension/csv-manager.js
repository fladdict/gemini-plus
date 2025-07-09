// CSV Manager Module - Gemini+ Menu Export/Import
// 疎結合設計でメニューデータのCSVエクスポート/インポート機能を提供

(function() {
  'use strict';

  // CSV Manager クラス
  class CSVManager {
    constructor() {
      this.csvHeader = 'フォルダ,タイトル,プロンプト,適用範囲';
    }

    // メニュー構造からCSVデータを生成
    exportToCSV(menuStructure) {
      const menuData = this._extractMenusFromStructure(menuStructure);
      const csvContent = this._generateCSVContent(menuData);
      const filename = this._generateFilename();
      
      this._downloadCSV(csvContent, filename);
      
      return {
        success: true,
        count: menuData.length,
        filename: filename
      };
    }

    // CSVファイルを読み込んでメニューデータに変換
    async importFromCSV(file) {
      try {
        const csvText = await this._readFileAsText(file);
        const importedMenus = this._parseCSVContent(csvText);
        
        return {
          success: true,
          menus: importedMenus,
          count: importedMenus.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }

    // インポートしたメニューを既存構造に統合
    integrateMenus(menuStructure, importedMenus, options = {}) {
      const {
        targetFolderName = 'インポート',
        createNewFolder = true,
        overwriteExisting = false
      } = options;

      let addedCount = 0;
      const targetFolder = this._findOrCreateFolder(menuStructure, targetFolderName, createNewFolder);
      
      if (!targetFolder) {
        return {
          success: false,
          error: 'ターゲットフォルダが見つかりません'
        };
      }

      importedMenus.forEach(importedMenu => {
        const newMenu = {
          id: this._generateMenuId(),
          type: 'menu',
          title: importedMenu.title,
          prompt: importedMenu.prompt,
          context: importedMenu.context || 'both'
        };

        // 重複チェック
        if (!overwriteExisting && this._isDuplicateMenu(targetFolder.items, newMenu)) {
          return; // スキップ
        }

        if (!targetFolder.items) {
          targetFolder.items = [];
        }

        targetFolder.items.push(newMenu);
        addedCount++;
      });

      return {
        success: true,
        count: addedCount,
        targetFolder: targetFolder.name
      };
    }

    // プライベートメソッド群

    // メニュー構造からメニューデータを抽出
    _extractMenusFromStructure(menuStructure) {
      const menuData = [];
      
      const extractRecursively = (items, folderPath = '') => {
        items.forEach(item => {
          if (item.type === 'menu') {
            menuData.push({
              folder: folderPath,
              title: item.title || '',
              prompt: item.prompt || '',
              context: item.context || 'both'
            });
          } else if (item.type === 'folder' && item.items) {
            const newFolderPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            extractRecursively(item.items, newFolderPath);
          }
        });
      };

      extractRecursively(menuStructure);
      return menuData;
    }

    // CSVコンテンツを生成
    _generateCSVContent(menuData) {
      const csvRows = [this.csvHeader];
      
      menuData.forEach(item => {
        const row = [
          this._escapeCSVField(item.folder),
          this._escapeCSVField(item.title),
          this._escapeCSVField(item.prompt),
          this._escapeCSVField(item.context)
        ].join(',');
        
        csvRows.push(row);
      });

      return csvRows.join('\n');
    }

    // CSVフィールドをエスケープ
    _escapeCSVField(field) {
      if (typeof field !== 'string') {
        field = String(field);
      }
      
      if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
        return '"' + field.replace(/"/g, '""') + '"';
      }
      
      return field;
    }

    // ファイル名を生成
    _generateFilename() {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      return `gemini-plus-menus-${dateStr}-${timeStr}.csv`;
    }

    // CSVファイルをダウンロード
    _downloadCSV(csvContent, filename) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }

    // ファイルをテキストとして読み込み
    _readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        
        reader.readAsText(file, 'UTF-8');
      });
    }

    // CSVコンテンツを解析
    _parseCSVContent(csvText) {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        throw new Error('CSVファイルにデータがありません');
      }

      // ヘッダーをスキップ
      const dataLines = lines.slice(1);
      const importedMenus = [];

      dataLines.forEach((line, index) => {
        try {
          const parsedFields = this._parseCSVLine(line);
          
          if (parsedFields.length >= 3) {
            const [folder, title, prompt, context] = parsedFields;
            
            if (title.trim() && prompt.trim()) {
              importedMenus.push({
                folder: folder.trim(),
                title: title.trim(),
                prompt: prompt.trim(),
                context: (context || 'both').trim()
              });
            }
          }
        } catch (error) {
          console.warn(`CSV行 ${index + 2} の解析をスキップ:`, error.message);
        }
      });

      if (importedMenus.length === 0) {
        throw new Error('インポート可能なメニューが見つかりません');
      }

      return importedMenus;
    }

    // CSV行を解析（簡易パーサー）
    _parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];

        if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === '"' && inQuotes) {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // 次の引用符をスキップ
          } else {
            inQuotes = false;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }

        i++;
      }

      result.push(current);
      return result;
    }

    // フォルダを検索または作成
    _findOrCreateFolder(menuStructure, folderName, createNew) {
      // 既存フォルダを検索
      const existingFolder = menuStructure.find(item => 
        item.type === 'folder' && item.name === folderName
      );

      if (existingFolder) {
        return existingFolder;
      }

      // 新規作成
      if (createNew) {
        const newFolder = {
          id: this._generateFolderId(),
          type: 'folder',
          name: folderName,
          description: 'インポートされたメニュー',
          expanded: true,
          items: []
        };

        menuStructure.push(newFolder);
        return newFolder;
      }

      return null;
    }

    // 重複メニューチェック
    _isDuplicateMenu(existingMenus, newMenu) {
      if (!existingMenus) return false;
      
      return existingMenus.some(menu => 
        menu.type === 'menu' && menu.title === newMenu.title
      );
    }

    // ユニークIDを生成
    _generateMenuId() {
      return 'imported-menu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    _generateFolderId() {
      return 'imported-folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  }

  // グローバルスコープに公開
  window.CSVManager = CSVManager;

})();