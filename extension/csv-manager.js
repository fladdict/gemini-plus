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
        // ファイルの基本検証
        if (!file) {
          throw new Error('ファイルが選択されていません');
        }
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('CSVファイルを選択してください');
        }
        
        if (file.size === 0) {
          throw new Error('ファイルが空です');
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB制限
          throw new Error('ファイルサイズが大きすぎます（10MB以下にしてください）');
        }
        
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
      try {
        // パラメータの検証
        if (!Array.isArray(menuStructure)) {
          throw new Error('メニュー構造が配列ではありません');
        }
        
        if (!Array.isArray(importedMenus)) {
          throw new Error('インポートするメニューが配列ではありません');
        }
        
        if (importedMenus.length === 0) {
          return {
            success: true,
            count: 0,
            targetFolder: null
          };
        }
        
        const {
          targetFolderName = 'インポート',
          createNewFolder = true,
          overwriteExisting = false
        } = options;

        let addedCount = 0;
        const skippedMenus = [];
        const targetFolder = this._findOrCreateFolder(menuStructure, targetFolderName, createNewFolder);
        
        if (!targetFolder) {
          return {
            success: false,
            error: 'ターゲットフォルダが見つかりません'
          };
        }

        importedMenus.forEach((importedMenu, index) => {
          try {
            // インポートメニューの検証
            if (!importedMenu || typeof importedMenu !== 'object') {
              skippedMenus.push(`メニュー ${index + 1}: 無効なメニューオブジェクト`);
              return;
            }
            
            if (!importedMenu.title || !importedMenu.prompt) {
              skippedMenus.push(`メニュー ${index + 1}: タイトルまたはプロンプトが空です`);
              return;
            }
            
            const newMenu = {
              id: this._generateMenuId(),
              type: 'menu',
              title: importedMenu.title,
              prompt: importedMenu.prompt,
              context: importedMenu.context || 'both'
            };

            // 重複チェック
            if (!overwriteExisting && this._isDuplicateMenu(targetFolder.items, newMenu)) {
              skippedMenus.push(`メニュー "${newMenu.title}": 重複のためスキップ`);
              return;
            }

            if (!targetFolder.items) {
              targetFolder.items = [];
            }

            targetFolder.items.push(newMenu);
            addedCount++;
          } catch (error) {
            skippedMenus.push(`メニュー ${index + 1}: ${error.message}`);
          }
        });

        if (skippedMenus.length > 0) {
          console.warn('インポート時の警告:', skippedMenus.slice(0, 10));
        }

        return {
          success: true,
          count: addedCount,
          targetFolder: targetFolder.name,
          skipped: skippedMenus.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
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
      // 基本的な入力検証
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSVテキストが無効です');
      }
      
      if (csvText.length > 5 * 1024 * 1024) { // 5MB制限
        throw new Error('CSVファイルが大きすぎます');
      }
      
      // 異なる改行文字を正規化
      const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        throw new Error('CSVファイルにデータがありません');
      }

      // ヘッダーの検証
      const headerLine = lines[0];
      if (!this._validateCSVHeader(headerLine)) {
        throw new Error('CSVヘッダーが正しくありません。正しい形式: フォルダ,タイトル,プロンプト,適用範囲');
      }

      // ヘッダーをスキップ
      const dataLines = lines.slice(1);
      const importedMenus = [];
      const errors = [];

      dataLines.forEach((line, index) => {
        try {
          const parsedFields = this._parseCSVLine(line);
          
          if (parsedFields.length >= 3) {
            const [folder, title, prompt, context] = parsedFields;
            
            // フィールドの検証
            const validatedMenu = this._validateMenuFields(folder, title, prompt, context);
            if (validatedMenu) {
              importedMenus.push(validatedMenu);
            }
          } else {
            errors.push(`行 ${index + 2}: フィールド数が不足しています`);
          }
        } catch (error) {
          errors.push(`行 ${index + 2}: ${error.message}`);
        }
      });

      if (importedMenus.length === 0) {
        const errorMessage = errors.length > 0 
          ? `インポート可能なメニューが見つかりません。エラー: ${errors.slice(0, 5).join(', ')}`
          : 'インポート可能なメニューが見つかりません';
        throw new Error(errorMessage);
      }

      if (errors.length > 0) {
        console.warn('CSVインポート時の警告:', errors.slice(0, 10));
      }

      return importedMenus;
    }
    
    // CSVヘッダーの検証
    _validateCSVHeader(headerLine) {
      const expectedHeaders = ['フォルダ', 'タイトル', 'プロンプト', '適用範囲'];
      const actualHeaders = this._parseCSVLine(headerLine).map(h => h.trim());
      
      // 最初の3つのヘッダーが必須
      for (let i = 0; i < 3; i++) {
        if (actualHeaders[i] !== expectedHeaders[i]) {
          return false;
        }
      }
      
      return true;
    }
    
    // メニューフィールドの検証
    _validateMenuFields(folder, title, prompt, context) {
      // 必須フィールドの検証
      if (!title || !title.trim()) {
        return null; // タイトルが空の場合はスキップ
      }
      
      if (!prompt || !prompt.trim()) {
        return null; // プロンプトが空の場合はスキップ
      }
      
      // フィールドの正規化と検証
      const normalizedFolder = (folder || '').trim();
      const normalizedTitle = title.trim();
      const normalizedPrompt = prompt.trim();
      const normalizedContext = (context || 'both').trim();
      
      // 長さ制限
      if (normalizedFolder.length > 200) {
        throw new Error('フォルダ名が長すぎます（200文字以下）');
      }
      
      if (normalizedTitle.length > 100) {
        throw new Error('タイトルが長すぎます（100文字以下）');
      }
      
      if (normalizedPrompt.length > 10000) {
        throw new Error('プロンプトが長すぎます（10000文字以下）');
      }
      
      // 適用範囲の検証
      const validContexts = ['both', 'page', 'selection'];
      if (!validContexts.includes(normalizedContext)) {
        console.warn(`無効な適用範囲 "${normalizedContext}" を "both" に変換しました`);
        return {
          folder: normalizedFolder,
          title: normalizedTitle,
          prompt: normalizedPrompt,
          context: 'both'
        };
      }
      
      // 危険な文字のフィルタリング
      const sanitizedTitle = this._sanitizeText(normalizedTitle);
      const sanitizedPrompt = this._sanitizeText(normalizedPrompt);
      
      return {
        folder: normalizedFolder,
        title: sanitizedTitle,
        prompt: sanitizedPrompt,
        context: normalizedContext
      };
    }
    
    // テキストのサニタイズ
    _sanitizeText(text) {
      // 制御文字を除去
      return text.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // CSV行を解析（簡易パーサー）
    _parseCSVLine(line) {
      if (!line || typeof line !== 'string') {
        throw new Error('無効な行です');
      }
      
      // 行の長さ制限
      if (line.length > 50000) {
        throw new Error('行が長すぎます');
      }
      
      const result = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      let loopCount = 0;
      const maxLoops = line.length + 1000; // 無限ループ防止

      while (i < line.length && loopCount < maxLoops) {
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
        loopCount++;
      }
      
      if (loopCount >= maxLoops) {
        throw new Error('CSV行の解析でタイムアウトしました');
      }
      
      if (inQuotes) {
        throw new Error('クォートが閉じられていません');
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