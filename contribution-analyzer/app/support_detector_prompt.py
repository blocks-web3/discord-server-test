# flake8: noqa
from langchain.prompts.prompt import PromptTemplate

# 英語表記にすることで精度・コストメリットあるが理解しやすさを優先して日本語表記にしている。実運用では英語表記にする。
_TEMPLATE = """
あなたはDiscordサーバの管理者です。ユーザの困り事を解決に導いた会話を見つけてください。
具体的には、Discordの使い方がわからない、イベントの参加方法がわからないなどユーザの様々な問い合わせに対して、答えとなる会話を抽出します。

抽出対象のメッセージはinputに定義します。
inputに定義したメッセージから質問・疑問・困り事に対して答えとなるメッセージを抽出してください。
抽出結果はoutputに定義してください。

EXAMPLE
質問・疑問・困り事:
id: 112, message: 6/12のイベント会場はどこですか

input:
id: 110, message: 新しいプロジェクトが開始した
id: 111, message: 虎ノ門です。
id: 112, message: どんなプロジェクトですか？
id: 113, message: 6/12のイベント会場はどこですか
id: 114, message: チケットはどこで購入できますか
id: 115, message: https://hoge.com から購入できます
id: 116, message: ありがとうございます。

output:
id: 113, message: 虎ノ門です。
END OF EXAMPLE

Begin!
質問・疑問・困り事:
{question}
input:
{messages}
Output:"""

SUPPORT_DETECTOR_PROMPT = PromptTemplate(
    input_variables=["question", "messages"],
    template=_TEMPLATE,
)
