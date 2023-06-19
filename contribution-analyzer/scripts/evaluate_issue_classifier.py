from typing import List
from app.issue_detector import IssueDetector
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
from datetime import datetime
import csv


class Report:
    def _report(self, df: pd.DataFrame, issues: List[str]):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_dir = Path("report") / "issue_detector"

        with open(report_dir / "condition.csv", mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([timestamp, str(data_path)])

        df = df[["id", "content", "isIssue(actual)"]]
        df["content"] = df["content"].str.replace("\n", "\\n")
        df["id"] = df["id"].astype(str)
        df["isIssue"] = df["id"].isin(issues)
        df = df[["id", "isIssue(actual)", "isIssue", "content"]]

        result_dir = Path("result") / "tmp"
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

    def _execute_classifier(self, df: pd.DataFrame) -> List[str]:
        messages = df[["id", "content"]].to_dict(orient="records")
        issue_detector = IssueDetector()
        return issue_detector.evaluate(messages)

    def _execute_classifier_mock(self, data_path: Path) -> List[str]:
        return [
            "1111115257994285107",
            "1113042416522506252",
            "1113043939583348779",
            "1113460243037442159",
            "1113627256812732517",
            "1114791137002139658",
            "1116211625020629043",
            "1117238405655433267",
            "1117421795482550302",
            "1113617566192128080",
            "1116680970595221615",
            "1118940384001806467",
        ]

    def evaluate(self, data_path: Path, mock: bool = False):
        df = pd.read_json(str(data_path), lines=True, dtype={"id": str})
        if mock:
            issues = self._execute_classifier_mock(df.copy())
        else:
            issues = self._execute_classifier(df.copy())
            print(issues)
        self._report(df.copy(), issues)


if __name__ == "__main__":
    testee = Report()
    data_path = Path("data") / "messages.jsonl"
    testee.evaluate(data_path, mock=False)
