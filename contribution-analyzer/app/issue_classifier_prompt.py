# flake8: noqa
from langchain.prompts.prompt import PromptTemplate

_TEMPLATE = """
あなたはDiscordサーバの管理者です。管理者としてユーザの困り事を検知してください。
Discordの使い方がわからない、イベントの参加方法がわからないなどユーザの様々な問い合わせに対して検知をしてください。

検知対象のメッセージはinputに定義します。
inputに定義したメッセージから問い合わせや質問文に対して抽出してください。抽出結果はoutputに定義してください。

EXAMPLE
input:
id: 110, message: 新しいプロジェクトが開始した
id: 111, message: どんなプロジェクトですか？
id: 112, message: 6/12のイベント会場はどこですか
id: 113, message: 虎ノ門です。
id: 114, message: チケットはどこで購入できますか
id: 115, message: https://hoge.com から購入できます
id: 116, message: ありがとうございます。
output:
id: 112, message: 6/12のイベント会場はどこですか
id: 114, message: チケットはどこで購入できますか
END OF EXAMPLE

Begin!
{messages}
Output:"""

ISSUE_CLASSIFIER_PROMPT = PromptTemplate(
    input_variables=["messages"],
    template=_TEMPLATE,
)
