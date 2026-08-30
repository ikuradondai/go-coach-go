# Modal KataGo service

管理画面専用のKataGo Analysis Engineです。Modal T4で必要時だけ起動し、アイドル60秒でゼロまで縮退します。

MVPの安全設定:

- T4 GPU 1枚
- 最大コンテナ数1
- アイドル60秒で停止
- 1リクエスト最大1,200 visits
- Bearer token必須
- KataGo 1.18.1とb18モデルをイメージへ固定

## 初回デプロイ

```powershell
py -m pip install modal
modal setup
modal secret create go-coach-katago KATAGO_API_TOKEN=<random-token>
modal deploy modal-katago/modal_app.py
```

デプロイ結果のURLと同じtokenを、Sitesの`KATAGO_API_URL`、`KATAGO_API_TOKEN`へ設定します。月間上限は`KATAGO_MONTHLY_JOB_LIMIT`で、MVP既定値は500回です。
