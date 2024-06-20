
from flask import Flask, request, render_template, redirect, jsonify, make_response, session
import os
import openai
import pandas as pd
import numpy as np
import os
#import plotly
#import scipy
#import sklearn
from flask import Flask, request, render_template
#import tiktoken
#from tiktoken.core import Encoding
import csv

app = Flask(__name__)
#app = Flask(__name__, static_folder='my_static', static_url_path='/my_static')

# APIキーの設定
apikey = os.environ.get('OpenAI_API')
openai.api_key = apikey

# OpenAIのembeddings_utilsモジュールからget_embeddingとcosine_similarity関数をインポート
from openai.embeddings_utils import get_embedding, cosine_similarity

# データファイルのパスを指定
datafile_path = "static/csv/chatbot_database.csv"

# ↓↓↓列は以下のようになっている。↓↓↓
# 'qanda','embedding'

# データファイルをpandasデータフレームとして読み込む
df = pd.read_csv(datafile_path)

# 文字列として保存されたembedding列を、eval関数を使って評価し、numpy配列に変換
df["embedding"] = df.embedding.apply(eval).apply(np.array)

print("データベース読み込み完了")

#questions = ""
Conversation_Log = ""
num_use_chatbot = 0

##### 関数定義部分 #####

# 入力された事故事例を検索する関数を定義
def search_database(df, product_description, n, pprint=True):
    # 入力された事故事例からembeddingを取得する
    product_embedding = get_embedding(
        product_description,
        engine="text-embedding-ada-002"
    )

    # データフレーム内の全てのembeddingとの類似度を計算し、新しい列'similarity'に保存
    df["similarity"] = df.embedding.apply(lambda x: cosine_similarity(x, product_embedding))

    # 類似度が高い順にソートし、上位n件の結果を取得
    results = (
        df.sort_values("similarity", ascending=False)
        .head(n)
        .qanda.str.replace("Title: ", "")
        .str.replace("; Content:", ": ")
    )

    # 検索結果を結合してひとつの文字列にする
    combined_results = ""
    roop_counter = 0
    for r in results:
        if roop_counter == 0:
            combined_results = "第"+str(roop_counter+1)+"データ\n" + r + "\n" + "\n"
        if roop_counter != 0:
            combined_results = combined_results + "第"+str(roop_counter+1)+"データ\n" + r + "\n" + "\n" 

    return combined_results


# チャットボットの回答を作成する関数を定義

def make_answer(question_input):
    contexts = ""
    global Conversation_Log

    ### 質問内容 ###
    questions = question_input

    print("質問内容：" + questions)

    if "@" in questions: # 新規のトピックに関する質問

        Conversation_Log = "" # 会話履歴をリセットする

        # 質問内容を検索クエリとしてデータベース内を検索し結果を表示
        # nを大きくすると回答の参考とする文脈は増えるが、プロンプトの文字数に制限があるので気を付ける

        # データベースから返ってきた結果を文脈に利用するため保存する
        contexts = search_database(df,questions, n=3)
        print("検索結果："+ contexts)
        contexts = contexts + "Q.魔法省にはどのような動物がいますか？  A.魔法省にはスカイドラゴン、魔法の猫、フェアリーなど、さまざまな魔法生物がいます。職員たちは彼らと共に業務を行っています。"
        # 魔法省には、スカイドラゴンのスカイラーくん（ドラゴンの炎の息をエネルギーとして利用する）、魔法の猫のウィスカーちゃん（最大で1日に3つの魔法呪文を発動できる）、フェアリーのピクシー（最大で1時間の飛行が可能）、カモフラージュ生物のブレンディ（最大で2時間の透明化）、そして魔法の植物のバドシー（知識を提供し、1キログラムから2キログラムの成分を収穫可能）など、さまざまな魔法生物を飼育しており、動物たちは職員の業務を様々な面でサポートしています。
        # プロンプトを作成する

        prompt = [
            {"role": "system", "content": "あなたは架空の機関「魔法省」の事務作業に関して精通した非常に優秀なアシスタントチャットボットです。"},
            # "質問"に質問者の文章が入る
            # "文脈"にデータベースから引っ張ってきた情報が入る
            {"role": "user", "content": "文脈は、実際に過去に社内で発生した質問とその回答のペアです。\n文脈の内容を参照し厳密に引用しつつ、今回の質問に詳細に回答してください。文脈にないことは素直に「分かりません」と答えてください。\n文脈 : {} \n今回された質問 : {}\n答え :".format(contexts,questions)}
            ]
    else:
        prompt = [{"role": "system", "content": "あなたは架空の機関「魔法省」の事務作業に関して精通した非常に優秀なアシスタントチャットボットです。"},
            {"role": "assistant", "content":"会話履歴一覧\n" + Conversation_Log},
            {"role": "user", "content": "会話履歴一覧を参照しつつ以下の質問に詳細に答えてください。会話履歴にないことは素直に「分かりません」と答えてください。\n質問 : {}\n答え :".format(questions)}
            ]

    # プロンプトを送信する
    completion = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages = prompt
    )

    answer = completion.choices[0].message.content
    # 結果を表示する
    print("回答：" + answer)
    
    # 会話履歴を作成・更新する
    Conversation_Log = Conversation_Log + "「質問内容」：" + questions + "\n「過去質問データベース」：" + contexts + "\n「回答」：" + answer  +"\n----------\n"

    ## 今までの会話履歴を確認する
    if "log" in questions:
        print("\n---会話履歴---\n" + Conversation_Log + "\n")

    return answer

