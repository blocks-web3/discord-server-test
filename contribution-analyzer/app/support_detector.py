from typing import Optional, List
from app.llm import Llm, DEFAULT_LLM
from app.support_detector_prompt import SUPPORT_DETECTOR_PROMPT
from pydantic import BaseModel, Field
import re
import json
from pathlib import Path
from datetime import datetime


class SupportDetector(BaseModel):
    llm: Llm = Field(default=DEFAULT_LLM)
    debug: bool = Field(default=False)

    def evaluate(self, question, messages) -> List[str]:
        """ユーザの質問・疑問・困り事に対して解決に導いたメッセージを判別する。

        Args:
            question (Dict): id, content（メッセージ）が定義されたDict
            messages (List[Dict]): 会話順（会話時刻の昇順）にソートされたid, contentを定義したDict

        Returns:
            List[str]: 解決に導いたメッセージIDのリスト
        """
        if self.debug:
            self._save_input(question, messages)
        question = self._format_messages([question])
        input_data = self._format_messages(messages)
        prompt = SUPPORT_DETECTOR_PROMPT.format(question=question, messages=input_data)
        result = self.llm.predict(prompt)
        # プロンプトで出力フォーマットを指示する方法もあるが、結果が安定しないケースがあるためルールベースで変換する。
        return self._format_result(result)

    def _save_input(self, question: dict, messages: list):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        question = {"id": question["id"], "content": question["content"].replace("\n", "\\n")}
        json_data = json.dumps(question, ensure_ascii=False)
        with open(Path("result") / "tmp" / f"question_{timestamp}.json", "w", encoding="utf-8") as file:
            file.write(json_data)
        messages = [{"id": m["id"], "content": m["content"].replace("\n", "\\n")} for m in messages]
        json_data = json.dumps(messages, ensure_ascii=False)
        with open(Path("result") / "tmp" / f"messages_{timestamp}.json", "w", encoding="utf-8") as file:
            file.write(json_data)

    def _format_messages(self, messages) -> str:
        text = ""
        for m in messages:
            id = m["id"]
            message = m["content"]
            message = message.replace("\n", "\\n")
            text += f"id: {id}, message: {message}\n"
        return text

    def _format_result(self, result_text: Optional[str]) -> List[str]:
        results = []
        if result_text is None or len(result_text) == 0:
            return results
        for row in result_text.split("\n"):
            match = re.search(r"id: (\d+)", row)
            if not match:
                continue
            results.append(match.group(1))
        return results


if __name__ == "__main__":
    testee = SupportDetector()
    sample_q = {"id": 1, "content": "申し込み方法がわからない"}
    sample_messages = [
        {"id": 10, "content": "新しいプロジェクトが開始した"},
        {"id": 11, "content": "どんなプロジェクトですか？"},
        {"id": 12, "content": "HPから申し込みできます。"},
        {"id": 13, "content": "6/12のイベント会場はどこですか"},
    ]
    print(testee._format_messages(sample_messages))
    r = testee.evaluate(sample_q, sample_messages)
    print(r)
