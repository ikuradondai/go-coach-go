# 囲碁判断コーチ Webアプリ設計書 v1.0

作成日: 2026年8月23日  
対象文書: `igo_training_app_concept_v1.md`  
ステータス: MVP実装判断用

---

## 1. 結論

最初のMVPは、**5級〜初段を対象とした「石の強弱を見抜く訓練」**に絞る。

ユーザーにいきなり最善手を選ばせるのではなく、次の順序で認識を回答させる。

1. 弱い石を盤上で選ぶ
2. 自分と相手のどちらが弱いかを比較する
3. そう判断した根拠を選ぶ
4. 最後に、必要な場合だけ方針または一手を選ぶ

MVPの教材は人間が作成・監修し、KataGoの解析を根拠データとして添える。KataGoやLLMに問題・解説を完全自動生成させない。これにより、プロダクトの生命線である「納得できる言語化」を守りながら、小さく検証できる。

技術構成は、**Next.js + TypeScriptのWebアプリ、Python API、PostgreSQL、KataGo解析ワーカー**からなるモジュラーモノリスを推奨する。最初からマイクロサービス化はしないが、GPUを使う解析ワーカーだけはWeb APIプロセスから分離する。

---

## 2. MVPで検証する仮説

### 2.1 最重要仮説

「最善手を教えられる」ことよりも、**自分が何を見落としたかを言葉で理解できること**に、既存の囲碁学習サービスとは異なる継続価値がある。

### 2.2 検証指標

| 仮説 | 指標 | MVPでの目安 |
|---|---|---|
| 認識問題は理解しやすい | 初回診断完了率 | 70%以上 |
| 解説に納得感がある | 「理解できた」回答率 | 75%以上 |
| 診断が本人に刺さる | 「自分に当てはまる」回答率 | 60%以上 |
| 継続価値がある | 7日以内の再訪率 | 25%以上 |
| 訓練で認識が改善する | 同一テーマの初回と再テストの正答率差 | +15ポイント以上 |

### 2.3 MVPで扱わないもの

- オンライン対局
- 完全自動の棋譜解説
- 第3層「大局観」の網羅
- 入門者向けルール講座
- 対局サーバーとのリアルタイム連携
- AIとの対局
- 有料課金
- SNS・ランキング・対人機能

これらは仮説検証に必要なく、KataGoの運用費、囲碁ルール実装、コミュニティ運営という別の難しさを持ち込むため、後続フェーズに置く。

---

## 3. 対象ユーザー

### プライマリーペルソナ

- 棋力: 5級〜初段
- 既に詰碁やAI検討を使っている
- AIが示す手を見ても「なぜそこなのか」が分からない
- 地を囲う手を優先し、弱い石への手入れが遅れやすい
- 1回5〜10分の練習をスマートフォンまたはPCで行う

### 初期対象を第2層にする理由

第1層の生死・終局は市場が広い一方、ルール説明や死活判定まで含む別プロダクトに近くなる。第2層の強弱は、コンセプト文書にある独自価値が最も強く、既存AI検討との差が伝わりやすい。また、教材を人手で監修する場合も問題範囲を制御しやすい。

---

## 4. 体験設計

### 4.1 初回体験

1. LPで「最善手ではなく、判断の癖を見つける」と約束する
2. 棋力を選ぶ（自己申告）
3. 12問の診断を受ける
4. 直後に暫定診断を表示する
5. 弱点に対応した3問の短い復習を行う
6. 結果保存の段階でアカウント作成を案内する

ログインを先に要求しない。匿名セッションで開始し、診断終了時に引き継げるようにする。

### 4.2 1問の基本フロー

#### ステップA: 認識

盤面と問いだけを表示する。

例: 「黒と白のうち、今より弱い一団をタップしてください」

#### ステップB: 根拠

盤上で選んだ後、判断根拠を選ばせる。

- 眼を作る場所がない
- 逃げた先に味方がいない
- 石数が少ない
- 相手の勢力圏にいる

ここで「偶然正しい一団を選んだ」ケースと「正しい基準で選んだ」ケースを分離する。

#### ステップC: フィードバック

最初に結論を1文で出す。

> 白の一団のほうが弱いです。石数ではなく、生きる手段の数を比べます。

続いて盤上に最大3つの注釈を段階表示する。

1. 眼または眼形候補
2. 逃げ道・連絡先
3. 相手側との比較

