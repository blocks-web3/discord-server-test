from app.issue_classifier import IssueClassifier
import pandas as pd
from pathlib import Path


class Analyzer:
    def analyze(self, jsonl_file: Path):
        df = pd.read_json(str(jsonl_file), lines=True)
        issue_classifier = IssueClassifier()
        # TODO issueClassifierをpandasのdataframe対応する or issueClassifierに合わせて型変換する
        issues = issue_classifier.evaluate(df)
        # issuesに紐づくメッセージ群を取得
        # メッセージ群の中で解決に貢献したメッセージを取得
        # 質問文のmessageId, 質問者のuserId, 回答のmessageId, 回答者のuserId, 質問文, 回答

        # 上記出力結果からランキングファイルを出力
        # 上記出力結果からランキングユーザ詳細ファイルを出力
        # フォーマットはREADME.mdの「貢献度の評価結果」参照
