# Phase 9 — GitHub Pages / PWA 公開前仕上げ

## 追加内容
- GitHub Pages でそのまま配信できる相対パス構成を維持
- Web App Manifest を追加
- Service Worker を追加し、主要ファイルをオフラインキャッシュ
- iPhone向け `apple-mobile-web-app-*` メタ情報とホーム画面アイコンを追加
- 対応ブラウザ向けインストールボタンを設定画面に追加
- バージョン表記を v0.9 に更新
- 公開前チェックリストを追加

## iPhoneで使う
1. GitHub Pages の公開URLを Safari で開く
2. 共有ボタンを押す
3. 「ホーム画面に追加」を選ぶ
4. 以後はホーム画面の「麻雀記録」から起動

## データについて
日付別記録、ローカル役満、順位、収支は端末ブラウザの localStorage に保存されます。GitHubへコードを更新しても通常は残りますが、ブラウザデータ削除・別端末への変更では移りません。Phase 8のJSONバックアップを併用してください。

## 公開前チェック
- [x] index.html がリポジトリ直下
- [x] すべて相対パス
- [x] manifest.webmanifest あり
- [x] sw.js あり
- [x] PWAアイコンあり
- [x] バックアップ / 復元あり
- [x] 2022〜2025 過去データ同梱
- [ ] GitHubリポジトリ作成
- [ ] GitHub Pages有効化
- [ ] iPhone実機でホーム画面追加・入力テスト
