# -*- coding: utf-8 -*-

import json

# ファイルからデータを読み込む
with open("freetalk.txt", "r", encoding="utf-8") as file:
    data = json.load(file)

# データをソートする
sorted_data = sorted(data, key=lambda x: int(x["id"]))

# 結果をファイルに書き込む
with open("freetalk_sort.txt", "w", encoding="utf-8") as output_file:
    for item in sorted_data:
        output_file.write(json.dumps(item, ensure_ascii=False) + '\n')