評価値・勝率・目差は「詳しく見る」の中に隠す。主役は判断基準であり、数値ではない。

#### ステップD: 転用

短いチェック質問を1つ出す。

例: 「黒石が3子、白石が2子でも、白に眼と逃げ道があればどちらが弱い？」

単なる解説閲覧で終わらせず、その場で判断手続きを再実行させる。

### 4.3 問題タイプ

| 種類 | ユーザー操作 | 測るもの |
|---|---|---|
| `select_group` | 一団をタップ | 弱石を発見できるか |
| `compare_groups` | A/B/同程度から選択 | 相対的な強弱判断 |
| `select_evidence` | 根拠を複数選択 | 判断手続きを理解しているか |
| `urgent_or_large` | 急場/大場を選択 | 強弱を優先順位へ接続できるか |
| `choose_plan` | 方針を選択 | 認識から構想へ進めるか |
| `choose_move` | 候補手を盤上で選択 | 方針の実現手段を選べるか |

MVPの出題比率は、上から順に35%、25%、25%、10%、5%、0%とする。最善手選択は教材品質が安定した後に追加する。

---

## 5. 画面構成

### 5.1 必須画面

| 画面 | 主な要素 |
|---|---|
| ランディング | 価値提案、デモ問題、診断開始 |
| オンボーディング | 棋力、対局頻度、学習上の悩み |
| 診断/練習 | 盤面、問い、回答UI、進捗 |
| 解説 | 結論、盤上注釈、判断手続き、転用問題 |
| 診断結果 | 強み、弱点、誤り傾向、次の3問 |
| ホーム | 今日の練習、継続日数、最近の変化 |
| 傾向レポート | 判断軸ごとの精度と十分なデータ量の表示 |
| 教材管理 | SGF取込、局面選択、正解・根拠・注釈、公開 |

### 5.2 練習画面のレイアウト

PCでは左に盤面、右に設問と回答を置く。スマートフォンでは盤面を上、設問を下に置く。19路盤は画面幅に合わせ、部分局面では関連範囲へズームする。

盤上表現は色だけに依存しない。

- 選択対象: 輪郭線
- 正解グループ: 太い実線
- 比較対象: A/Bラベル
- 逃げ道: 矢印
- 眼形候補: 半透明パターン
- 最終所有予測: 詳細表示のみの薄いヒートマップ

---

## 6. コーチングモデル

### 6.1 診断タグ

各設問は1つ以上の観察タグを持つ。

| タグ | 意味 |
|---|---|
| `own_group_overestimate` | 自分の石を実際より強く見る |
| `opponent_weakness_miss` | 相手の弱石を見落とす |
| `stone_count_bias` | 石数を強さと混同する |
| `connected_means_safe` | 連結を安全と誤認する |
| `eye_space_miss` | 眼形・眼形余地を見落とす |
| `escape_route_miss` | 逃げ道・連絡先を見落とす |
| `local_context_bias` | 周辺の厚みを含めず局所だけで見る |
| `territory_first_bias` | 弱石より地を優先する |
| `urgency_miss` | 急場と大場を取り違える |

### 6.2 回答イベント

正誤だけでなく、次を記録する。

- 選択した一団・選択肢
- 選んだ根拠
- 回答時間
- ヒント使用
- 初回回答か再回答か
- 解説のどこまで開いたか
- 解説への納得度
- 同一概念の転用問題の成否

### 6.3 暫定スコア

タグごとにBeta分布を持つ簡単なベイズ推定を使う。

- 初期値: `Beta(2, 2)`
- 正答: `alpha += difficulty_weight`
- 誤答: `beta += difficulty_weight`
- 推定習熟度: `alpha / (alpha + beta)`
- 信頼度: 回答数と問題の多様性から別に表示

3問しか回答していない項目を断定しない。「弱点」ではなく「弱点の可能性」と表示し、8問以上かつ複数局面カテゴリで再現した段階で傾向として扱う。

### 6.4 問題選択

最初は複雑な機械学習を使わず、次の優先度で選ぶ。

1. 未回答の診断問題
2. 信頼度が低い弱点候補
3. 習熟度が低いタグ
4. 前回誤答から1日・3日・7日後の再テスト
5. 得意分野を20%混ぜる

---

## 7. 教材と正解データの設計

### 7.1 重要な設計原則

KataGoは推奨手、目差、所有予測、policy、principal variationなどを返せるが、「どの一団が教育上弱いか」「なぜ5級が誤るか」をそのまま返すわけではない。そのため、教材の正解は次の三層で管理する。

