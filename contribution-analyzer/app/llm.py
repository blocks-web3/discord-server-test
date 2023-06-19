from typing import Optional, Sequence, Any
from langchain.chat_models import ChatOpenAI
from langchain.callbacks import get_openai_callback
from pydantic import BaseModel, Field
from datetime import datetime
import csv
from pathlib import Path


class Llm(BaseModel):
    llm: ChatOpenAI = Field(default=ChatOpenAI(model_name="gpt-3.5-turbo-0613"))
    report_path: Path = Field(default=Path("report") / "cost" / f'cost_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv')

    def __init__(self):
        super().__init__()
        with open(self.report_path, mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["timestamp", "total_tokens", "prompt_tokens", "completion_tokens", "total_cost(USD)"])

    def predict(self, text: str, *, stop: Optional[Sequence[str]] = None, **kwargs: Any) -> str:
        with get_openai_callback() as cb:
            result = self.llm.predict(text=text, stop=stop, **kwargs)
        with open(self.report_path, mode="a", newline="") as file:
            writer = csv.writer(file)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            writer.writerow([timestamp, cb.total_tokens, cb.prompt_tokens, cb.completion_tokens, cb.total_cost])
        return result


DEFAULT_LLM = Llm()
