from langchain.chat_models import ChatOpenAI
from app.issue_classifier_prompt import ISSUE_CLASSIFIER_PROMPT


def evaluate(messages):
    llm = ChatOpenAI(model_name="gpt-3.5-turbo-0613")
    a = llm.predict(ISSUE_CLASSIFIER_PROMPT.format(messages=messages))
    split_list = a.split("\n")
    print(split_list)


if __name__ == "__main__":
    text = """
    id: 110, message: 新しいプロジェクトが開始した
    id: 111, message: どんなプロジェクトですか？
    id: 112, message: 6/12のイベント会場はどこですか
    id: 113, message: 虎ノ門です。
    id: 114, message: チケットはどこで購入できますか
    id: 115, message: https://hoge.com から購入できます
    id: 116, message: ありがとうございます。
    """
    evaluate(text)