1. **人間が定義した教育意図**: 問い、正解、誤答理由、転用原則
2. **盤面から計算できる事実**: 一団、呼吸点、連結、盤端距離、候補逃走先
3. **KataGoの解析証拠**: score lead、ownership、policy、候補手、変化図

解説文は1を中心に生成し、2と3で矛盾を検査する。

### 7.2 教材ソース

MVPでは以下の順で使う。

1. オリジナルの人工局面
2. 許諾を確認できる自分の棋譜
3. ユーザーがアップロードした自分の棋譜（本人だけに表示）
4. ライセンスまたは利用条件が明確な公開棋譜

出典不明のプロ棋譜を教材へ恒久収録しない。棋譜自体の権利・データベース利用条件は国や配布元により扱いが異なるため、公開教材には出典と利用根拠を記録する。

### 7.3 教材作成ワークフロー

1. 管理者がSGFをアップロードする
2. ゲームツリーから対象局面を選ぶ
3. システムが盤上の連結成分と呼吸点を計算する
4. KataGoで対象局面と候補変化を事前解析する
5. 管理者が対象グループ、正解、誤答タグを指定する
6. 解説テンプレートを選び、盤上注釈を置く
7. 自動検査を実行する
8. 別の監修者がレビューする
9. バージョンを固定して公開する

### 7.4 自動検査

- 正解として選んだ一団が局面に存在する
- 一団IDが盤面再計算後も同じ石集合を表す
- 必須の根拠が1つ以上ある
- KataGoの解析結果が指定閾値以上で安定している
- 盤面対称変換後に評価が大きく変わらない
- 候補手の説明と変化図が一致する
- 公開問題に出典・ライセンス情報がある

---

## 8. システム構成

### 8.1 推奨アーキテクチャ

```text
Browser
  │ HTTPS / JSON
  ▼
Next.js Web App
  │
  ▼
Python API (FastAPI)
  ├── PostgreSQL: users, exercises, attempts, profiles
  ├── Object Storage: SGF, analysis artifacts
  ├── Redis: queue, cache, rate limit
  └── Job Queue
         │
         ▼
      Analysis Worker
         ├── KataGo long-running process
         └── normal model + human SL model
```

### 8.2 なぜこの分割か

- UIと通常APIは安価なCPU環境で動かせる
- KataGoだけをGPUホストへ配置できる
- 教材は事前解析済みなので、通常の練習はGPU障害の影響を受けない
- SGF処理・KataGo公式サンプルとの親和性から、解析側はPythonが扱いやすい
- 初期は1つのリポジトリと1つのDBで運用できる

### 8.3 フロントエンド

- Next.js + React + TypeScript
- 盤面: `@sabaki/shudan`
- SGF: `@sabaki/sgf`
- API状態: TanStack Query相当
- UI状態: React stateまたは小さなstore
- フォーム・スキーマ: Zod相当
- テスト: Vitest + Testing Library + Playwright

ShudanはSabakiで使われている低レベル盤コンポーネントで、Reactでも利用でき、MITライセンスである。盤面ルールやゲームツリーはShudanへ任せず、自分たちのドメイン層で管理する。

### 8.4 バックエンド

- FastAPI + Python
- SQLAlchemy + Alembic相当
- PostgreSQL
- Redis + ジョブキュー
- PydanticでAPIとKataGoレスポンスを検証
- OpenTelemetry互換のトレース

### 8.5 KataGo連携

KataGoのJSON Analysis Engineを長時間起動し、stdinへ1行JSONを送り、stdoutから非同期に結果を受け取る。HTTPごとにKataGoを起動してはいけない。

KataGoの解析APIは複数局面をバッチし、結果がリクエスト順とは異なる順序で返る。そのため、ワーカーは必ずKataGo query IDと内部job IDの対応表を持つ。

教材生成時に主に取得する値:

- `moveInfos`
- `rootInfo.scoreLead`
- `ownership`
- `policy`
- `humanPolicy`
- `pv`
- `visits`

人間SLモデルは、指定棋力の人間が選びやすい着手を予測できる。これを「典型的な誤答候補」の発見に使う。ただし、人間らしいことは教育的に適切であることを意味しないので、自動公開には使わない。

### 8.6 LLMの位置づけ

MVPではLLMは必須にしない。解説は監修済みテンプレートと構造化データから生成する。

