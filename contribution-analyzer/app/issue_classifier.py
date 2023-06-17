from typing import Dict, Optional
from langchain.chat_models import ChatOpenAI
from app.issue_classifier_prompt import ISSUE_CLASSIFIER_PROMPT
from pydantic import BaseModel, Field
import re


class IssueClassifier(BaseModel):
    llm: ChatOpenAI = Field(default=ChatOpenAI(model_name="gpt-3.5-turbo-0613"))

    def evaluate(self, messages) -> Dict[str, str]:
        input_data = self._format_messages(messages)
        result = self.llm.predict(ISSUE_CLASSIFIER_PROMPT.format(messages=input_data))
        return self._format_result(result)

    def _format_messages(self, messages):
        text = ""
        for m in messages:
            id = m["id"]
            message = m["content"]
            text += f"id: {id}, message: {message}\n"
        return text

    def _format_result(self, result_text: Optional[str]) -> Dict[str, str]:
        results = {}
        if result_text is None or len(result_text) == 0:
            return results
        for row in result_text.split("\n"):
            match = re.search(r"id: (\d+)", row)
            if not match:
                continue
            id_number = match.group(1)
            match = re.search(r"message: (.+)", row)
            if not match:
                continue
            extracted_message = match.group(1)
            results[id_number] = extracted_message
        return results


if __name__ == "__main__":
    testee = IssueClassifier()
    sample = [
        {"id": 10, "content": "新しいプロジェクトが開始した"},
        {"id": 11, "content": "どんなプロジェクトですか？"},
        {"id": 12, "content": "6/12のイベント会場はどこですか"},
    ]
    print(testee._format_messages(sample))
    r = testee.evaluate(sample)
    print(r)
