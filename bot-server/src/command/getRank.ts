import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { CustomCommand } from ".";

interface RankingData {
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
  const rankingData: RankingData[] = [];
  const msg = ["最新のランキングです！"];
  if (!rankingFiles || rankingFiles.length === 0) {
    msg.push("ランキングデータまだ集計中");
    await interaction.reply({ content: msg.join("\n"), ephemeral: false });
    return;
  }
  // タイトル
  msg.push("Rank, UserID, Score");

  for (const filename of rankingFiles) {
    const filePath = path.join(folderPath, filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData: RankingData = JSON.parse(fileContent);

    rankingData.push(jsonData);
  }

  const rankResult = rankingData
    .sort((a, b) => {
      const sortValueA = a[sortKey as keyof RankingData];
      const sortValueB = b[sortKey as keyof RankingData];

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
        `${index + 1}, ${item.userId}, ${item[sortKey as keyof RankingData]}`
    );
  msg.push(...rankResult);

  await interaction.reply({ content: msg.join("\n"), ephemeral: false });
  if (!interaction.isCommand()) {
    return;
  }
  return;
}

export default command;
