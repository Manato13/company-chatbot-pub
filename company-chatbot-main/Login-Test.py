from flask import Flask, request, render_template, redirect, jsonify

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def start():
    return render_template("Login.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    return redirect("/home")

@app.route("/home", methods=["GET"])
def home():
    return render_template("Home.html")

@app.route("/point", methods=["GET"])
def point():
    return render_template("Point.html")

@app.route("/answer", methods=["GET"])
def answer():
    return render_template("Answer.html")
@app.route("/question", methods=["GET"])
def question():
    return render_template("Question.html")

@app.route("/chatbot", methods=["GET"])
def chatbot():
    return render_template("Chatbot.html")

if __name__ == "__main__":
    app.run(debug=True)