後からLLMを使う場合も、役割は以下に限定する。

- 同じ根拠の難易度別・言語別の言い換え
- 長い監修文の短文化
- ユーザーの質問に対する、検証済み事実の説明

LLMに正解手、石の生死、数値、変化図を独自判断させない。入力には監修済みのfactsだけを与え、出力には参照したfact IDを要求する。

---

## 9. データモデル

### 9.1 主要テーブル

#### `users`

- `id`
- `email`（nullable。匿名時は未設定）
- `locale`
- `self_reported_rank`
- `created_at`

#### `game_records`

- `id`
- `owner_user_id`（教材用ならnullable）
- `sgf_object_key`
- `source_type`
- `source_url`
- `license_note`
- `sha256`

#### `positions`

- `id`
- `game_record_id`
- `move_number`
- `board_size`
- `rules`
- `komi`
- `to_play`
- `stones_json`
- `position_hash`

#### `group_annotations`

- `id`
- `position_id`
- `color`
- `vertices_json`
- `label`
- `computed_liberties`
- `eye_status`
- `escape_status`

一団を座標1点だけで参照せず、石集合を保存する。局面の編集によって意味がずれるのを防ぐ。

#### `exercises`

- `id`
- `position_id`
- `type`
- `prompt_i18n_json`
- `difficulty`
- `status` (`draft`, `review`, `published`, `retired`)
- `version`
- `published_at`

#### `exercise_options`

- `id`
- `exercise_id`
- `option_type`
- `payload_json`
- `is_correct`
- `diagnostic_tags_json`
- `feedback_i18n_json`

#### `explanations`

- `exercise_id`
- `conclusion_i18n_json`
- `principle_i18n_json`
- `board_marks_json`
- `engine_fact_refs_json`
- `reviewed_by`
- `reviewed_at`

#### `engine_analyses`

- `id`
- `position_id`
- `engine_version`
- `model_sha256`
- `human_model_sha256`
- `config_sha256`
- `visits`
- `result_object_key`
- `summary_json`
- `created_at`

エンジン、モデル、設定、visitsを必ず保存し、解析結果を再現可能にする。

#### `attempts`

- `id`
- `user_id`または`anonymous_session_id`
- `exercise_id`
- `exercise_version`
- `selected_answer_json`
- `reason_answer_json`
- `is_correct`
- `response_ms`
- `hint_level`
- `created_at`

#### `skill_estimates`

- `user_id`
- `diagnostic_tag`
- `alpha`
- `beta`
- `sample_count`
- `context_diversity`
- `updated_at`

---

## 10. API設計

### 学習用

```text
POST   /v1/anonymous-sessions
GET    /v1/training/next?mode=diagnostic
GET    /v1/exercises/{exerciseId}
POST   /v1/exercises/{exerciseId}/attempts
GET    /v1/attempts/{attemptId}/feedback
POST   /v1/attempts/{attemptId}/feedback-rating
GET    /v1/me/coach-report
GET    /v1/me/training-plan
```

正解は問題取得レスポンスに含めない。回答後のfeedback APIで返す。

### 棋譜・教材管理用

```text
POST   /v1/admin/game-records
POST   /v1/admin/game-records/{id}/positions
POST   /v1/admin/positions/{id}/analyses
GET    /v1/admin/analysis-jobs/{jobId}
POST   /v1/admin/exercises
PUT    /v1/admin/exercises/{id}
POST   /v1/admin/exercises/{id}/submit-review
POST   /v1/admin/exercises/{id}/publish
```

解析ジョブは`202 Accepted`とjob IDを返し、ポーリングまたはServer-Sent Eventsで進捗を取得する。

### 回答APIの例

```json
{
  "selectedGroupIds": ["group_white_left"],
  "reasonOptionIds": ["no_eye_space", "no_escape_route"],
  "responseMs": 18420,
  "hintLevel": 0
}
```

### フィードバックAPIの例

```json
{
  "result": "partially_correct",
  "conclusion": "白の一団のほうが弱いです。",
  "principle": "石数ではなく、生きる手段の数を比べます。",
  "missedReasons": ["no_escape_route"],
  "boardMarks": [
    {"type": "outline", "groupId": "group_white_left"},
    {"type": "arrow", "from": "C8", "to": "A8", "style": "blocked"}
  ],
  "profileImpact": [
    {"tag": "escape_route_miss", "evidence": "supporting"}
  ]
}
```

---

## 11. 囲碁ルールと座標の境界

