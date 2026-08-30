# KataGo HTTP bridge

KataGo公式のAnalysis Engine（1行JSONの標準入出力）を、管理画面から呼べるHTTP APIに変換する小さなブリッジです。KataGo本体と学習済みモデルは含みません。

## 起動

KataGoの実行ファイル・モデル・analysis configを用意し、次を設定します。

```powershell
$env:KATAGO_BIN = "C:\katago\katago.exe"
$env:KATAGO_MODEL = "C:\katago\model.bin.gz"
$env:KATAGO_CONFIG = "C:\katago\analysis.cfg"
$env:KATAGO_API_TOKEN = "十分に長いランダム文字列"
npm start
```

公開環境ではGPUホスト上でHTTPSリバースプロキシの内側に置き、Sites側へ次のシークレットを設定します。

- `KATAGO_API_URL`: このサービスのHTTPS URL
- `KATAGO_API_TOKEN`: 上と同じトークン

APIは `GET /health` と `POST /analyze` を提供します。`POST /analyze` の本文・応答はKataGo Analysis Engineの公式JSON形式です。
