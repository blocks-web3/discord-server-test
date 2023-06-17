from app.issue_classifier import IssueClassifier
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report


class Sample:
    def analyze(self):
        data_path = Path("data") / "messages.jsonl"
        df = pd.read_json(str(data_path), lines=True)
        df = df[["id", "content", "isIssue(actual)"]]
        df["content"] = df["content"].str.replace("\n", "\\n")
        df["id"] = df["id"].astype(str)
        df["isIssue"] = df["id"].isin(
            [
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
        )
        df = df[["id", "isIssue(actual)", "isIssue", "content"]]
        result_dir = Path("result")
        df.to_csv(result_dir / "issue_messages.csv", index=False)
        y_actual = df["isIssue(actual)"].to_numpy()
        y_pred = df["isIssue"].to_numpy()
        # labels = ["isIssue(actual)", "isIssue(pred)"]
        report = classification_report(y_actual, y_pred)
        with open(result_dir / "issue_analyze_report.txt", "w") as f:
            f.write(report)
        print(report)
        cm = confusion_matrix(y_true=y_actual, y_pred=y_pred)
        cmp = ConfusionMatrixDisplay(confusion_matrix=cm)
        cmp.plot(cmap=plt.cm.Blues, xticks_rotation="vertical")
        plt.savefig(result_dir / "issue_confusion_matrix.png", bbox_inches="tight")

    def analyze_bk(self):
        data_path = Path("data") / "messages.jsonl"
        df = pd.read_json(str(data_path), lines=True)
        messages = df[["id", "content"]].to_dict(orient="records")
        issue_classifier = IssueClassifier()

        chunks = [messages[i : i + 10] for i in range(0, len(messages), 10)]
        for chunk in chunks:
            issues = issue_classifier.evaluate(chunk)
            print(issues)


if __name__ == "__main__":
    sample = Sample()
    sample.analyze()
