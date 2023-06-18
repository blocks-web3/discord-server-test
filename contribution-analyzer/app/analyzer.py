from app.issue_classifier import IssueClassifier
from app.support_detector import SupportDetector
import pandas as pd
from pathlib import Path
from datetime import datetime


class Analyzer:
    def _get_target_message(self, message_objects, message_id):
        for obj in message_objects:
            obj_id = obj["id"]
            if obj_id == message_id:
                return obj

    def _get_reference_messages(self, message_objects, question_id):
        messages = []
        reference_ids = []
        for obj in message_objects:
            referenced_message = obj.get("referenced_message")
            if referenced_message:
                obj_id = obj.get("id")
                parent_id = referenced_message["id"]
                if parent_id == question_id or parent_id in reference_ids:
                    messages.append(obj)
                    # レコードが生成順にソートされる前提。
                    reference_ids.append(obj_id)
        return messages

    def _report(self, records):
        report_dir = Path("report") / "analyze"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # レコードデータを展開してDataFrameに変換
        # 質問文のmessageId, 質問者のuserId, 回答のmessageId, 回答者のuserId, 質問文, 回答
        df = pd.DataFrame({
            'q_id': [record['q']['id'] for record in records],
            'q_user_id': [record['q']['author']['id'] for record in records],
            'a_id': [record['a']['id'] for record in records],
            'a_user_id': [record['a']['author']['id'] for record in records],
            'q_content': [record['q']['content'] for record in records],
            'a_content': [record['a']['content'] for record in records]
        })
        df.to_csv(f"{report_dir}/analyzer_{timestamp}.csv", index=False)

    def analyze(self, jsonl_file: Path):
        dtype = {'id': str}
        df = pd.read_json(str(jsonl_file), lines=True, dtype=dtype)
        df = df.where(df.notnull(), None)
        file = df.to_dict(orient='records')
        if df.empty:
            print("no file data")
        else:
            issue_classifier = IssueClassifier()
            support_detector = SupportDetector()

            # issuesに紐づくメッセージ群を取得
            issues = issue_classifier.evaluate(file)

            if not issues:
                print("no question exist")
            else:
                records = []
                for question_id in issues:
                    question = self._get_target_message(file, question_id)
                    if not question:
                        print("targe question not found")
                    else:
                        refrences = self._get_reference_messages(file, question_id)
                        if not refrences:
                            print("no refrence message")
                        else:
                            # メッセージ群の中で解決に貢献したメッセージを取得
                            answers_id = support_detector.evaluate(question, refrences)
                            for answer_id in answers_id:
                                answer = self._get_target_message(file, answer_id)
                                records.append({"q": question, "a": answer})
                # 質問と回答バインド情報をcsv出力
                self._report(records)
