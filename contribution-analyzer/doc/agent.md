agent.py

### a. jsonl読み込みし、一時データで持つ
input file jsonl_file
output object[] message_objects
``` py
def read_file(jsonl_file):
    return message_objs
```


### chatgptに元のデータ渡す、質問文リスト返す
input object[] message_objects
output string[] question_ids

``` py
def get_question_ids(message_objects):
    return question_ids
```

### 質問文id毎にやり取りを返す（以下loop）
input object[] message_objects
input string question_id
output object[] question_messages_objs
- 回答ない場合質問のみ1レコード想定

``` py
def get_question_messages(message_objects, question_id)
    return question_messages_objs
```

### メッセージやり取りをchatgptへ渡し、回答特定する
input object[] question_messages_objs
output string[] anwser_ids

→ 複数存在あり想定

``` py
def get_anwser_ids(question_messages_objs)
    return anwser_ids
```

### 回答メッセージと質問文で結果dump
input object[] message_objects
input string[] anwser_ids
output string[] result_strings
→ 質問ID, 質問者, 回答ID, 回答者, 質問内容, 回答内容

``` py
def get_anwser_users(message_objects, question_id, anwser_ids)
    return result_strings
```
