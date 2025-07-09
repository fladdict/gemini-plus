// Test Data for CSV Import/Export Testing
// CSVインポート/エクスポートテスト用のテストデータ

const TestData = {
  // 正常なCSVデータ
  valid: {
    basic: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください,both
カスタム,翻訳,以下のテキストを翻訳してください,selection`,

    withQuotes: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,"サマリ, 要約",以下のページをサマリしてください,both
カスタム,"翻訳""機能""",以下のテキストを翻訳してください,selection`,

    multiLine: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,"以下のページをサマリしてください：

タイトル: {$TITLE}
URL: {$URL}",both`,

    hierarchical: `フォルダ,タイトル,プロンプト,適用範囲
プリセット/分析,サマリ,以下のページをサマリしてください,both
プリセット/翻訳,英日翻訳,以下のテキストを日本語に翻訳してください,selection
カスタム/開発,コードレビュー,以下のコードをレビューしてください,selection`,

    japanese: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,要約作成,以下のページを要約してください,both
カスタム,文章校正,以下の文章を校正してください,selection
テスト,特殊文字,＃＆％＠！？,both`,

    empty: `フォルダ,タイトル,プロンプト,適用範囲`
  },

  // 不正なCSVデータ
  invalid: {
    // ヘッダーなし
    noHeader: `プリセット,サマリ,以下のページをサマリしてください,both`,

    // 必須フィールドなし
    missingTitle: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,,以下のページをサマリしてください,both`,

    missingPrompt: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,,both`,

    // フィールド数不足
    insufficientFields: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ
カスタム,翻訳,プロンプト,selection`,

    // 不正なクォート
    malformedQuotes: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,"サマリ,以下のページをサマリしてください,both
カスタム,翻訳",以下のテキストを翻訳してください,selection`,

    // 不正な適用範囲
    invalidContext: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください,invalid_context`,

    // 極端に長いデータ
    extremelyLong: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,"${'あ'.repeat(10000)}",both`,

    // 不正な文字
    invalidChars: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ\x00\x01\x02,以下のページをサマリしてください,both`,

    // 空行混在
    withEmptyLines: `フォルダ,タイトル,プロンプト,適用範囲

プリセット,サマリ,以下のページをサマリしてください,both

カスタム,翻訳,以下のテキストを翻訳してください,selection

`,

    // 不正なエンコーディング風
    encoding: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください,both
カスタム,翻訳,以下のテキストを翻訳してください,selection`,

    // 循環参照風
    circular: `フォルダ,タイトル,プロンプト,適用範囲
A/B/C,サマリ,{$TEXT},both
B/C/A,翻訳,{$TEXT},selection`,

    // SQL injection風
    sqlInjection: `フォルダ,タイトル,プロンプト,適用範囲
'; DROP TABLE menus; --,サマリ,以下のページをサマリしてください,both`,

    // XSS風
    xss: `フォルダ,タイトル,プロンプト,適用範囲
<script>alert('xss')</script>,サマリ,以下のページをサマリしてください,both`
  },

  // エッジケース
  edge: {
    // 単一行
    singleRow: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください,both`,

    // 大量データ
    largeData: (() => {
      let csv = 'フォルダ,タイトル,プロンプト,適用範囲\n';
      for (let i = 0; i < 1000; i++) {
        csv += `フォルダ${i},タイトル${i},プロンプト${i},both\n`;
      }
      return csv;
    })(),

    // 様々な改行文字
    mixedLineBreaks: `フォルダ,タイトル,プロンプト,適用範囲\rプリセット,サマリ,以下のページをサマリしてください,both\r\nカスタム,翻訳,以下のテキストを翻訳してください,selection\n`,

    // Unicode文字
    unicode: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ📊,以下のページをサマリしてください🔍,both
カスタム,翻訳🌐,以下のテキストを翻訳してください✨,selection`,

    // 空のフィールド
    emptyFields: `フォルダ,タイトル,プロンプト,適用範囲
,サマリ,以下のページをサマリしてください,both
プリセット,,以下のページをサマリしてください,both
プリセット,サマリ,,both
プリセット,サマリ,以下のページをサマリしてください,`,

    // 重複データ
    duplicates: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください,both
プリセット,サマリ,以下のページをサマリしてください,both
プリセット,サマリ,異なるプロンプト,both`,

    // 特殊文字
    specialChars: `フォルダ,タイトル,プロンプト,適用範囲
プリセット,サマリ,以下のページをサマリしてください\t\n\r,both
カスタム,翻訳,以下のテキストを翻訳してください"",selection`,

    // 数値のみ
    numericOnly: `フォルダ,タイトル,プロンプト,適用範囲
123,456,789,both`,

    // 非常に長いフォルダパス
    deepPath: `フォルダ,タイトル,プロンプト,適用範囲
a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z,サマリ,以下のページをサマリしてください,both`
  },

  // 期待される結果
  expected: {
    basic: [
      { folder: 'プリセット', title: 'サマリ', prompt: '以下のページをサマリしてください', context: 'both' },
      { folder: 'カスタム', title: '翻訳', prompt: '以下のテキストを翻訳してください', context: 'selection' }
    ],

    withQuotes: [
      { folder: 'プリセット', title: 'サマリ, 要約', prompt: '以下のページをサマリしてください', context: 'both' },
      { folder: 'カスタム', title: '翻訳"機能"', prompt: '以下のテキストを翻訳してください', context: 'selection' }
    ],

    hierarchical: [
      { folder: 'プリセット/分析', title: 'サマリ', prompt: '以下のページをサマリしてください', context: 'both' },
      { folder: 'プリセット/翻訳', title: '英日翻訳', prompt: '以下のテキストを日本語に翻訳してください', context: 'selection' },
      { folder: 'カスタム/開発', title: 'コードレビュー', prompt: '以下のコードをレビューしてください', context: 'selection' }
    ]
  },

  // メニュー構造のテストデータ
  menuStructure: {
    empty: [],
    
    basic: [
      {
        id: 'folder-1',
        type: 'folder',
        name: 'テストフォルダ',
        expanded: true,
        items: [
          {
            id: 'menu-1',
            type: 'menu',
            title: '既存メニュー',
            prompt: '既存のプロンプト',
            context: 'both'
          }
        ]
      }
    ],

    complex: [
      {
        id: 'preset-folder',
        type: 'folder',
        name: 'プリセット',
        expanded: true,
        items: [
          {
            id: 'preset-summary',
            type: 'menu',
            title: 'サマリ',
            prompt: '以下のページをサマリしてください',
            context: 'both'
          },
          {
            id: 'separator-1',
            type: 'separator'
          },
          {
            id: 'preset-translate',
            type: 'menu',
            title: '翻訳',
            prompt: '以下のテキストを翻訳してください',
            context: 'selection'
          }
        ]
      },
      {
        id: 'custom-folder',
        type: 'folder',
        name: 'カスタム',
        expanded: true,
        items: []
      }
    ]
  }
};

// グローバルに公開
if (typeof window !== 'undefined') {
  window.TestData = TestData;
} else if (typeof module !== 'undefined') {
  module.exports = TestData;
}