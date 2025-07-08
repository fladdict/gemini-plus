# Gemini+ Chrome Extension

右クリックから色々geminiを使えるパワフルなChrome拡張機能です。選択したテキストやWebページをGeminiで処理できます。

## 概要

最新のChrome Extension Manifest V3仕様（2025年対応）に準拠したサンプル拡張機能です。

## 主な特徴

- **Manifest V3対応**: 最新のChrome Extension仕様
- **Service Worker**: バックグラウンドページの代わりにService Workerを使用
- **セキュリティ強化**: リモートコード実行の制限とセキュリティ向上
- **パフォーマンス最適化**: 必要時のみ実行されるリソース効率的な設計

## プロジェクト構成

```
gemini-plus/
├── CLAUDE.md          # Claude Code用の設定
├── README.md          # このファイル
├── documents/         # 設計ドキュメント
│   ├── 基本設計.md
│   └── 新規カスタムメニューの仕様.md
└── extension/         # Chrome拡張機能本体
    ├── manifest.json  # 拡張機能の設定ファイル
    ├── background.js  # Service Worker（バックグラウンド処理）
    ├── popup.html     # ポップアップUI
    ├── popup.js       # ポップアップの動作
    ├── content.js     # Webページに注入されるスクリプト
    ├── gemini-content.js # Geminiページ専用スクリプト
    ├── presets/       # プリセットメニュー定義
    │   └── default-menus.json # 初期メニュー構造
    └── icons/         # 拡張機能のアイコン
```

## 主な機能

### 右クリックメニュー
- **サマリ**: ページ全体の要約
- **翻訳**: ページの日本語翻訳
- **FAQ作成**: よくある質問と回答を生成
- **ファクトチェック**: 情報の正確性を検証
- **選択範囲の処理**: テキスト選択時に各機能を実行

### カスタムメニュー管理
- ツリー構造でメニューを整理
- フォルダによるグループ化
- ドラッグ&ドロップで並び替え
- テンプレート変数: `{$URL}`, `{$TITLE}`, `{$TEXT}`
- 分割線でメニューを区切り

### 変数システム
- `{$URL}`: ページのURL
- `{$TITLE}`: ページのタイトル
- `{$TEXT}`: 選択テキストまたはページ全文

## インストール方法

1. Chrome の拡張機能管理ページを開く（`chrome://extensions/`）
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `extension`フォルダを選択

## 設定可能な権限

現在の設定:
- `activeTab`: アクティブなタブへのアクセス
- `storage`: データの保存

## 開発

### ディレクトリ構成
- `extension/`: 拡張機能の本体ファイル
- `documents/`: 設計ドキュメント
- `CLAUDE.md`: Claude Code用の設定

### 開発時の注意
- 拡張機能の変更後は「再読み込み」が必要
- `extension`フォルダ内のファイルのみが拡張機能に含まれる
- ルートフォルダには開発用ファイルを配置

## カスタマイズ

### 初期メニューのカスタマイズ
`extension/presets/default-menus.json`を編集して初期メニューを変更:

```json
[
  {
    "id": "preset-folder",
    "type": "folder",
    "name": "プリセット",
    "description": "事前定義されたメニュー",
    "expanded": true,
    "items": [
      {
        "id": "preset-summary",
        "type": "menu",
        "title": "サマリ",
        "prompt": "以下のページをサマリしてください：\\n\\nタイトル: {$TITLE}\\nURL: {$URL}\\n\\nページの内容をサマリしてください。",
        "context": "both"
      }
    ]
  }
]
```

新しいプリセットメニューを追加したり、既存のプロンプトを変更することで、初期メニューを簡単にカスタマイズできます。

### アイコンの追加
`icons/`フォルダに以下のサイズのアイコンを追加:
- 16x16px: `icon16.png`
- 48x48px: `icon48.png`
- 128x128px: `icon128.png`

### 権限の変更
`manifest.json`の`permissions`配列を編集して必要な権限を追加

### Content Scriptのカスタマイズ
`content.js`を編集してWebページでの動作を変更

## 参考リンク

- [Chrome Extensions - Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference)