# BBS内で高評価を受けた回答を探す関数を定義
def find_update_text():
    # 1. static/csv/BBS.csvを読み込む
    df = pd.read_csv('static/csv/BBS.csv')

    # 'questionId'列の最大値を取得
    max_id = int(df['questionId'].max())

    
    #for n in range(1,max_id+1): #データベースを充実させたらこっちをつかう！
    for n in range(1,5):

        print("現在の質問ID："+str(n)+"番目")

        # 2. questionIdがnの行のみを絞り込む
        df_filtered = df[df['questionId'] == n]

        # 3. solvedがtrueのものだけを絞り込む
        df_solved = df_filtered[df_filtered['solved'] == True]

        # 4. numGoodの最大値を持つ行を見つける
        max_good_row = df_solved[df_solved['numGood'] == df_solved['numGood'].max()]

        #4.5　ベストアンサーのユーザーを特定
        if len(max_good_row["respondent"]) > 0:
            best_answerer = max_good_row["respondent"].iloc[0]
            # ベストアンサーのユーザーにポイントを付与
            bestAnswererPonits(best_answerer)
        else:
    # 適切な処理を書く（例: best_answerer を None などのデフォルト値に設定する）
            continue
        
        
        # 5. "question"列+"answer"列の要素をupdate_text変数に保存
        if len(max_good_row) > 0:
            update_text = "Q." + max_good_row["question"].iloc[0] + " A." + max_good_row["answer"].iloc[0]
        else:
    # 適切な処理を書く（例: update_text をエラーメッセージやデフォルトのテキストに設定する）
            update_text = "No question and answer found."

        # 6. 結果をprint出力する
        #print(update_text)

        # 7. static/csv/chatbot_database.csvを読み込む
        df_chatbot = pd.read_csv('static/csv/chatbot_database.csv')

        # 8. dataIDがnの行を見つける
        row_dataID = df_chatbot[df_chatbot['dataID'] == n]
        
        # データが存在するかどうかで分岐
        if not row_dataID.empty:

            print("データが存在します.新規の質問ではありません")
            
            current_text = row_dataID["qanda"].iloc[0]

            # 9. 2つの文字列を比較して、差分があればデータベースを更新する
            if update_text == current_text:
                print("何もない...屍のようだ...")
            else:
                print("データベースを最新版に更新します")
                update_chatbot(n,update_text,True)

        else:
            print("データが存在しません.これはデータベースにない質問です。")
            update_chatbot(n,update_text,False)

    print("全ての更新が終わりました。")