盤面表示、棋譜、KataGoで座標表現が異なるため、ドメイン内部では座標を`{x: 0..18, y: 0..18}`に統一する。

- SGF座標: アダプターで変換
- GTP/KataGo座標: アダプターで変換（I列を飛ばす規則に注意）
- UIラベル: 表示時だけ変換
- パス: nullではなく専用の`pass`型

ルール設定、コミ、手番、盤サイズは局面データの一部として必須にする。同じ石配置でもコウ履歴やルールにより合法手・評価が変わるため、可能な限り手順履歴も保持する。

SGFはFF[4]を標準入出力形式とする。独自の教材情報はDBを正本とし、SGFへ埋め込む場合はコメントまたは明示的に管理した拡張プロパティへエクスポートする。

---

## 12. OSS・外部サービスの採用判断

| 候補 | 用途 | 判断 | 理由・注意 |
|---|---|---|---|
| KataGo | 局面解析 | 採用 | JSON解析エンジン、ownership、score、human SLが使える。MIT系だが同梱依存物のライセンス確認は必要 |
| Shudan | ブラウザ盤面 | 採用候補 | Sabakiの盤面コンポーネント。MIT。Reactでも利用可能 |
| `@sabaki/sgf` | SGF入出力 | 採用候補 | MIT。FF[4]処理を自作するリスクを減らす |
| KaTrain | 教育UXの参考 | コード流用前に精査 | KataGoによるミス可視化・再挑戦UXが参考になる。リポジトリ本体はMITだが同梱素材に個別条件がある |
| OGS Web/Goban | 対局連携 | MVPでは不採用 | OAuth・APIは将来価値があるが、Web本体はAGPL-3.0。コード流用はライセンス境界に注意 |
| WGo.js | 盤面の代替 | 保留 | 軽量だが、まずShudanで注釈要件を検証する |
| 第三者KataGo RESTサーバー | HTTPラッパー | 原則不採用 | 自前の薄いアダプターで足りる。外部実装への依存と解析再現性を増やさない |

参考資料:

