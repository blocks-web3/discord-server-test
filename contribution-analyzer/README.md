## ロジック
- 困りごとメッセージの抽出
  - 抽出精度を算出する
- 困りごとメッセージに関連するメッセージの取得
  - 困りごとメッセージをreferenceしているメッセージを抽出
  - 困りごとメッセージの後ろ10会話を抽出
- 解決に貢献したメッセージを抽出
  - 抽出精度を算出する





## Setup
```
pyenv install 3.11.3
pyenv local 3.11.3
poetry env use python
poetry shell
poetry install
```

## Usage
```
# https://platform.openai.com/account/api-keys から APIキーを取得
export OPENAI_API_KEY=${API KEY}
PYTHONPATH=./ python execute.py
```

## Discordサーバの貢献度の評価観点に関して
- 後述する観点の評価指標に基づいてスコアを算出し、任意の係数で重み付けした合計を貢献度とする。

### メッセージ/リアクション数
- 概要
  - サーバ内での発言数が多いユーザは、一般的には活発にコミュニケーションを行っていると考えられる。ただし、発言の内容も重要なので単に発言回数だけでなく後述の評価観点と組み合わせて貢献度を評価する。
- 評価指標
  - メッセージ投稿回数、リアクション数

### メッセージの質
- 概要
  - ユーザが投稿したメッセージが他のメンバーからの反応を引き出しているかどうかを評価する。
- 評価指標
  - メッセージに対してのリアクション（絵文字など）数、返信数から算出する。


### 参加度
- 概要
  - サーバ内で開催されるイベントやミーティングにどれだけ積極的に参加しているかを評価する。
- 評価指標
  - イベント期間中のステージチャンネル参加回数

### 支援度
- 概要
  - ユーザが他のメンバーの質問に答えたり、新規メンバーを歓迎したり、問題が発生したときに解決を助けたりといった行動をとった場合に評価する。
- 評価指標
  - 他のメンバーの困り事を解決した回数（ChatGPTでQAの会話から困り事を解決したメッセージを抽出する）

### 違反度
- ユーザがサーバのルールを遵守していて、他のユーザを尊重し、健全なコミュニケーションを促進しているかどうかを評価する。
- 違反度が高いとネガティブ評価となる。
- 評価指標
  - 悪意（暴力・差別・アダルトなど）のある表現を使った回数（ChatGPTで悪意のある表現を抽出する）

## 貢献度の評価結果
- 当該システムで分析した結果は以下のフォーマットでファイル出力を行う。
  - ランキング
    - ファイル名：ranking_${rankingId}.json
    - カラム名：後述の概念モデル.ランキング 参照
  - ランキングユーザ詳細
    - ファイル名：user_${userId}_${rankingId}.json
    - カラム名：後述の概念モデル.ランキングユーザ詳細 参照

## 概念モデル
- 貢献度を評価するにあたり以下のデータを用意する。

### マスターデータ
#### ユーザ
- id
- channelJoinDatetime

#### チャンネル
- id
- description

### トランザクションデータ
#### ログイン
- loginAt

#### ログアウト
- logoutAt

#### メッセージ
- id
- channelId
- threadId
- userId
- 投稿日時
- content
- files
- message_reference（messageId, channelId, guildId)
- stickers
- messageType

#### リアクション
- emojiId
- userId
- messageId

### 集計結果

#### ランキング
- id
- rankingId
- userId
- rank
- contributionScore
- messageCount
- reactionCount
- messageQuality
- participationScore
- supportScore
- violationScore

#### ランキングメタデータ
- rankingId
- startDatetime
- endDatetime
- channels

#### ランキングユーザ詳細
※ 支援度算出の要因となったメッセージを記録する
- rankingId
- userId
- contributionMessage
- relatedMessages

## 今後のエンハンス
### コミュニティ活性化をサポートするための機能
- ChatBot
  - 過去のQA（集計結果.QA）をもとにメンバーの困り事を解決するBotを構築する
