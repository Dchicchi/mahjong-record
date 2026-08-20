> 対象バージョン: v1.0

# GitHub Pages 公開手順

1. GitHubで新しいリポジトリを作る（例: `mahjong-record`）。
2. このフォルダの中身をリポジトリ直下へアップロードする。
3. GitHubの `Settings` → `Pages` を開く。
4. `Build and deployment` の Source を `Deploy from a branch` にする。
5. Branch を `main`、Folder を `/(root)` にして Save。
6. 表示された公開URLをiPhoneのSafariで開く。
7. Safariの共有 → `ホーム画面に追加`。

## 更新時
コードをGitHubへ上書きするとGitHub Pagesも更新されます。Service Workerのキャッシュ名はバージョン変更時に更新してください。

## データ保護
公開先を変えたり、ブラウザデータを消す前には、設定 → バックアップ → `バックアップを書き出す` を実行してください。
