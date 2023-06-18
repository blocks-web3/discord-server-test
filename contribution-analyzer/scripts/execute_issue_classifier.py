from typing import List
from app.issue_classifier import IssueClassifier
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
from datetime import datetime
import csv


class Report:
    def _report(self, data_path: Path, issues: List[str]):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_dir = Path("report") / "issue_classifier"

        with open(report_dir / "condition.csv", mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([timestamp, str(data_path)])

        df = pd.read_json(str(data_path), lines=True)
        df = df[["id", "content", "isIssue(actual)"]]
        df["content"] = df["content"].str.replace("\n", "\\n")
        df["id"] = df["id"].astype(str)
        df["isIssue"] = df["id"].isin(issues)
        df = df[["id", "isIssue(actual)", "isIssue", "content"]]

        result_dir = Path("result")
        df.to_csv(result_dir / f"issue_messages_{timestamp}.csv", index=False)
        y_actual = df["isIssue(actual)"].to_numpy()
        y_pred = df["isIssue"].to_numpy()

        report = classification_report(y_actual, y_pred)
        with open(report_dir / f"report_{timestamp}.txt", "w") as f:
            f.write(report)
        cm = confusion_matrix(y_true=y_actual, y_pred=y_pred)
        cmp = ConfusionMatrixDisplay(confusion_matrix=cm)
        cmp.plot(cmap=plt.cm.Blues, xticks_rotation="vertical")
        plt.savefig(report_dir / f"confusion_matrix_{timestamp}.png", bbox_inches="tight")

    def _execute_classifier(self, data_path: Path) -> List[str]:
        df = pd.read_json(str(data_path), lines=True)
        messages = df[["id", "content"]].to_dict(orient="records")
        issue_classifier = IssueClassifier()

        chunks = [messages[i : i + 10] for i in range(0, len(messages), 10)]
        issues = []
        for chunk in chunks:
            issues.extend(issue_classifier.evaluate(chunk))
        return issues

    def _execute_classifier_mock(self, data_path: Path) -> List[str]:
        return [
            "1111115257994285056",
            "1113042416522506240",
            "1113043939583348736",
            "1114002128457961600",
            "1114777824222511104",
            "1114791137002139648",
            "1116211625020628992",
            "1117238405655433216",
            "1117421795482550272",
            "1113617566192128128",
            "1116680970595221632",
            "1118940384001806464",
        ]

    def execute(self, data_path: Path, mock: bool = False):
        if mock:
            issues = self._execute_classifier_mock(data_path)
        else:
            issues = self._execute_classifier(data_path)
        self._report(data_path, issues)


if __name__ == "__main__":
    testee = Report()
    data_path = Path("data") / "messages.jsonl"
    testee.execute(data_path, mock=True)
