from app.issue_detector import IssueDetector
from app.support_detector import SupportDetector
import pandas as pd
from pathlib import Path
import sys
from pydantic import BaseModel, Field


class SupportScoreCalculator(BaseModel):
    timestamp: str = Field()
    issue_detector: IssueDetector = Field(default=IssueDetector())
    support_detector: SupportDetector = Field(default=SupportDetector())

    def calculate(self, messages: list):
        # メッセージ群からissue（困り事・質問）に関係するメッセージを取得
        issues = self.issue_detector.evaluate(messages)
        if not issues:
            print("no issue exitst")
            sys.exit(0)

        records = []
        for issue_id in issues:
            # idから実際のメッセージを取得
            issue_message = self._get_target_message(messages, issue_id)
            if not issue_message:
                print("targe issue not found")
                continue
            # issueメッセージと関連がありそうなメッセージ群を抽出
            refrences = self._get_reference_messages(messages, issue_id)
            if not refrences:
                print("no refrence message")
                continue
            # メッセージ群の中で解決に貢献したメッセージを取得
            answer_ids = self.support_detector.evaluate(issue_message, refrences)
            for answer_id in answer_ids:
                # idから実際のメッセージを取得
                answer = self._get_target_message(messages, answer_id)
                records.append({"q": issue_message, "a": answer})
        df = self._create_df(records)
        # 質問と回答バインド情報をcsv出力
        self._save_result(df, "qa")
        grouped_df = df.groupby("answer_user_id").agg(support_score=("answer_user_id", "size")).reset_index()
        self._save_result(grouped_df, "support_score")
        return grouped_df

    def _get_target_message(self, message_objects, message_id):
        for obj in message_objects:
            obj_id = obj["id"]
            if obj_id == message_id:
                return obj

    def _get_reference_messages(self, message_objects, issue_id):
        messages = []
        reference_ids = []
        for obj in message_objects:
            referenced_message = obj.get("referenced_message")
            if referenced_message:
                obj_id = obj.get("id")
                parent_id = referenced_message["id"]
                if parent_id == issue_id or parent_id in reference_ids:
                    messages.append(obj)
                    # レコードが生成順にソートされる前提。
                    reference_ids.append(obj_id)
        return messages

    def _create_df(self, records):
        # issue（困り事・質問文）のmessageId, issueメッセージを投稿したuserId, 回答のmessageId, 回答者のuserId, issue文, 回答文をcsvに出力する
        rows = []
        for record in records:
            row = {
                "issue_id": record["q"]["id"],
                "issue_user_id": record["q"]["author"]["id"],
                "answer_id": record["a"]["id"],
                "answer_user_id": record["a"]["author"]["id"],
                "issue_message": record["q"]["content"].replace("\n", "\\n"),
                "answer_message": record["a"]["content"].replace("\n", "\\n"),
            }
            rows.append(row)
        df = pd.DataFrame(rows)
        return df

    def _save_result(self, df, prefix: str):
        report_dir = Path("result") / "tmp"
        df.to_csv(report_dir / f"{prefix}_{self.timestamp}.csv", index=False)
