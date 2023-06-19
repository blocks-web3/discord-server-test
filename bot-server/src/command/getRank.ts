import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { CustomCommand } from ".";

interface RankingData {
  rankingId: string;
  ranking: RankingDataDetail[];
}

interface RankingDataDetail {
  id: string;
  rankingId: string;
  userId: string;
  rank: string;
  contributionScore: number;
  messageCount: number;
  reactionCount: number;
  messageQuality: number;
  participationScore: number;
  supportScore: number;
  violationScore: number;
}

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("get-rank")
    .setDescription(
      "コミュニティのランキングを表示します。オプションでカテゴリ指定できます。"
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The rank category")
        .setRequired(false)
        .addChoices(
          { name: "貢献度", value: "contributionScore" },
          { name: "メッセージ数", value: "messageCount" },
          { name: "リアクション数", value: "reactionCount" },
          { name: "参加度", value: "participationScore" },
          { name: "支援度", value: "supportScore" },
          { name: "違反度", value: "violationScore" },
          { name: "メッセージの質", value: "messageQuality" }
        )
    ),
  execute: executeLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const sortKey = interaction.options.get("type")?.value ?? "contributionScore";
  const currentFolderPath = __dirname; // 現在のプロセス実行ディレクトリのパス
  const folderPath = path.join(
    currentFolderPath,
    "../../../contribution-analyzer/result"
  ); // 相対パス

  const rankingFiles = fs
    .readdirSync(folderPath)
    .filter(
      (filename) =>
        filename.startsWith("ranking_") && filename.endsWith(".json")
    );

  // 最新のファイルのみ取得
  const latestFile = getLatestRankingFile(folderPath);

  const rankingData: RankingDataDetail[] = [];
  const msg = ["最新のランキングです！"];
  if (!latestFile) {
    msg.push("ランキングデータまだ集計中");
    await interaction.reply({ content: msg.join("\n"), ephemeral: false });
    return;
  }
  // タイトル
  msg.push("Rank, UserID, Score");

  const fileContent = fs.readFileSync(latestFile, "utf-8");
  const jsonData: RankingData = JSON.parse(fileContent);

  rankingData.push(...jsonData.ranking);

  const rankResult = rankingData
    .sort((a, b) => {
      const sortValueA = a[sortKey as keyof RankingDataDetail];
      const sortValueB = b[sortKey as keyof RankingDataDetail];

      if (typeof sortValueA === "number" && typeof sortValueB === "number") {
        return sortValueB - sortValueA; // 数値の場合、降順でソート
      } else if (
        typeof sortValueA === "string" &&
        typeof sortValueB === "string"
      ) {
        return sortValueA.localeCompare(sortValueB); // 文字列の場合、辞書順でソート
      }

      return 0;
    })
    .map(
      (item, index) =>
        `${index + 1}, ${item.userId}, ${
          item[sortKey as keyof RankingDataDetail]
        }`
    );
  msg.push(...rankResult);

  await interaction.reply({ content: msg.join("\n"), ephemeral: false });
  if (!interaction.isCommand()) {
    return;
  }
  return;
}

function getLatestRankingFile(folderPath: string): string | null {
  const rankingFiles = fs
    .readdirSync(folderPath, "utf-8")
    .filter((filename) => /^ranking_\d+\.json$/.test(filename))
    .sort((a, b) => {
      const idA = Number(a.match(/^ranking_(\d+)\.json$/)?.[1]);
      const idB = Number(b.match(/^ranking_(\d+)\.json$/)?.[1]);
      return idB - idA;
    });

  if (rankingFiles.length > 0) {
    const latestFile = rankingFiles[0];
    return path.join(folderPath, latestFile);
  }

  return null;
}

export default command;