# 渡された最新のBBSのデータをチャットボットのデータベース上書きする関数を定義
def update_chatbot(questionDataID,QAtext,overWrite):
    
    # 書き込み先のデータファイルのパスを指定
    datafile_path = "static/csv/chatbot_database.csv"

    # CSVファイルを読み込む
    df = pd.read_csv(datafile_path)

    if overWrite == True:
        # 特定の行の'qanda'列の値を書き換える
        df.loc[df['dataID'] == questionDataID, 'qanda'] = QAtext

        # 特定の行の'embedding'列の値を書き換える
        df.loc[df['dataID'] == questionDataID, 'embedding'] = str(get_embedding(QAtext,engine="text-embedding-ada-002",embedding_encoding = "cl100k_base",max_tokens = 8000))

    else:
        # 新しい行をデータフレームに追加
        new_row = pd.DataFrame({'dataID': questionDataID, 'qanda': QAtext, 'embedding': str(get_embedding(QAtext,engine="text-embedding-ada-002",embedding_encoding = "cl100k_base",max_tokens = 8000))},index=[0])
        # 新しい行をデータフレームに追加
        df = pd.concat([df, new_row], ignore_index=True)
    
    # 変更をCSVファイルに保存する
    df.to_csv('static/csv/chatbot_database.csv', index=False)

    print("質問ID：" + str(questionDataID)+"の更新が完了しました。")

# ベストアンサーになった人のポイント数を増やす関数を定義
def bestAnswererPonits(who_best_answer):
        df_user = pd.read_csv('static/csv/userdata.csv')
        # 'username' 列が 'best_answerer' と一致する行の 'point' 列に 300 を加算する
        df_user.loc[df_user['username'] == who_best_answer, 'point'] += 300
        # 変更を CSVファイルに保存する
        df_user.to_csv('static/csv/userdata.csv', index=False)



##### クリックリスナーや画面遷移部分 #####

