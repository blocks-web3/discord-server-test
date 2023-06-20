import pandas as pd
from pathlib import Path
from pydantic import BaseModel, Field
from app.contribution_stats import ContributionStats
from app.support_score_calculator import SupportScoreCalculator
from datetime import datetime
import json


class Analyzer(BaseModel):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    support_score_calculator: SupportScoreCalculator = Field(default=SupportScoreCalculator(timestamp=timestamp))
    contribution_stats: ContributionStats = Field(default=ContributionStats(timestamp=timestamp))

    def analyze(self, jsonl_file: Path):
        # 分析対象のデータはDiscordAPIから取得できるメッセージの履歴をjsonl形式で保存したものを想定。
        df = pd.read_json(str(jsonl_file), lines=True, dtype={"id": str})
        df = df.where(df.notnull(), None)
        if df.empty:
            raise ValueError("data is empty")

        messages = df.to_dict(orient="records")
        # ChatGPTを使って支援度を算出する。
        support_scores_df = self.support_score_calculator.calculate(messages)

        contribution_stats_df = self.contribution_stats.calculate_satats(df)
        result_df = contribution_stats_df.merge(
            support_scores_df, how="left", left_on="user_id", right_on="answer_user_id"
        )
        result_df = self.contribution_stats.calculate_contribution_score(result_df)
        result_df = self.contribution_stats.filter_columns(result_df)
        self._save_result(result_df)
        self._save_json(result_df)

    def _save_result(self, df):
        report_dir = Path("result") / "tmp"
        df.to_csv(report_dir / f"ranking_{self.timestamp}.csv", index=False)

    def _save_json(self, df):
        report_dir = Path("result")
        ranking = df.to_dict(orient="records")
        data = {"rankingId": self.timestamp, "ranking": ranking}
        with open(report_dir / f"ranking_{self.timestamp}.json", "w") as f:
            json.dump(data, f, indent=2)