- [KataGo公式リポジトリ](https://github.com/lightvector/KataGo)
- [KataGo JSON Analysis Engine仕様](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md)
- [KataGoライセンス](https://github.com/lightvector/KataGo/blob/master/LICENSE)
- [KataGo Human SL設定例](https://github.com/lightvector/KataGo/blob/master/cpp/configs/gtp_human5k_example.cfg)
- [Shudan公式ドキュメント](https://github.com/SabakiHQ/Shudan/blob/master/docs/README.md)
- [Sabaki SGFライブラリ](https://github.com/SabakiHQ/sgf)
- [KaTrain公式リポジトリ](https://github.com/sanderland/katrain)
- [OGS Web公式リポジトリと開発者情報](https://github.com/online-go/online-go.com)
- [SGF FF[4]仕様](https://www.red-bean.com/sgf/sgf4.html)

---

## 13. デプロイ設計

### ローカル開発

Docker Composeで以下を起動する。

- Web
- API
- PostgreSQL
- Redis
- MinIOなどのS3互換ストレージ
- CPU版KataGoワーカー

CPU解析は低visitsの動作確認用とし、教材の本解析はGPU環境で行う。

### 初期本番

- Web/API: 通常のコンテナホスティング
- PostgreSQL: マネージドDB
- Redis: マネージドまたは小規模コンテナ
- SGF/解析結果: S3互換オブジェクトストレージ
- KataGo: 必要時起動できる単一GPUワーカー

通常練習は事前計算済みデータだけを読むため、GPUを常時稼働させなくても成立する。教材作成やユーザー棋譜解析のジョブが溜まった時だけ起動する構成へ移行できる。

### キャッシュ

局面を以下の要素からハッシュし、同じ解析を再利用する。

- 盤面と手順履歴
- 手番
- ルール
- コミ
- KataGoバージョン
- モデルSHA-256
- 設定SHA-256
- visits
- 必要な出力オプション

---

## 14. セキュリティ・プライバシー

- SGFには対局者名やオンラインIDが含まれることがあるため、アップロード時にメタデータ公開範囲を明示する
- ユーザー棋譜は初期設定で非公開にする
- 教材化は別の明示同意を必要とする
- SGFパーサーにファイルサイズ、ノード数、深さ、文字列長の上限を設ける
- KataGoプロセスへユーザー文字列をコマンドラインとして渡さず、検証済みJSONだけをstdinへ送る
- 管理APIは一般ユーザーAPIと権限を分ける
- メールを登録しない匿名利用者にも削除用トークンを発行する
- 回答ログの分析利用と、外部モデルへの送信を分離して同意管理する

---

## 15. テスト戦略

### 囲碁ドメイン

- 石の連結、呼吸点、取り、コウ、合法手
- SGFと内部座標の往復変換
- GTP座標と内部座標の往復変換
- 盤面の回転・反転でgroup annotationが保存されること
- 既知局面のスナップショット

### KataGo連携

- query IDの多重化と順不同レスポンス
- タイムアウト、プロセス再起動、壊れたJSON行
- モデル・設定ハッシュの記録
- 固定局面での許容幅を持った回帰テスト

### 教育UX

- 正解を先にクライアントへ送らない
- タップ可能領域と表示上の一団が一致する
- 色覚に依存せず注釈を識別できる
- 320px幅でも19路盤と回答操作が成立する
- キーボードだけでも回答できる

---

## 16. 実装ロードマップ

### Sprint 0: 技術スパイク（1週間）

- Shudanで19路盤、グループ選択、輪郭・矢印を描けるか検証
- PythonからKataGo JSON Analysis Engineを常駐起動
- 1局面についてownership、score lead、humanPolicyを保存
- SGF → 内部局面 → SGFの往復テスト

**終了条件:** 1つの手作り問題をブラウザで回答し、監修済み解説とKataGo根拠を表示できる。

### Sprint 1: 学習ループ（2週間）

- 匿名セッション
- 問題取得、回答、解説、転用問題
- `select_group`、`compare_groups`、`select_evidence`
- 回答イベント保存
- スマートフォン対応

### Sprint 2: 診断（2週間）

- 診断タグとBetaスコア
- 12問診断
- 暫定コーチレポート
- 弱点別の次の3問

### Sprint 3: 教材管理（2週間）

- SGFアップロード
- 局面・一団選択
- KataGo解析ジョブ
- 問題・解説・注釈編集
- レビュー・公開フロー

### Sprint 4: クローズド検証（1週間）

- 30〜60問を用意
- 5級〜初段の10〜20人でテスト
- 正答率ではなく、解説納得度と診断の刺さり方を確認
- 誤解される文言と盤上注釈を修正

合計8週間を、1〜2名の開発者と囲碁教材監修者1名の最小体制の目安とする。教材監修は開発と並行して進める。

---

## 17. 次フェーズ

### Phase 2: 自分の棋譜から弱点を見つける

ユーザーがSGFをアップロードし、KataGoで大きな損失があった局面と人間SLで選びやすい誤着を抽出する。ただし「点を損した手」をそのまま出題せず、既存の診断タグへ分類できる局面だけを問題化する。

### Phase 3: 大局の二段階設問

「テーマ選択 → 実現手段」の順で問う。テーマ候補の自動生成は難しいため、当初はKataGo候補手を盤上の領域・対象グループへ集約し、人間がテーマ名を付ける。

### Phase 4: 第1層と終局

生・死・未確定の三値判定、死石選択、終局判定を追加する。日本ルールの終局・死活には合意や例外が絡むため、教育上の定義と厳密なルール処理を区別する。

### Phase 5: 外部連携

- OGS OAuthと自分の棋譜取込
- 他サービスからのSGF取込
- 多言語化
- 定期的なコーチレポート

---

## 18. 実装前に確定すべき判断

| 判断 | 推奨初期値 |
|---|---|
| 対象棋力 | 5級〜初段 |
| 初期言語 | 日本語。ただし文言は最初からi18n構造 |
| 盤サイズ | 表示は9/13/19対応、教材は主に19路 |
| ルール | 教材ごとに保持。初期教材は日本ルール相当で統一 |
| 初期教材数 | 診断12問を含む30〜60問 |
| 正解生成 | 人間監修が正本、KataGoは根拠・検査 |
| 初期認証 | 匿名開始、結果保存時にメールまたはOAuth |
| 課金 | MVPでは行わない |
| LLM | MVPの必須依存にしない |
| OGS連携 | Phase 2以降 |

最初の実装判断は、**Sprint 0の技術スパイクを行い、1問の完全な体験を縦に作ること**である。DBや認証を先に作るより、盤上で「弱い一団を選ぶ → 根拠を答える → 注釈付き解説を読む」という独自体験が成立するかを最優先で確かめる。
