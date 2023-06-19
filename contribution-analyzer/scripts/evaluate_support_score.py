import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
from datetime import datetime
import csv


class Report:
    def evaluate(self, label_path: Path, prediction_path: Path):
        label_df = pd.read_csv(str(label_path), dtype={"id": str, "relatedIssueId": str})
        pred_df = pd.read_csv(
            str(prediction_path),
            dtype={"issue_id": str, "issue_user_id": str, "answer_id": str, "answer_user_id": str},
        )

        label_df["isAnswer(pred)"] = False
        pred_df["answer_id-issue_id"] = list(zip(pred_df.answer_id, pred_df.issue_id))
        label_df["id-relatedIssueId"] = list(zip(label_df.id, label_df.relatedIssueId))
        label_df.loc[label_df["id-relatedIssueId"].isin(pred_df["answer_id-issue_id"]), "isAnswer(pred)"] = True
        label_df = label_df.drop(columns=["id-relatedIssueId"])

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_dir = Path("report") / "support_score"

        with open(report_dir / "condition.csv", mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([timestamp, str(label_path), str(prediction_path)])

        label_df = label_df[["id", "isAnswer(actual)", "isAnswer(pred)", "relatedIssueId", "content"]]
        result_dir = Path("result") / "tmp"
        label_df.to_csv(result_dir / f"support_messages_{timestamp}.csv", index=False)

        y_actual = label_df["isAnswer(actual)"].to_numpy()
        y_pred = label_df["isAnswer(pred)"].to_numpy()
        report = classification_report(y_actual, y_pred)
        with open(report_dir / f"report_{timestamp}.txt", "w") as f:
            f.write(report)
        cm = confusion_matrix(y_true=y_actual, y_pred=y_pred)
        cmp = ConfusionMatrixDisplay(confusion_matrix=cm)
        cmp.plot(cmap=plt.cm.Blues, xticks_rotation="vertical")
        plt.savefig(report_dir / f"confusion_matrix_{timestamp}.png", bbox_inches="tight")


if __name__ == "__main__":
    testee = Report()
    label_path = Path("data") / "label_messages.csv"
    prediction_path = Path("result") / "tmp" / "qa_20230620_083328_320130.csv"
    testee.evaluate(label_path, prediction_path)
