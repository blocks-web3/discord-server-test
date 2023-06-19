import pandas as pd
from pathlib import Path
from pydantic import BaseModel, Field

WEIGHT = {
    "message_count": 0.5,
    "reaction_count": 0.2,
    "message_quality": 0.7,
    "participation_score": 7,
    "support_score": 9,
    "violation_score": -20,
}


def _calculate_reacted_count(reactions):
    count = 0
    if reactions is None:
        return 0
    if isinstance(reactions, float):
        return count
    for v in reactions:
        count += v["count"]
    return count


class ContributionStats(BaseModel):
    timestamp: str = Field()

    def analyze_from_file(self, jsonl_file: Path):
        df = pd.read_json(str(jsonl_file), lines=True)
        return self.analyze(df)

    def calculate_satats(self, df: pd.DataFrame):
        df["username"] = df["author"].apply(lambda x: x["username"])
        df["user_id"] = df["author"].apply(lambda x: x["id"])
        df["reacted_count"] = df["reactions"].apply(_calculate_reacted_count)
        df = df[["id", "user_id", "username", "reacted_count"]]
        grouped_df = (
            df.groupby("user_id")
            .agg(
                message_count=("user_id", "size"), message_quality=("reacted_count", "sum"), name=("username", "first")
            )
            .reset_index()
        )
        grouped_df["reaction_count"] = 0
        grouped_df["participation_score"] = 0
        grouped_df["violation_score"] = 0
        self._save_result(grouped_df)
        return grouped_df

    def calculate_contribution_score(self, df):
        df = df.fillna(0)
        df["contribution_score"] = 0
        for key, value in WEIGHT.items():
            df["contribution_score"] += df[key] * value
        df = df.sort_values("contribution_score", ascending=False)
        df = df.reset_index()
        df["rank"] = df.index + 1
        return df

    def filter_columns(self, df):
        df = df[
            [
                "user_id",
                "name",
                "rank",
                "contribution_score",
                "message_count",
                "reaction_count",
                "message_quality",
                "participation_score",
                "support_score",
                "violation_score",
            ]
        ]
        return df

    def _save_result(self, df):
        report_dir = Path("result") / "tmp"
        df.to_csv(report_dir / f"stats_{self.timestamp}.csv", index=False)


if __name__ == "__main__":
    testee = ContributionStats()
    data_path = Path("data") / "messages.jsonl"
    testee.analyze(data_path)
