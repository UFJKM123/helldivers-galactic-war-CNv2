import csv
import json
import os,sys

if not os.path.exists("./lang"):
    print("请在lang文件夹所在目录下运行此工具")
    input("按任意键退出")
    input("按任意键退出")
    
    sys.exit(0)


for filename in os.listdir("./lang/lang_csv/"):
    if filename.endswith(".csv"):
        csv_file_path = os.path.join("./lang/lang_csv/", filename)

        with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
            print(csv_file_path)
            csv_reader = csv.reader(csv_file)
            data = list(csv_reader)
        jsondata = {}
        print(data)
        for index,lang in enumerate(data[0][1:]):
            with open(f"./lang/{lang}/{filename.split('.')[0]}.json", mode='w', encoding='utf-8') as json_file:
                for row in data[1:]:
                    jsondata[row[0]] = row[index+1]
                json.dump(jsondata, json_file, indent=4, ensure_ascii=False)

