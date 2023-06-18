from app.analyzer import Analyzer
from pathlib import Path

if __name__ == "__main__":
    data_path = Path("data") / "messages.jsonl"
    analyzer = Analyzer()
    analyzer.analyze(data_path)
