## ファイル定義
- condition.csv
  - 精度評価の条件（評価データなど）を記録
- confution_matrix_${timestamp}.png
  - 困り事（質問）メッセージ判別結果の混同行列
- report_${timestamp}.txt
  - f1スコアなどの評価結果

## Usage
```
# https://platform.openai.com/account/api-keys から APIキーを取得
export OPENAI_API_KEY=${API KEY}
PYTHONPATH=./ python scripts/evaluate_issue_classifier.py
```