@app.route("/", methods=["GET", "POST"])
def start():
    # return render_template("Chatbot.html")
    return render_template("Login.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        
        with open('static/csv/userdata.csv', 'r') as file:
            reader = csv.reader(file)
            for row in reader:
                if row[0] == username and row[1] == password:
                    # Save username and password to userdata.txt
                    with open("userdata.txt", "a") as f:
                        f.write(f"Username: {username}, Password: {password}\n")
                    
                    # Create a response object for the redirect
                    response = make_response(redirect("/home"))
        
                    # Set the cookie on the response object
                    response.set_cookie('username', username, max_age=3600)  # 1 hour expiration for this example
        
                    return response  # Redirect to /home with a cookie set

            # If the loop completes without finding a match
            return "Invalid credentials"

    return render_template("Login.html")

@app.route("/home", methods=["GET"])
def home():
    return render_template("Home.html")

@app.route("/shopping", methods=["GET"])
def point():
    return render_template("Shopping.html")

@app.route("/chatbot", methods=["GET"])
def chatbot():
    logged_in_user = request.cookies.get("username")
    if not logged_in_user:
        return redirect("/login")
    
    user_key = f"messages_{logged_in_user}"
    messages = session.get(user_key, [])
    session[user_key] = messages

    # ここにchatBotを賢くさせる処理をかくよ←書きました
    find_update_text()

    # 掲示板の新規回答が多いとfind_update_text関数の実行に結構時間かかるので、
    # 可能ならば処理が終わるまで画面に「チャットボット進化中...」みたいなポップアップを出したいです

    return render_template('Chatbot.html', messages=messages, type_effect="false")
    # return render_template('Chatbot.html', messages=messages)

app.secret_key = 'your_secret_key_here' 
@app.route('/chat', methods=['POST'])
def convert_text():
    logged_in_user = request.cookies.get("username")
    if not logged_in_user:
        return redirect("/login")
    
    # 以下、メイン処理部分
    user_input = request.form['user_input']
    # 関数を使用
    bot_answer = make_answer(user_input)

    global num_use_chatbot
    num_use_chatbot = num_use_chatbot + 1
    if num_use_chatbot%5 == 0:
        print("10ポイント獲得しました")
        new_data = []
        with open('static/csv/userdata.csv', 'r') as file:
            reader = csv.reader(file)
            for row in reader:
                if row[0] == logged_in_user:
                    new_points = int(row[2]) + 10
                    row[2] = str(new_points)
                new_data.append(row)
        with open('static/csv/userdata.csv', 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerows(new_data)

    # ユーザー名をキーとしてセッションからメッセージのリストを取得（または新しいリストを初期化）
    user_key = f"messages_{logged_in_user}"
    messages = session.get(user_key, [])
    messages.append({"type": "user", "content": user_input})
    messages.append({"type": "bot", "content": bot_answer})
    session[user_key] = messages

     # レスポンスオブジェクトを作成
    response = make_response(render_template('Chatbot.html', messages=messages, type_effect="true"))
    # クッキーをレスポンスオブジェクトに追加
    response.set_cookie('num_use_chatbot', str(num_use_chatbot))

    return response

    #return render_template('Chatbot.html', messages=messages, type_effect="true", num_questionNum = num_use_chatbot)
    # return render_template('Chatbot.html', messages=messages)
    # return render_template('Chatbot.html', converted_text=bot_answer)

@app.route("/answer", methods=["GET"])
def answer():
    num = request.args.get('questionId', default=0, type=int)
    return render_template("Answer.html", num=num)

@app.route("/question", methods=["GET"])
def question():
    return render_template("Question.html")

@app.route('/update_user_points', methods=['POST'])
def update_user_points():
    user_name = request.form['user_name']
    point_change = int(request.form['point_change'])
    new_data = []
    with open('static/csv/userdata.csv', 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[0] == user_name:
                new_points = int(row[2]) - point_change
                # ポイントがマイナスにならないようにチェック
                if new_points >= 0:
                    row[2] = str(new_points)
                else:
                    return "Insufficient points"  # マイナスになる場合のメッセージを返す
            new_data.append(row)
    with open('static/csv/userdata.csv', 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(new_data)
    return "Updated successfully"

@app.route('/update_answer_points', methods=['POST'])
def update_answer_points():
    user_name = request.form['user_name']
    point_change = int(request.form['point_change'])
    new_data = []
    with open('static/csv/userdata.csv', 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[0] == user_name:
                new_points = int(row[2]) + point_change
                # ポイントがマイナスにならないようにチェック
                if new_points >= 0:
                    row[2] = str(new_points)
                else:
                    return "Insufficient points"  # マイナスになる場合のメッセージを返す
            new_data.append(row)
    with open('static/csv/userdata.csv', 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(new_data)
    return "Updated successfully"

@app.route('/update_good_point', methods=['POST'])
def update_good_point():
    user_name = request.form['user_name']
    point_change = int(request.form['point_change'])
    questionAnswerId = int(request.form['question_answer_id'])
    new_userdata = []
    # userdata.csvの書き込み
    with open('static/csv/userdata.csv', 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[0]==user_name:
                # どの回答にいいねをしたかを格納するリストを用意
                # import pdb; pdb.set_trace()
                if(point_change==1):
                    goodList=row[4].split('\\')
                    goodList.append(str(questionAnswerId))
                    row[4]="\\".join(goodList)
                else:
                    goodList=row[4].split('\\')
                    goodList.remove(str(questionAnswerId))
                    row[4]="\\".join(goodList)
            new_userdata.append(row)
    with open('static/csv/userdata.csv', 'w', newline='', encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerows(new_userdata)
    # BBS.csvの書き込み
    new_BBS_data=[]
    with open('static/csv/BBS.csv', 'r', encoding="utf-8") as fileBBS:
        readerBBS = csv.reader(fileBBS)
        for row in readerBBS:
            if row[0]==str(questionAnswerId):
                # どの回答にいいねをしたかを格納するリストを用意
                if(point_change==1):
                    row[5]=str(int(row[5])+1)
                    print(int(row[5]))
                    # import pdb; pdb.set_trace()
                else:
                    row[5]=str(int(row[5])-1)
            new_BBS_data.append(row)
    with open('static/csv/BBS.csv', 'w', newline='', encoding="utf-8") as fileBBS:
        writerBBS = csv.writer(fileBBS)
        writerBBS.writerows(new_BBS_data)
    return "Updated successfully"

@app.route('/update_solved_answer', methods=['POST'])
def update_solved_answer():
    user_name = request.form['user_name']
    point_change = int(request.form['point_change'])
    questionAnswerId = int(request.form['question_answer_id'])
    new_userdata = []
    # userdata.csvの書き込み
    with open('static/csv/userdata.csv', 'r') as file_userdata:
        print("userdata.csvの書き込み(solved answerの処理)")
        reader = csv.reader(file_userdata)
        for row in reader:
            if row[0]==user_name:
                # どの回答に解決を押したかを格納するリストを用意
                # import pdb; pdb.set_trace()
                if(point_change==1):
                    solvedAnswerList=row[5].split('\\')
                    solvedAnswerList.append(str(questionAnswerId))
                    row[5]="\\".join(solvedAnswerList)
                else:
                    solvedAnswerList=row[5].split('\\')
                    solvedAnswerList.remove(str(questionAnswerId))
                    row[5]="\\".join(solvedAnswerList)
            new_userdata.append(row)
    with open('static/csv/userdata.csv', 'w', newline='', encoding="utf-8") as file_BBS:
        writer = csv.writer(file_BBS)
        writer.writerows(new_userdata)
    # BBS.csvの書き込み
    new_BBS_data=[]
    with open('static/csv/BBS.csv', 'r', encoding="utf-8") as fileBBS:
        print("BBS.csvに書き込み")
        print(point_change)
        readerBBS = csv.reader(fileBBS)
        for row in readerBBS:
            if row[0]==str(questionAnswerId):
                if(point_change==1):
                    row[6]="True"
                else:
                    row[6]="False"
            new_BBS_data.append(row)
    with open('static/csv/BBS.csv', 'w', newline='', encoding="utf-8") as fileBBS:
        writerBBS = csv.writer(fileBBS)
        writerBBS.writerows(new_BBS_data)
    return "Updated successfully"

@app.route('/add_answer', methods=['POST'])
def add_answer():
    answerPosted = request.form['answer_posted']
    selectedQuestionId = request.form['selected_question_id']
    answerUserName=request.form['answer_user_name']
    df_BBS=pd.read_csv('static/csv/BBS.csv')
    # import pdb; pdb.set_trace()
    stringQuestion=df_BBS.loc[df_BBS['questionId'] == int(selectedQuestionId)].iloc[0].values[2]
    # new_row={"numQA":df_BBS.iloc[-1, 0]+1,"questionId":df_BBS["questionId"].max()+1,"question":answerPosted,"respondent":"","answer":"","numGood":0,"solved":"false","Updated":""} 
    new_row={"numQA":df_BBS.iloc[-1, 0]+1,"questionId":selectedQuestionId,"question":stringQuestion,"respondent":answerUserName,"answer":answerPosted,"numGood":0,"solved":"False","Updated":""} 
    print(selectedQuestionId)
    new_df = pd.concat([df_BBS, pd.DataFrame([new_row])], ignore_index=True)
    new_df.to_csv('static/csv/BBS.csv', index=False)
    
    response_data = {"message": "Answer added successfully"}
    return jsonify(response_data), 201  # HTTP 201 Createdを返す
    
@app.route('/post_question', methods=['POST'])
def post_question():
    postQuestion = request.form['post_question']
    df_BBS=pd.read_csv('static/csv/BBS.csv')
    new_row={"numQA":df_BBS.iloc[-1, 0]+1,"questionId":df_BBS["questionId"].max()+1,"question":postQuestion,"respondent":"","answer":"","numGood":0,"solved":"False","Updated":"2023/06/ 03:44:44"} 
    new_df = pd.concat([df_BBS, pd.DataFrame([new_row])], ignore_index=True)
    new_df.to_csv('static/csv/BBS.csv', index=False)
    
    response_data = {"message": "Answer added successfully"}
    return jsonify(response_data), 201  # HTTP 201 Createdを返す
    
if __name__ == "__main__":
    app.run(debug=True)





