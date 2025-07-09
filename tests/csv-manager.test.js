// Unit Tests for CSV Manager
// CSV Manager の包括的な単体テスト

// テストの実行方法：
// 1. ブラウザで test-runner.html を開く
// 2. または Node.js で node csv-manager.test.js を実行

// 必要なファイルを読み込み
if (typeof require !== 'undefined') {
  // Node.js環境
  const { TestFramework, MockHelper } = require('./test-framework.js');
  const TestData = require('./test-data.js');
  // CSVManagerをここで読み込む（実際の実装では適切にインポート）
} else {
  // ブラウザ環境では、HTMLファイルで事前にスクリプトを読み込む
}

// テストの実行
function runCSVManagerTests() {
  const test = new TestFramework();
  const mock = new MockHelper();
  
  // CSVManagerのインスタンスを作成（グローバルスコープから）
  const csvManager = new CSVManager();

  // ============ CSV解析のテスト ============
  test.describe('CSV Parsing Tests', () => {
    
    test.it('should parse basic CSV data correctly', () => {
      const result = csvManager._parseCSVContent(TestData.valid.basic);
      test.expect(result).toHaveLength(2);
      test.expect(result[0]).toEqual(TestData.expected.basic[0]);
      test.expect(result[1]).toEqual(TestData.expected.basic[1]);
    });

    test.it('should handle quoted fields correctly', () => {
      const result = csvManager._parseCSVContent(TestData.valid.withQuotes);
      test.expect(result).toHaveLength(2);
      test.expect(result[0]).toEqual(TestData.expected.withQuotes[0]);
      test.expect(result[1]).toEqual(TestData.expected.withQuotes[1]);
    });

    test.it('should handle multi-line fields', () => {
      const result = csvManager._parseCSVContent(TestData.valid.multiLine);
      test.expect(result).toHaveLength(1);
      test.expect(result[0].prompt).toContain('タイトル: {$TITLE}');
      test.expect(result[0].prompt).toContain('URL: {$URL}');
    });

    test.it('should handle hierarchical folder paths', () => {
      const result = csvManager._parseCSVContent(TestData.valid.hierarchical);
      test.expect(result).toHaveLength(3);
      test.expect(result[0].folder).toBe('プリセット/分析');
      test.expect(result[1].folder).toBe('プリセット/翻訳');
      test.expect(result[2].folder).toBe('カスタム/開発');
    });

    test.it('should handle Japanese characters correctly', () => {
      const result = csvManager._parseCSVContent(TestData.valid.japanese);
      test.expect(result).toHaveLength(3);
      test.expect(result[0].title).toBe('要約作成');
      test.expect(result[1].title).toBe('文章校正');
      test.expect(result[2].title).toBe('特殊文字');
    });

    test.it('should handle empty CSV', () => {
      test.expect(() => {
        csvManager._parseCSVContent(TestData.valid.empty);
      }).toThrow('インポート可能なメニューが見つかりません');
    });
  });

  // ============ 不正データのテスト ============
  test.describe('Invalid Data Handling Tests', () => {
    
    test.it('should handle missing header gracefully', () => {
      test.expect(() => {
        csvManager._parseCSVContent(TestData.invalid.noHeader);
      }).toThrow('インポート可能なメニューが見つかりません');
    });

    test.it('should skip rows with missing title', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.missingTitle);
      test.expect(result).toHaveLength(0);
    });

    test.it('should skip rows with missing prompt', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.missingPrompt);
      test.expect(result).toHaveLength(0);
    });

    test.it('should handle insufficient fields', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.insufficientFields);
      test.expect(result).toHaveLength(1); // 正常な行のみ
      test.expect(result[0].title).toBe('翻訳');
    });

    test.it('should handle malformed quotes', () => {
      // 不正なクォートは解析エラーを起こす可能性があるが、
      // 堅牢性のためにエラーを捕捉して警告するべき
      const result = csvManager._parseCSVContent(TestData.invalid.malformedQuotes);
      // 結果は実装に依存するが、少なくともクラッシュしないべき
      test.expect(result).toBeInstanceOf(Array);
    });

    test.it('should handle invalid context values', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.invalidContext);
      test.expect(result).toHaveLength(1);
      test.expect(result[0].context).toBe('invalid_context'); // そのまま保持
    });

    test.it('should handle extremely long data', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.extremelyLong);
      test.expect(result).toHaveLength(1);
      test.expect(result[0].prompt.length).toBeGreaterThan(9000);
    });

    test.it('should handle empty lines', () => {
      const result = csvManager._parseCSVContent(TestData.invalid.withEmptyLines);
      test.expect(result).toHaveLength(2);
      test.expect(result[0].title).toBe('サマリ');
      test.expect(result[1].title).toBe('翻訳');
    });

    test.it('should handle potential security issues', () => {
      const sqlResult = csvManager._parseCSVContent(TestData.invalid.sqlInjection);
      test.expect(sqlResult).toHaveLength(1);
      test.expect(sqlResult[0].folder).toContain('DROP TABLE');
      
      const xssResult = csvManager._parseCSVContent(TestData.invalid.xss);
      test.expect(xssResult).toHaveLength(1);
      test.expect(xssResult[0].folder).toContain('<script>');
    });
  });

  // ============ CSV行解析のテスト ============
  test.describe('CSV Line Parsing Tests', () => {
    
    test.it('should parse simple CSV line', () => {
      const result = csvManager._parseCSVLine('a,b,c,d');
      test.expect(result).toEqual(['a', 'b', 'c', 'd']);
    });

    test.it('should parse quoted CSV line', () => {
      const result = csvManager._parseCSVLine('a,"b,c",d');
      test.expect(result).toEqual(['a', 'b,c', 'd']);
    });

    test.it('should parse escaped quotes', () => {
      const result = csvManager._parseCSVLine('a,"b""c",d');
      test.expect(result).toEqual(['a', 'b"c', 'd']);
    });

    test.it('should handle empty fields', () => {
      const result = csvManager._parseCSVLine('a,,c,');
      test.expect(result).toEqual(['a', '', 'c', '']);
    });

    test.it('should handle newlines in quotes', () => {
      const result = csvManager._parseCSVLine('a,"b\nc",d');
      test.expect(result).toEqual(['a', 'b\nc', 'd']);
    });

    test.it('should handle complex quoting', () => {
      const result = csvManager._parseCSVLine('"a,b","c""d""","e,f"');
      test.expect(result).toEqual(['a,b', 'c"d"', 'e,f']);
    });
  });

  // ============ エクスポート機能のテスト ============
  test.describe('Export Functionality Tests', () => {
    
    test.it('should extract menus from basic structure', () => {
      const result = csvManager._extractMenusFromStructure(TestData.menuStructure.basic);
      test.expect(result).toHaveLength(1);
      test.expect(result[0].folder).toBe('テストフォルダ');
      test.expect(result[0].title).toBe('既存メニュー');
    });

    test.it('should extract menus from complex structure', () => {
      const result = csvManager._extractMenusFromStructure(TestData.menuStructure.complex);
      test.expect(result).toHaveLength(2);
      test.expect(result[0].folder).toBe('プリセット');
      test.expect(result[0].title).toBe('サマリ');
      test.expect(result[1].folder).toBe('プリセット');
      test.expect(result[1].title).toBe('翻訳');
    });

    test.it('should handle empty structure', () => {
      const result = csvManager._extractMenusFromStructure(TestData.menuStructure.empty);
      test.expect(result).toHaveLength(0);
    });

    test.it('should escape CSV fields correctly', () => {
      const simple = csvManager._escapeCSVField('simple');
      test.expect(simple).toBe('simple');
      
      const withComma = csvManager._escapeCSVField('hello,world');
      test.expect(withComma).toBe('"hello,world"');
      
      const withQuote = csvManager._escapeCSVField('hello"world');
      test.expect(withQuote).toBe('"hello""world"');
      
      const withNewline = csvManager._escapeCSVField('hello\nworld');
      test.expect(withNewline).toBe('"hello\nworld"');
    });

    test.it('should generate proper CSV content', () => {
      const testData = [
        { folder: 'プリセット', title: 'サマリ', prompt: 'テストプロンプト', context: 'both' }
      ];
      const result = csvManager._generateCSVContent(testData);
      test.expect(result).toContain('フォルダ,タイトル,プロンプト,適用範囲');
      test.expect(result).toContain('プリセット,サマリ,テストプロンプト,both');
    });
  });

  // ============ インポート統合のテスト ============
  test.describe('Import Integration Tests', () => {
    
    test.it('should integrate menus into existing structure', () => {
      const menuStructure = JSON.parse(JSON.stringify(TestData.menuStructure.basic));
      const importedMenus = [
        { folder: 'テストフォルダ', title: '新規メニュー', prompt: '新規プロンプト', context: 'both' }
      ];
      
      const result = csvManager.integrateMenus(menuStructure, importedMenus);
      test.expect(result.success).toBe(true);
      test.expect(result.count).toBe(1);
      
      const targetFolder = menuStructure.find(f => f.name === 'テストフォルダ');
      test.expect(targetFolder.items).toHaveLength(2);
      test.expect(targetFolder.items[1].title).toBe('新規メニュー');
    });

    test.it('should create new folder when needed', () => {
      const menuStructure = JSON.parse(JSON.stringify(TestData.menuStructure.basic));
      const importedMenus = [
        { folder: '新規フォルダ', title: '新規メニュー', prompt: '新規プロンプト', context: 'both' }
      ];
      
      const result = csvManager.integrateMenus(menuStructure, importedMenus, {
        targetFolderName: '新規フォルダ',
        createNewFolder: true
      });
      
      test.expect(result.success).toBe(true);
      test.expect(result.count).toBe(1);
      test.expect(menuStructure).toHaveLength(2);
      
      const newFolder = menuStructure.find(f => f.name === '新規フォルダ');
      test.expect(newFolder).toBeTruthy();
      test.expect(newFolder.items).toHaveLength(1);
    });

    test.it('should handle duplicate menus', () => {
      const menuStructure = JSON.parse(JSON.stringify(TestData.menuStructure.basic));
      const importedMenus = [
        { folder: 'テストフォルダ', title: '既存メニュー', prompt: '重複プロンプト', context: 'both' }
      ];
      
      const result = csvManager.integrateMenus(menuStructure, importedMenus, {
        targetFolderName: 'テストフォルダ',
        overwriteExisting: false
      });
      
      test.expect(result.success).toBe(true);
      test.expect(result.count).toBe(0); // 重複のためスキップ
      
      const targetFolder = menuStructure.find(f => f.name === 'テストフォルダ');
      test.expect(targetFolder.items).toHaveLength(1); // 元のまま
    });

    test.it('should handle large import data', () => {
      const menuStructure = JSON.parse(JSON.stringify(TestData.menuStructure.basic));
      const importedMenus = [];
      
      for (let i = 0; i < 1000; i++) {
        importedMenus.push({
          folder: 'テストフォルダ',
          title: `メニュー${i}`,
          prompt: `プロンプト${i}`,
          context: 'both'
        });
      }
      
      const result = csvManager.integrateMenus(menuStructure, importedMenus);
      test.expect(result.success).toBe(true);
      test.expect(result.count).toBe(1000);
    });
  });

  // ============ エラーハンドリングのテスト ============
  test.describe('Error Handling Tests', () => {
    
    test.it('should handle file read errors', async () => {
      const mockFile = mock.createMockFile('invalid content');
      
      // FileReaderのエラーをシミュレート
      const originalFileReader = window.FileReader;
      window.FileReader = function() {
        return mock.createMockFileReader('', true);
      };
      
      try {
        const result = await csvManager.importFromCSV(mockFile);
        test.expect(result.success).toBe(false);
        test.expect(result.error).toContain('読み込みに失敗');
      } finally {
        window.FileReader = originalFileReader;
      }
    });

    test.it('should handle invalid file types', async () => {
      const mockFile = mock.createMockFile('test content', 'test.txt', 'text/plain');
      
      // ファイルタイプの検証は実装に依存するが、
      // 少なくともエラーを適切に処理するべき
      const result = await csvManager.importFromCSV(mockFile);
      // 結果は実装に依存するが、クラッシュしないべき
      test.expect(result).toBeInstanceOf(Object);
    });

    test.it('should handle memory issues with large files', async () => {
      const largeContent = 'a,b,c,d\n'.repeat(100000);
      const mockFile = mock.createMockFile(largeContent);
      
      const result = await csvManager.importFromCSV(mockFile);
      // 大きなファイルでもクラッシュしないべき
      test.expect(result).toBeInstanceOf(Object);
    });
  });

  // ============ パフォーマンステスト ============
  test.describe('Performance Tests', () => {
    
    test.it('should handle large CSV parsing efficiently', () => {
      const start = performance.now();
      csvManager._parseCSVContent(TestData.edge.largeData);
      const end = performance.now();
      
      // 1000行の処理が1秒以内に完了することを確認
      test.expect(end - start).toBeLessThan(1000);
    });

    test.it('should handle deep folder hierarchies', () => {
      const result = csvManager._parseCSVContent(TestData.edge.deepPath);
      test.expect(result).toHaveLength(1);
      test.expect(result[0].folder).toBe('a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z');
    });
  });

  // ============ 統合テスト ============
  test.describe('Integration Tests', () => {
    
    test.it('should perform complete export-import cycle', () => {
      // エクスポート
      const originalStructure = JSON.parse(JSON.stringify(TestData.menuStructure.complex));
      const exportResult = csvManager.exportToCSV(originalStructure);
      test.expect(exportResult.success).toBe(true);
      
      // インポート（実際のファイルダウンロード/アップロードはモック）
      const extractedMenus = csvManager._extractMenusFromStructure(originalStructure);
      const importedMenus = extractedMenus.map(menu => ({
        folder: menu.folder,
        title: menu.title + '_imported',
        prompt: menu.prompt,
        context: menu.context
      }));
      
      const newStructure = [];
      const importResult = csvManager.integrateMenus(newStructure, importedMenus);
      test.expect(importResult.success).toBe(true);
      test.expect(importResult.count).toBe(extractedMenus.length);
    });
  });

  // テストの実行
  return test.run();
}

// 実行
if (typeof window !== 'undefined') {
  // ブラウザ環境
  window.runCSVManagerTests = runCSVManagerTests;
} else {
  // Node.js環境
  runCSVManagerTests();
}