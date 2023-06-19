# flake8: noqa
from langchain.prompts.prompt import PromptTemplate

# 英語表記にすることで精度・コストメリットあるが理解しやすさを優先して日本語表記にしている。実運用では英語表記にする。
_TEMPLATE = """
あなたはDiscordサーバの管理者です。ユーザの困り事を解決に導いた会話を見つけてください。
具体的には、Discordの使い方がわからない、イベントの参加方法がわからないなどユーザの様々な問い合わせに対して、答えとなる会話を抽出します。

抽出対象のメッセージは[input]に定義します。
[質問・疑問・困り事]に定義したメッセージの答えとなるメッセージが[input]に存在していれば[input]から抽出してください。
ただし、質問・疑問・困り事の解決につながっていなければ抽出する必要はありません。
抽出結果は[output]に定義してください。

EXAMPLE
[質問・疑問・困り事]:
id: 100, message: 6/12のイベント会場はどこですか

[input]:
id: 110, message: 新しいプロジェクトが開始した
id: 111, message: 虎ノ門です。
id: 112, message: どんなプロジェクトですか？
id: 113, message: 6/12のイベント会場はどこですか
id: 114, message: チケットはどこで購入できますか
id: 115, message: https://hoge.com から購入できます
id: 116, message: ありがとうございます。

[output]:
id: 113, message: 虎ノ門です。
END OF EXAMPLE

Begin!
[質問・疑問・困り事]:
{question}
[input]:
{messages}
[Output]:"""

SUPPORT_DETECTOR_PROMPT = PromptTemplate(
    input_variables=["question", "messages"],
    template=_TEMPLATE,
)
