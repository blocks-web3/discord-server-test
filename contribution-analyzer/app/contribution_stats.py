import pandas as pd
from pathlib import Path


def _calculate_reacted_count(reactions):
    count = 0
    if isinstance(reactions, float):
        return count
    for v in reactions:
        count += v["count"]
    return count


class ContributionStats:
    def analyze(self, jsonl_file: Path):
        df = pd.read_json(str(jsonl_file), lines=True)
        df["username"] = df["author"].apply(lambda x: x["username"])
        df["user_id"] = df["author"].apply(lambda x: x["id"])
        df["reacted_count"] = df["reactions"].apply(_calculate_reacted_count)
        df = df[["id", "user_id", "username", "reacted_count"]]
        print(df)
        grouped_df = (
            df.groupby("user_id")
            .agg(
                message_count=("user_id", "size"), message_quality=("reacted_count", "sum"), name=("username", "first")
            )
            .reset_index()
        )
        print(grouped_df)


if __name__ == "__main__":
    testee = ContributionStats()
    data_path = Path("data") / "messages.jsonl"
    testee.analyze(data_path)
